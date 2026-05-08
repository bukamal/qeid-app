const { createClient } = require('@supabase/supabase-js');
const { setCorsHeaders, getUserId, rateLimitMiddleware } = require('../lib/auth');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ========== دوال إدارة المخزون (المتوسط المرجح) ==========

async function applyPurchaseToItem(itemId, userId, qtyPurchased, unitCost, supabase) {
  const { data: item, error } = await supabase
    .from('items')
    .select('quantity, average_cost')
    .eq('id', itemId)
    .eq('user_id', userId)
    .single();
  if (error) throw error;

  const oldQty = parseFloat(item.quantity) || 0;
  const oldAvgCost = parseFloat(item.average_cost) || 0;

  const totalOldCost = oldQty * oldAvgCost;
  const totalNewCost = qtyPurchased * unitCost;
  const newQty = oldQty + qtyPurchased;
  const newAvgCost = newQty !== 0 ? (totalOldCost + totalNewCost) / newQty : 0;

  const { error: updateError } = await supabase
    .from('items')
    .update({ quantity: newQty, average_cost: newAvgCost })
    .eq('id', itemId)
    .eq('user_id', userId);
  if (updateError) throw updateError;
}

async function reversePurchaseFromItem(itemId, userId, qtyPurchased, unitCost, supabase) {
  const { data: item, error } = await supabase
    .from('items')
    .select('quantity, average_cost')
    .eq('id', itemId)
    .eq('user_id', userId)
    .single();
  if (error) throw error;

  const oldQty = parseFloat(item.quantity) || 0;
  const oldAvgCost = parseFloat(item.average_cost) || 0;

  if (qtyPurchased > oldQty) {
    throw new Error(`لا يمكن عكس شراء ${qtyPurchased} وحدة من المادة ${itemId} لأن المخزون الحالي هو ${oldQty}`);
  }

  const totalOldCost = oldQty * oldAvgCost;
  const totalRevCost = qtyPurchased * unitCost;
  const newQty = oldQty - qtyPurchased;
  const newTotalCost = totalOldCost - totalRevCost;
  const newAvgCost = newQty !== 0 ? Math.max(0, newTotalCost / newQty) : 0;

  const { error: updateError } = await supabase
    .from('items')
    .update({ quantity: newQty, average_cost: newAvgCost })
    .eq('id', itemId)
    .eq('user_id', userId);
  if (updateError) throw updateError;
}

async function applySaleToItem(itemId, userId, qtySold, supabase) {
  const { data: item, error } = await supabase
    .from('items')
    .select('quantity, average_cost')
    .eq('id', itemId)
    .eq('user_id', userId)
    .single();
  if (error) throw error;

  const oldQty = parseFloat(item.quantity) || 0;
  const avgCost = parseFloat(item.average_cost) || 0;

  if (qtySold > oldQty) {
    throw new Error(`المخزون غير كافٍ للمادة ${itemId}. المتاح: ${oldQty}, المطلوب: ${qtySold}`);
  }

  const costAmount = qtySold * avgCost;
  const newQty = oldQty - qtySold;

  const { error: updateError } = await supabase
    .from('items')
    .update({ quantity: newQty })
    .eq('id', itemId)
    .eq('user_id', userId);
  if (updateError) throw updateError;

  return costAmount;
}

async function reverseSaleFromItem(itemId, userId, qtySold, supabase) {
  const { data: item, error } = await supabase
    .from('items')
    .select('quantity')
    .eq('id', itemId)
    .eq('user_id', userId)
    .single();
  if (error) throw error;

  const oldQty = parseFloat(item.quantity) || 0;
  const { error: updateError } = await supabase
    .from('items')
    .update({ quantity: oldQty + qtySold })
    .eq('id', itemId)
    .eq('user_id', userId);
  if (updateError) throw updateError;
}

// ========== دوال الأرصدة ==========
async function updateCustomerBalance(customerId, userId, change) {
  const { data: cur } = await supabase.from('customers').select('balance').eq('id', customerId).eq('user_id', userId).single();
  if (cur) {
    const newBalance = parseFloat(cur.balance || 0) + change;
    await supabase.from('customers').update({ balance: newBalance }).eq('id', customerId).eq('user_id', userId);
  }
}

async function updateSupplierBalance(supplierId, userId, change) {
  const { data: cur } = await supabase.from('suppliers').select('balance').eq('id', supplierId).eq('user_id', userId).single();
  if (cur) {
    const newBalance = parseFloat(cur.balance || 0) + change;
    await supabase.from('suppliers').update({ balance: newBalance }).eq('id', supplierId).eq('user_id', userId);
  }
}

