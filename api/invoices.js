const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let initData = req.method === 'GET' || req.method === 'DELETE' ? req.query.initData : req.body?.initData;
    const userId = await getUserId(initData);

    if (req.method === 'GET') {
      // GET - لم يتغير (يبقى كما هو)
      const { data, error } = await supabase
        .from('invoices')
        .select('id,user_id,type,customer_id,supplier_id,date,reference,notes,total,status,created_at,customer:customers(name),supplier:suppliers(name),invoice_lines(*,item:items(name),unit:units(name))')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      if (error) throw error;
      for (let inv of data) {
        const { data: payments } = await supabase.from('payments').select('amount').eq('invoice_id', inv.id);
        inv.paid = payments?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;
        inv.balance = inv.total - inv.paid;
      }
      return res.json(data);
    }

    if (req.method === 'POST') {
      // POST - يبقى كما هو (يعمل بشكل صحيح)
      let { type, customer_id, supplier_id, date, reference, notes, lines, paid_amount } = req.body;
      if (!type || !['sale', 'purchase'].includes(type)) return res.status(400).json({ error: 'نوع الفاتورة غير صحيح' });
      if (!lines || !Array.isArray(lines) || lines.length === 0) return res.status(400).json({ error: 'يجب إضافة بند واحد على الأقل' });

      const cust = (customer_id && customer_id !== 'cash') ? parseInt(customer_id) : null;
      const supp = (supplier_id && supplier_id !== 'cash') ? parseInt(supplier_id) : null;
      let total = 0;
      const invoiceLines = [];
      for (let line of lines) {
        let itemTotal = parseFloat(line.total) || 0;
        total += itemTotal;
        const qty = parseFloat(line.quantity) || 0;
        let qtyInBase = qty;
        if (line.unit_id) {
          const { data: conv } = await supabase.from('item_units').select('conversion_factor').eq('item_id', line.item_id).eq('unit_id', line.unit_id).maybeSingle();
          if (conv) qtyInBase = qty * parseFloat(conv.conversion_factor);
        }
        invoiceLines.push({
          invoice_id: null,
          item_id: line.item_id || null,
          description: line.description,
          quantity: qty,
          unit_price: parseFloat(line.unit_price) || 0,
          total: itemTotal,
          unit_id: line.unit_id || null,
          quantity_in_base: qtyInBase
        });
      }
      const { data: newInvoice, error: insertErr } = await supabase
        .from('invoices')
        .insert({ user_id: userId, type, customer_id: cust, supplier_id: supp, date: date || new Date().toISOString().split('T')[0], reference, notes, total, status: 'posted' })
        .select()
        .single();
      if (insertErr) throw insertErr;

      invoiceLines.forEach(l => l.invoice_id = newInvoice.id);
      await supabase.from('invoice_lines').insert(invoiceLines);

      let paid = parseFloat(paid_amount) || 0;
      if (paid > 0) {
        await supabase.from('payments').insert({
          user_id: userId, invoice_id: newInvoice.id, customer_id: cust, supplier_id: supp,
          amount: paid, payment_date: newInvoice.date, notes: 'دفعة تلقائية من الفاتورة'
        });
      }

      // تحديث رصيد العميل/المورد
      if (type === 'sale' && cust) {
        const { data: c } = await supabase.from('customers').select('balance').eq('id', cust).single();
        if (c) await supabase.from('customers').update({ balance: c.balance + total - paid }).eq('id', cust);
      } else if (type === 'purchase' && supp) {
        const { data: s } = await supabase.from('suppliers').select('balance').eq('id', supp).single();
        if (s) await supabase.from('suppliers').update({ balance: s.balance + total - paid }).eq('id', supp);
      }
      return res.json(newInvoice);
    }

    if (req.method === 'PUT') {
      // PUT المحسن - يعكس تأثير الفاتورة القديمة ويطبق الجديدة
      const { id, type, customer_id, supplier_id, date, reference, notes, lines } = req.body;
      if (!id) return res.status(400).json({ error: 'معرف الفاتورة مطلوب' });

      // 1. جلب الفاتورة القديمة مع سطورها
      const { data: oldInvoice, error: oldErr } = await supabase
        .from('invoices')
        .select('*, invoice_lines(*)')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      if (oldErr || !oldInvoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

      // 2. عكس تأثير الفاتورة القديمة على الأرصدة
      const oldCust = oldInvoice.customer_id;
      const oldSupp = oldInvoice.supplier_id;
      const oldTotal = oldInvoice.total;

      if (oldCust) {
        const { data: cust } = await supabase.from('customers').select('balance').eq('id', oldCust).single();
        if (cust) await supabase.from('customers').update({ balance: cust.balance - oldTotal }).eq('id', oldCust);
      }
      if (oldSupp) {
        const { data: supp } = await supabase.from('suppliers').select('balance').eq('id', oldSupp).single();
        if (supp) await supabase.from('suppliers').update({ balance: supp.balance - oldTotal }).eq('id', oldSupp);
      }

      // 3. حذف سطور الفاتورة القديمة
      await supabase.from('invoice_lines').delete().eq('invoice_id', id);

      // 4. حساب الإجمالي الجديد وإدراج السطور الجديدة
      let newTotal = 0;
      const newLines = [];
      for (const line of (lines || [])) {
        const total = parseFloat(line.total) || 0;
        newTotal += total;
        const qty = parseFloat(line.quantity) || 0;
        let qtyInBase = qty;
        if (line.unit_id) {
          const { data: conv } = await supabase.from('item_units').select('conversion_factor').eq('item_id', line.item_id).eq('unit_id', line.unit_id).maybeSingle();
          if (conv) qtyInBase = qty * parseFloat(conv.conversion_factor);
        }
        newLines.push({
          invoice_id: id,
          item_id: line.item_id || null,
          description: line.description,
          quantity: qty,
          unit_price: parseFloat(line.unit_price) || 0,
          total: total,
          unit_id: line.unit_id || null,
          quantity_in_base: qtyInBase
        });
      }
      if (newLines.length) await supabase.from('invoice_lines').insert(newLines);

      // 5. تحديث بيانات الفاتورة
      const custId = (customer_id && customer_id !== 'cash') ? parseInt(customer_id) : null;
      const suppId = (supplier_id && supplier_id !== 'cash') ? parseInt(supplier_id) : null;
      const { data: updatedInvoice, error: updateErr } = await supabase
        .from('invoices')
        .update({ type, customer_id: custId, supplier_id: suppId, date, reference, notes, total: newTotal })
        .eq('id', id)
        .select('*, customer:customers(name), supplier:suppliers(name), invoice_lines(*, item:items(name), unit:units(name))')
        .single();
      if (updateErr) throw updateErr;

      // 6. إضافة تأثير الفاتورة الجديدة على الأرصدة
      if (type === 'sale' && custId) {
        const { data: cust } = await supabase.from('customers').select('balance').eq('id', custId).single();
        if (cust) await supabase.from('customers').update({ balance: cust.balance + newTotal }).eq('id', custId);
      } else if (type === 'purchase' && suppId) {
        const { data: supp } = await supabase.from('suppliers').select('balance').eq('id', suppId).single();
        if (supp) await supabase.from('suppliers').update({ balance: supp.balance + newTotal }).eq('id', suppId);
      }

      // إعادة حساب المدفوعات (paid) لإرسالها مع الاستجابة
      const { data: payments } = await supabase.from('payments').select('amount').eq('invoice_id', id);
      updatedInvoice.paid = payments?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;
      updatedInvoice.balance = updatedInvoice.total - updatedInvoice.paid;
      return res.json(updatedInvoice);
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'معرف الفاتورة مطلوب' });

      // 1. جلب الفاتورة لحساب التأثير على الأرصدة
      const { data: invoice, error: fetchErr } = await supabase
        .from('invoices')
        .select('id, customer_id, supplier_id, total')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      if (fetchErr || !invoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

      // 2. عكس تأثير الفاتورة على الرصيد (خصم القيمة من العميل/المورد)
      if (invoice.customer_id) {
        const { data: cust } = await supabase.from('customers').select('balance').eq('id', invoice.customer_id).single();
        if (cust) await supabase.from('customers').update({ balance: cust.balance - invoice.total }).eq('id', invoice.customer_id);
      }
      if (invoice.supplier_id) {
        const { data: supp } = await supabase.from('suppliers').select('balance').eq('id', invoice.supplier_id).single();
        if (supp) await supabase.from('suppliers').update({ balance: supp.balance - invoice.total }).eq('id', invoice.supplier_id);
      }

      // 3. حذف الفاتورة (سيتم حذف سطورها ودفعاتها تلقائياً بسبب cascade في قاعدة البيانات)
      const { error: deleteErr } = await supabase.from('invoices').delete().eq('id', id).eq('user_id', userId);
      if (deleteErr) throw deleteErr;

      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
