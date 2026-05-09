const { supabase } = require('../lib/supabase');
const { setCorsHeaders, getUserId, rateLimitMiddleware } = require('../lib/auth');
const { escapeHtml } = require('../lib/sanitize');

const rpc = {
  applyPurchase: (itemId, userId, qty, cost) =>
    supabase.rpc('apply_purchase_to_item', {
      p_item_id: itemId,
      p_user_id: userId,
      p_qty_purchased: qty,
      p_unit_cost: cost,
    }),
  reversePurchase: (itemId, userId, qty, cost) =>
    supabase.rpc('reverse_purchase_from_item', {
      p_item_id: itemId,
      p_user_id: userId,
      p_qty_purchased: qty,
      p_unit_cost: cost,
    }),
  applySale: (itemId, userId, qty) =>
    supabase.rpc('apply_sale_to_item', {
      p_item_id: itemId,
      p_user_id: userId,
      p_qty_sold: qty,
    }),
  reverseSale: (itemId, userId, qty) =>
    supabase.rpc('reverse_sale_from_item', {
      p_item_id: itemId,
      p_user_id: userId,
      p_qty_sold: qty,
    }),
  updateCustomerBalance: (custId, userId, change) =>
    supabase.rpc('update_customer_balance', {
      p_customer_id: custId,
      p_user_id: userId,
      p_change: change,
    }),
  updateSupplierBalance: (suppId, userId, change) =>
    supabase.rpc('update_supplier_balance', {
      p_supplier_id: suppId,
      p_user_id: userId,
      p_change: change,
    }),
  updateInvoiceFull: (params) => supabase.rpc('update_invoice_full', params),
};