// ========== دوال مساعدة ==========
async function resolveConversionFactor(itemId, unitId, fallbackFactor) {
  if (!unitId || !itemId) return parseFloat(fallbackFactor) || 1;
  try {
    const { data: iu } = await supabase
      .from('item_units')
      .select('conversion_factor')
      .eq('item_id', itemId)
      .eq('unit_id', unitId)
      .maybeSingle();
    if (iu) return parseFloat(iu.conversion_factor);
  } catch (e) { /* fallback */ }
  return parseFloat(fallbackFactor) || 1;
}

async function buildLineData(line, invoiceId = null) {
  const qty = parseFloat(line.quantity) || 0;
  let factor = 1;
  if (line.item_id && line.unit_id) {
    factor = await resolveConversionFactor(line.item_id, line.unit_id, line.conversion_factor);
  } else {
    factor = parseFloat(line.conversion_factor) || 1;
  }
  const qtyBase = qty * factor;
  const obj = {
    item_id: line.item_id || null,
    description: line.description || null,
    quantity: qty,
    unit_price: parseFloat(line.unit_price) || 0,
    total: parseFloat(line.total) || 0,
    unit_id: line.unit_id || null,
    quantity_in_base: qtyBase,
    unit_cost: line.unit_cost || null,
    cost_amount: line.cost_amount || null
  };
  if (invoiceId) obj.invoice_id = invoiceId;
  return obj;
}

async function checkStockAvailability(lines, userId, supabase) {
  const itemIds = [...new Set(lines.filter(l => l.item_id).map(l => l.item_id))];
  if (itemIds.length === 0) return;

  const { data: items, error } = await supabase
    .from('items')
    .select('id, quantity')
    .in('id', itemIds)
    .eq('user_id', userId);
  if (error) throw error;

  const stockMap = {};
  items.forEach(it => { stockMap[it.id] = parseFloat(it.quantity) || 0; });

  for (const line of lines) {
    if (!line.item_id) continue;
    const factor = parseFloat(line.conversion_factor) || 1;
    const qtyInBase = (parseFloat(line.quantity) || 0) * factor;
    const available = stockMap[line.item_id] || 0;
    if (qtyInBase > available) {
      const item = items.find(i => i.id == line.item_id);
      const itemName = item ? ` (${item.id})` : '';
      throw new Error(`المخزون غير كافٍ للمادة ${line.item_id}${itemName}. المتاح: ${available}, المطلوب: ${qtyInBase}`);
    }
  }
}

