const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function verifyTelegramData(initData) {
  if (!initData) return false;
  const BOT_TOKEN = process.env.BOT_TOKEN;
  const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');
  const pairs = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const dataCheckString = pairs.map(([k, v]) => `${k}=${v}`).join('\n');
  return crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex') === hash;
}

async function getUserId(initData) {
  if (!initData || !verifyTelegramData(initData)) throw new Error('Unauthorized');
  return JSON.parse(new URLSearchParams(initData).get('user')).id;
}

// --- دوال مساعدة آمنة لتحديث الأرصدة والمخزون ---
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

async function updateItemQuantity(itemId, userId, change) {
  const { data: cur } = await supabase.from('items').select('quantity').eq('id', itemId).eq('user_id', userId).single();
  if (cur) {
    const newQty = parseFloat(cur.quantity || 0) + change;
    await supabase.from('items').update({ quantity: newQty }).eq('id', itemId).eq('user_id', userId);
  }
}

// --- حساب عامل التحويل بدقة من قاعدة البيانات ---
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

// --- بناء بيانات البند مع quantity_in_base الصحيحة ---
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
    quantity_in_base: qtyBase
  };
  if (invoiceId) obj.invoice_id = invoiceId;
  return obj;
}

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

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
      await supabase.from('invoice_lines').insert(lineData);

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

      // تحديث المخزون
      for (const line of lineData) {
        if (line.item_id && line.quantity_in_base) {
          const delta = type === 'purchase' ? line.quantity_in_base : -line.quantity_in_base;
          await updateItemQuantity(line.item_id, userId, delta);
        }
      }

      // تحديث الأرصدة
      if (type === 'sale' && cust) {
        await updateCustomerBalance(cust, userId, total - paid);
      } else if (type === 'purchase' && supp) {
        await updateSupplierBalance(supp, userId, total - paid);
      }

      return res.json(invoice);
    }

    // ==================== PUT ====================
    if (req.method === 'PUT') {
      const { id, type, customer_id, supplier_id, date, reference, notes, lines } = req.body;
      if (!id) return res.status(400).json({ error: 'معرف الفاتورة مطلوب' });

      const { data: oldInvoice, error: fetchError } = await supabase
        .from('invoices')
        .select(`id, type, customer_id, supplier_id, total, invoice_lines ( id, item_id, quantity, quantity_in_base, unit_id )`)
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      if (fetchError || !oldInvoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

      const { data: oldPayments } = await supabase
        .from('payments')
        .select('id, amount, customer_id, supplier_id')
        .eq('invoice_id', id);

      // عكس تأثير القديم بالكامل
      for (const p of (oldPayments || [])) {
        if (p.customer_id) await updateCustomerBalance(p.customer_id, userId, p.amount);
        if (p.supplier_id) await updateSupplierBalance(p.supplier_id, userId, p.amount);
      }

      if (oldInvoice.type === 'sale' && oldInvoice.customer_id) {
        await updateCustomerBalance(oldInvoice.customer_id, userId, -oldInvoice.total);
      } else if (oldInvoice.type === 'purchase' && oldInvoice.supplier_id) {
        await updateSupplierBalance(oldInvoice.supplier_id, userId, -oldInvoice.total);
      }

      for (const line of (oldInvoice.invoice_lines || [])) {
        const qty = parseFloat(line.quantity_in_base || line.quantity || 0);
        if (line.item_id && qty !== 0) {
          const delta = oldInvoice.type === 'sale' ? qty : -qty;
          await updateItemQuantity(line.item_id, userId, delta);
        }
      }

      // حذف القديم
      await supabase.from('payments').delete().eq('invoice_id', id);
      await supabase.from('invoice_lines').delete().eq('invoice_id', id);

      // بناء الجديد
      const newType = type || oldInvoice.type;
      const newCust = parseInt(customer_id) && customer_id !== 'cash' ? parseInt(customer_id) : null;
      const newSupp = parseInt(supplier_id) && supplier_id !== 'cash' ? parseInt(supplier_id) : null;

      const newLineData = [];
      let newTotal = 0;
      for (let line of (lines || [])) {
        const l = await buildLineData(line, id);
        newLineData.push(l);
        newTotal += l.total;
      }
      if (newLineData.length > 0) {
        await supabase.from('invoice_lines').insert(newLineData);
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

      // تطبيق تأثير الجديد
      if (newType === 'sale' && newCust) {
        await updateCustomerBalance(newCust, userId, newTotal);
      } else if (newType === 'purchase' && newSupp) {
        await updateSupplierBalance(newSupp, userId, newTotal);
      }

      for (const line of newLineData) {
        if (line.item_id && line.quantity_in_base) {
          const delta = newType === 'sale' ? -line.quantity_in_base : line.quantity_in_base;
          await updateItemQuantity(line.item_id, userId, delta);
        }
      }

      return res.json(updatedInvoice);
    }

    // ==================== DELETE ====================
    if (req.method === 'DELETE') {
      const invoiceId = req.query.id;
      if (!invoiceId) return res.status(400).json({ error: 'معرف الفاتورة مطلوب' });

      const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select(`id, type, customer_id, supplier_id, total, invoice_lines ( id, item_id, quantity, quantity_in_base, unit_id )`)
        .eq('id', invoiceId)
        .eq('user_id', userId)
        .single();
      if (fetchError || !invoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

      const { data: payments } = await supabase
        .from('payments')
        .select('id, amount, customer_id, supplier_id')
        .eq('invoice_id', invoiceId);

      // عكس تأثير الدفعات
      for (const p of (payments || [])) {
        if (p.customer_id) await updateCustomerBalance(p.customer_id, userId, p.amount);
        if (p.supplier_id) await updateSupplierBalance(p.supplier_id, userId, p.amount);
      }

      // عكس تأثير الفاتورة نفسها
      if (invoice.type === 'sale' && invoice.customer_id) {
        await updateCustomerBalance(invoice.customer_id, userId, -invoice.total);
      } else if (invoice.type === 'purchase' && invoice.supplier_id) {
        await updateSupplierBalance(invoice.supplier_id, userId, -invoice.total);
      }

      // إعادة الكميات إلى المخزون
      for (const line of (invoice.invoice_lines || [])) {
        const qty = parseFloat(line.quantity_in_base || line.quantity || 0);
        if (line.item_id && qty !== 0) {
          const delta = invoice.type === 'sale' ? qty : -qty; // بيع: نعيد، شراء: نخصم
          await updateItemQuantity(line.item_id, userId, delta);
        }
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