function safeParseEntityId(value) {
  if (value === null || value === undefined || value === '' || value === 'cash') return null;
  const num = parseInt(value, 10);
  return Number.isNaN(num) ? null : num;
}

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
  return {
    item_id: line.item_id || null,
    description: line.description ? escapeHtml(line.description) : null,
    quantity: qty,
    unit_price: parseFloat(line.unit_price) || 0,
    total: parseFloat(line.total) || 0,
    unit_id: line.unit_id || null,
    quantity_in_base: qtyBase,
    unit_cost: line.unit_cost || null,
    cost_amount: line.cost_amount || null,
    invoice_id: invoiceId || undefined,
  };
}

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const allowed = await rateLimitMiddleware(req, res, 'invoices');
  if (!allowed) return;

  try {
    let initData = req.method === 'GET' || req.method === 'DELETE' ? req.query.initData : req.body?.initData;
    const userId = await getUserId(initData);

    if (req.method === 'GET') {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id,user_id,type,customer_id,supplier_id,date,reference,notes,total,status,created_at,customer:customers(name),supplier:suppliers(name),invoice_lines(*,item:items(name),unit:units(name))')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      if (error) throw error;

      const { data: allPayments, error: payError } = await supabase
        .from('payments')
        .select('invoice_id, amount')
        .eq('user_id', userId);
      if (payError) throw payError;

      const paymentMap = {};
      for (const p of allPayments) {
        paymentMap[p.invoice_id] = (paymentMap[p.invoice_id] || 0) + parseFloat(p.amount);
      }

      for (let inv of invoices) {
        inv.paid = paymentMap[inv.id] || 0;
        inv.balance = inv.total - inv.paid;
        if (inv.notes) inv.notes = escapeHtml(inv.notes);
        if (inv.customer?.name) inv.customer.name = escapeHtml(inv.customer.name);
        if (inv.supplier?.name) inv.supplier.name = escapeHtml(inv.supplier.name);
      }
      return res.json(invoices);
    }

    if (req.method === 'POST') {
      let { type, customer_id, supplier_id, date, reference, notes, lines, paid_amount } = req.body;
      if (!type || !['sale', 'purchase'].includes(type))
        return res.status(400).json({ error: 'نوع الفاتورة غير صحيح' });
      if (!lines || !Array.isArray(lines) || lines.length === 0)
        return res.status(400).json({ error: 'يجب إضافة بند واحد على الأقل' });

      const cust = safeParseEntityId(customer_id);
      const supp = safeParseEntityId(supplier_id);
      const escapedNotes = notes ? escapeHtml(notes) : null;
      const escapedRef = reference ? escapeHtml(reference) : null;

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
          reference: escapedRef,
          notes: escapedNotes,
          total,
          status: 'posted',
        })
        .select()
        .single();
      if (invError) throw invError;

      lineData.forEach(l => (l.invoice_id = invoice.id));
      const { data: insertedLines, error: linesError } = await supabase
        .from('invoice_lines')
        .insert(lineData)
        .select();
      if (linesError) throw linesError;

      for (const line of insertedLines) {
        if (line.item_id) {
          const baseQty = line.quantity_in_base || line.quantity;
          if (type === 'purchase') {
            const unitCostPerBase = baseQty !== 0 ? line.total / baseQty : 0;
            await rpc.applyPurchase(line.item_id, userId, baseQty, unitCostPerBase);
            await supabase.from('invoice_lines').update({ unit_cost: unitCostPerBase }).eq('id', line.id);
          } else {
            const { data: costAmount } = await rpc.applySale(line.item_id, userId, baseQty);
            await supabase.from('invoice_lines').update({ cost_amount: costAmount }).eq('id', line.id);
          }
        }
      }

      const paid = parseFloat(paid_amount) || 0;
      if (paid > 0) {
        await supabase.from('payments').insert({
          user_id: userId,
          invoice_id: invoice.id,
          customer_id: cust,
          supplier_id: supp,
          amount: paid,
          payment_date: invoice.date,
          notes: 'دفعة تلقائية من الفاتورة',
        });
      }

      if (type === 'sale' && cust) {
        await rpc.updateCustomerBalance(cust, userId, total - paid);
      } else if (type === 'purchase' && supp) {
        await rpc.updateSupplierBalance(supp, userId, total - paid);
      }

      return res.json({ ...invoice, invoice_lines: insertedLines, paid, balance: total - paid });
    }

    if (req.method === 'PUT') {
      const { id, type, customer_id, supplier_id, date, reference, notes, lines, paid_amount } = req.body;
      if (!id) return res.status(400).json({ error: 'معرف الفاتورة مطلوب' });

      const newCust = safeParseEntityId(customer_id);
      const newSupp = safeParseEntityId(supplier_id);

      const { data: oldInvoice } = await supabase
        .from('invoices')
        .select('type')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      if (!oldInvoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });
      const newType = type || oldInvoice.type;

      const linesJson = [];
      for (let line of lines || []) {
        const l = await buildLineData(line, id);
        linesJson.push(l);
      }

      const { error } = await rpc.updateInvoiceFull({
        p_invoice_id: id,
        p_user_id: userId,
        p_new_type: newType,
        p_customer_id: newCust,
        p_supplier_id: newSupp,
        p_date: date || oldInvoice.date,
        p_reference: reference ? escapeHtml(reference) : null,
        p_notes: notes ? escapeHtml(notes) : null,
        p_new_lines: linesJson,
        p_paid_amount: parseFloat(paid_amount) || 0,
      });
      if (error) throw error;

      const { data: updatedInvoice } = await supabase
        .from('invoices')
        .select('id,user_id,type,customer_id,supplier_id,date,reference,notes,total,status,created_at,customer:customers(name),supplier:suppliers(name),invoice_lines(*,item:items(name),unit:units(name))')
        .eq('id', id)
        .single();

      const { data: finalPayments } = await supabase.from('payments').select('amount').eq('invoice_id', id);
      const totalPaid = finalPayments?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;
      updatedInvoice.paid = totalPaid;
      updatedInvoice.balance = updatedInvoice.total - totalPaid;
      return res.json(updatedInvoice);
    }

    if (req.method === 'DELETE') {
      const invoiceId = req.query.id;
      if (!invoiceId) return res.status(400).json({ error: 'معرف الفاتورة مطلوب' });

      const { data: invoice } = await supabase
        .from('invoices')
        .select('id, type, customer_id, supplier_id, total, invoice_lines (*)')
        .eq('id', invoiceId)
        .eq('user_id', userId)
        .single();
      if (!invoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

      for (const line of invoice.invoice_lines) {
        if (line.item_id) {
          const baseQty = line.quantity_in_base || line.quantity;
          if (invoice.type === 'purchase') {
            const unitCost = line.unit_cost || line.unit_price / (line.conversion_factor || 1);
            await rpc.reversePurchase(line.item_id, userId, baseQty, unitCost);
          } else {
            await rpc.reverseSale(line.item_id, userId, baseQty);
          }
        }
      }

      const { data: payments } = await supabase
        .from('payments')
        .select('id, amount, customer_id, supplier_id')
        .eq('invoice_id', invoiceId);
      for (const p of payments) {
        if (p.customer_id) await rpc.updateCustomerBalance(p.customer_id, userId, p.amount);
        if (p.supplier_id) await rpc.updateSupplierBalance(p.supplier_id, userId, p.amount);
      }

      if (invoice.type === 'sale' && invoice.customer_id) {
        await rpc.updateCustomerBalance(invoice.customer_id, userId, -invoice.total);
      } else if (invoice.type === 'purchase' && invoice.supplier_id) {
        await rpc.updateSupplierBalance(invoice.supplier_id, userId, -invoice.total);
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
