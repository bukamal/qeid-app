const { createClient } = require('@supabase/supabase-js');
const { setCorsHeaders, getUserId } = require('../lib/auth');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// دوال مساعدة لتحديث أرصدة العملاء والموردين فقط
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

// دالة حساب عامل التحويل (لا تغيير)
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

// دالة بناء بيانات البند (لا تغيير)
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

      // >>> ملاحظة: تم إلغاء تحديث المخزون المباشر هنا <<<

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

      return res.json(invoice);
    }

    // ==================== PUT ====================
    if (req.method === 'PUT') {
      const { id, type, customer_id, supplier_id, date, reference, notes, lines, paid_amount } = req.body;
      if (!id) return res.status(400).json({ error: 'معرف الفاتورة مطلوب' });

      const { data: oldInvoice, error: fetchError } = await supabase
        .from('invoices')
        .select(`id, type, customer_id, supplier_id, total, invoice_lines ( id, item_id, quantity, quantity_in_base, unit_id )`)
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      if (fetchError || !oldInvoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

      // >>> ملاحظة: تم إلغاء عكس تأثير المخزون القديم هنا <<<

      // عكس تأثير الفاتورة القديمة على أرصدة العملاء/الموردين
      if (oldInvoice.type === 'sale' && oldInvoice.customer_id) {
        await updateCustomerBalance(oldInvoice.customer_id, userId, -oldInvoice.total);
      } else if (oldInvoice.type === 'purchase' && oldInvoice.supplier_id) {
        await updateSupplierBalance(oldInvoice.supplier_id, userId, -oldInvoice.total);
      }

      // حذف البنود القديمة فقط (الدفعات تبقى)
      await supabase.from('invoice_lines').delete().eq('invoice_id', id);

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

      // >>> ملاحظة: تم إلغاء تطبيق المخزون الجديد هنا <<<

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

      // --- معالجة الدفعة الأولية (تعديل آمن) ---
      const newPaid = parseFloat(paid_amount) || 0;
      const { data: currentPayments } = await supabase
        .from('payments')
        .select('id, amount, customer_id, supplier_id')
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

      // >>> ملاحظة: تم إلغاء عكس المخزون هنا <<<

      // عكس أرصدة الدفعات
      const { data: payments } = await supabase
        .from('payments')
        .select('id, amount, customer_id, supplier_id')
        .eq('invoice_id', invoiceId);
      for (const p of (payments || [])) {
        if (p.customer_id) await updateCustomerBalance(p.customer_id, userId, p.amount);
        if (p.supplier_id) await updateSupplierBalance(p.supplier_id, userId, p.amount);
      }

      // عكس أصل الفاتورة
      if (invoice.type === 'sale' && invoice.customer_id) {
        await updateCustomerBalance(invoice.customer_id, userId, -invoice.total);
      } else if (invoice.type === 'purchase' && invoice.supplier_id) {
        await updateSupplierBalance(invoice.supplier_id, userId, -invoice.total);
      }

      // الحذف النهائي
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