// ========== المدخل الرئيسي ==========
module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ✅ Rate Limiting Check
  const allowed = await rateLimitMiddleware(req, res, 'invoices');
  if (!allowed) return;

  try {
    let initData = req.method === 'GET' || req.method === 'DELETE' ? req.query.initData : req.body?.initData;
    const userId = await getUserId(initData);

    // ==================== GET ====================
    if (req.method === 'GET') {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id,user_id,type,customer_id,supplier_id,date,reference,notes,total,status,created_at,customer:customers(name),supplier:suppliers(name),invoice_lines(*,item:items(name),unit:units(name))')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      if (error) throw error;

      for (let inv of invoices) {
        const { data: payments } = await supabase.from('payments').select('amount').eq('invoice_id', inv.id);
        inv.paid = payments?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;
        inv.balance = inv.total - inv.paid;
      }
      return res.json(invoices);
    }

    // ==================== POST ====================
    if (req.method === 'POST') {
      let { type, customer_id, supplier_id, date, reference, notes, lines, paid_amount } = req.body;
      if (!type || !['sale', 'purchase'].includes(type)) return res.status(400).json({ error: 'نوع الفاتورة غير صحيح' });
      if (!lines || !Array.isArray(lines) || lines.length === 0) return res.status(400).json({ error: 'يجب إضافة بند واحد على الأقل' });

      if (type === 'sale') {
        await checkStockAvailability(lines, userId, supabase);
      }

      const cust = parseInt(customer_id) && customer_id !== 'cash' ? parseInt(customer_id) : null;
      const supp = parseInt(supplier_id) && supplier_id !== 'cash' ? parseInt(supplier_id) : null;

      const lineData = [];
      let total = 0;
      for (let line of lines) {
        const l = await buildLineData(line);
        lineData.push(l);
        total += l.total;
      }

      const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .insert({
          user_id: userId,
          type,
          customer_id: cust,
          supplier_id: supp,
          date: date || new Date().toISOString().split('T')[0],
          reference,
          notes,
          total,
          status: 'posted'
        })
        .select()
        .single();
      if (invError) throw invError;

      lineData.forEach(l => l.invoice_id = invoice.id);
      const { data: insertedLines, error: linesError } = await supabase
        .from('invoice_lines')
        .insert(lineData)
        .select();
      if (linesError) throw linesError;

      const processedLines = [];
      for (const line of insertedLines) {
        if (line.item_id) {
          const baseQty = line.quantity_in_base || (line.quantity * (await resolveConversionFactor(line.item_id, line.unit_id, line.conversion_factor)));
          if (type === 'purchase') {
            const unitCost = line.unit_price / (line.conversion_factor || (await resolveConversionFactor(line.item_id, line.unit_id, 1)));
            await applyPurchaseToItem(line.item_id, userId, baseQty, unitCost, supabase);
            await supabase.from('invoice_lines').update({ unit_cost: unitCost }).eq('id', line.id);
            processedLines.push({ ...line, unit_cost: unitCost });
          } else if (type === 'sale') {
            const costAmount = await applySaleToItem(line.item_id, userId, baseQty, supabase);
            await supabase.from('invoice_lines').update({ cost_amount: costAmount }).eq('id', line.id);
            processedLines.push({ ...line, cost_amount: costAmount });
          }
        } else {
          processedLines.push(line);
        }
      }

      const paid = parseFloat(paid_amount) || 0;
      if (paid > 0) {
        await supabase.from('payments').insert({
          user_id: userId,
          invoice_id: invoice.id,
          customer_id: cust || null,
          supplier_id: supp || null,
          amount: paid,
          payment_date: invoice.date,
          notes: 'دفعة تلقائية من الفاتورة'
        });
      }

      if (type === 'sale' && cust) {
        await updateCustomerBalance(cust, userId, total - paid);
      } else if (type === 'purchase' && supp) {
        await updateSupplierBalance(supp, userId, total - paid);
      }

      const finalInvoice = {
        ...invoice,
        invoice_lines: processedLines,
        paid,
        balance: total - paid
      };
      return res.json(finalInvoice);
    }

    // ==================== PUT ====================
    if (req.method === 'PUT') {
      const { id, type, customer_id, supplier_id, date, reference, notes, lines, paid_amount } = req.body;
      if (!id) return res.status(400).json({ error: 'معرف الفاتورة مطلوب' });

      const { data: oldInvoice, error: fetchError } = await supabase
        .from('invoices')
        .select(`id, type, customer_id, supplier_id, total, invoice_lines (*)`)
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      if (fetchError || !oldInvoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

      const newType = type || oldInvoice.type;

      if (newType === 'sale') {
        await checkStockAvailability(lines || [], userId, supabase);
      }

      for (const oldLine of oldInvoice.invoice_lines) {
        if (oldLine.item_id) {
          const baseQty = oldLine.quantity_in_base || (oldLine.quantity * (await resolveConversionFactor(oldLine.item_id, oldLine.unit_id, oldLine.conversion_factor)));
          if (oldInvoice.type === 'purchase') {
            const unitCost = oldLine.unit_cost || (oldLine.unit_price / (oldLine.conversion_factor || 1));
            await reversePurchaseFromItem(oldLine.item_id, userId, baseQty, unitCost, supabase);
          } else if (oldInvoice.type === 'sale') {
            await reverseSaleFromItem(oldLine.item_id, userId, baseQty, supabase);
          }
        }
      }

      if (oldInvoice.type === 'sale' && oldInvoice.customer_id) {
        await updateCustomerBalance(oldInvoice.customer_id, userId, -oldInvoice.total);
      } else if (oldInvoice.type === 'purchase' && oldInvoice.supplier_id) {
        await updateSupplierBalance(oldInvoice.supplier_id, userId, -oldInvoice.total);
      }

      await supabase.from('invoice_lines').delete().eq('invoice_id', id);

      const newCust = parseInt(customer_id) && customer_id !== 'cash' ? parseInt(customer_id) : null;
      const newSupp = parseInt(supplier_id) && supplier_id !== 'cash' ? parseInt(supplier_id) : null;

      const newLineData = [];
      let newTotal = 0;
      for (let line of (lines || [])) {
        const l = await buildLineData(line, id);
        newLineData.push(l);
        newTotal += l.total;
      }

      const { data: insertedNewLines, error: insertError } = await supabase
        .from('invoice_lines')
        .insert(newLineData)
        .select();
      if (insertError) throw insertError;

      for (const newLine of insertedNewLines) {
        if (newLine.item_id) {
          const baseQty = newLine.quantity_in_base || (newLine.quantity * (await resolveConversionFactor(newLine.item_id, newLine.unit_id, newLine.conversion_factor)));
          if (newType === 'purchase') {
            const unitCost = newLine.unit_price / (newLine.conversion_factor || 1);
            await applyPurchaseToItem(newLine.item_id, userId, baseQty, unitCost, supabase);
            await supabase.from('invoice_lines').update({ unit_cost: unitCost }).eq('id', newLine.id);
            newLine.unit_cost = unitCost;
          } else if (newType === 'sale') {
            const costAmount = await applySaleToItem(newLine.item_id, userId, baseQty, supabase);
            await supabase.from('invoice_lines').update({ cost_amount: costAmount }).eq('id', newLine.id);
            newLine.cost_amount = costAmount;
          }
        }
      }

      const { data: updatedInvoice, error: updateError } = await supabase
        .from('invoices')
        .update({
          type: newType,
          customer_id: newCust,
          supplier_id: newSupp,
          date: date || oldInvoice.date,
          reference,
          notes,
          total: newTotal
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select('id,user_id,type,customer_id,supplier_id,date,reference,notes,total,status,created_at,customer:customers(name),supplier:suppliers(name),invoice_lines(*,item:items(name),unit:units(name))')
        .single();
      if (updateError) throw updateError;

      const newPaid = parseFloat(paid_amount) || 0;
      const { data: currentPayments } = await supabase
        .from('payments')
        .select('id, amount')
        .eq('invoice_id', id);

      const autoPayment = currentPayments?.find(p => p.notes === 'دفعة تلقائية من الفاتورة');

      if (autoPayment) {
        if (newPaid > 0) {
          await supabase.from('payments').update({ amount: newPaid }).eq('id', autoPayment.id);
        } else {
          await supabase.from('payments').delete().eq('id', autoPayment.id);
        }
      } else if (newPaid > 0) {
        await supabase.from('payments').insert({
          user_id: userId,
          invoice_id: id,
          customer_id: newCust || null,
          supplier_id: newSupp || null,
          amount: newPaid,
          payment_date: date || oldInvoice.date,
          notes: 'دفعة تلقائية من الفاتورة'
        });
      }

      const { data: finalPayments } = await supabase.from('payments').select('amount').eq('invoice_id', id);
      const totalPaid = finalPayments?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;

      if (newType === 'sale' && newCust) {
        await updateCustomerBalance(newCust, userId, newTotal - totalPaid);
      } else if (newType === 'purchase' && newSupp) {
        await updateSupplierBalance(newSupp, userId, newTotal - totalPaid);
      }

      updatedInvoice.paid = totalPaid;
      updatedInvoice.balance = newTotal - totalPaid;
      updatedInvoice.invoice_lines = insertedNewLines;

      return res.json(updatedInvoice);
    }

    // ==================== DELETE ====================
    if (req.method === 'DELETE') {
      const invoiceId = req.query.id;
      if (!invoiceId) return res.status(400).json({ error: 'معرف الفاتورة مطلوب' });

      const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select(`id, type, customer_id, supplier_id, total, invoice_lines (*)`)
        .eq('id', invoiceId)
        .eq('user_id', userId)
        .single();
      if (fetchError || !invoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

      for (const line of invoice.invoice_lines) {
        if (line.item_id) {
          const baseQty = line.quantity_in_base || (line.quantity * (await resolveConversionFactor(line.item_id, line.unit_id, line.conversion_factor)));
          if (invoice.type === 'purchase') {
            const unitCost = line.unit_cost || (line.unit_price / (line.conversion_factor || 1));
            await reversePurchaseFromItem(line.item_id, userId, baseQty, unitCost, supabase);
          } else if (invoice.type === 'sale') {
            await reverseSaleFromItem(line.item_id, userId, baseQty, supabase);
          }
        }
      }

      const { data: payments } = await supabase
        .from('payments')
        .select('id, amount, customer_id, supplier_id')
        .eq('invoice_id', invoiceId);
      for (const p of (payments || [])) {
        if (p.customer_id) await updateCustomerBalance(p.customer_id, userId, p.amount);
        if (p.supplier_id) await updateSupplierBalance(p.supplier_id, userId, p.amount);
      }

      if (invoice.type === 'sale' && invoice.customer_id) {
        await updateCustomerBalance(invoice.customer_id, userId, -invoice.total);
      } else if (invoice.type === 'purchase' && invoice.supplier_id) {
        await updateSupplierBalance(invoice.supplier_id, userId, -invoice.total);
      }

      await supabase.from('payments').delete().eq('invoice_id', invoiceId);
      await supabase.from('invoice_lines').delete().eq('invoice_id', invoiceId);
      await supabase.from('invoices').delete().eq('id', invoiceId).eq('user_id', userId);

      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
