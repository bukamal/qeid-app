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

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

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

      for (let inv of invoices) {
        const { data: payments } = await supabase
          .from('payments')
          .select('amount')
          .eq('invoice_id', inv.id);
        inv.paid = payments?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;
        inv.balance = inv.total - inv.paid;
      }
      return res.json(invoices);
    }

    if (req.method === 'POST') {
      let { type, customer_id, supplier_id, date, reference, notes, lines, paid_amount } = req.body;
      if (!type || !['sale', 'purchase'].includes(type)) return res.status(400).json({ error: 'نوع الفاتورة غير صحيح' });
      if (!lines || !Array.isArray(lines) || lines.length === 0) return res.status(400).json({ error: 'يجب إضافة بند واحد على الأقل' });

      const cust = parseInt(customer_id) && customer_id !== 'cash' ? parseInt(customer_id) : null;
      const supp = parseInt(supplier_id) && supplier_id !== 'cash' ? parseInt(supplier_id) : null;

      let total = 0;
      const lineData = [];
      for (let line of lines) {
        let lineTotal = parseFloat(line.total) || 0;
        total += lineTotal;

        let qty = parseFloat(line.quantity) || 0;
        let qtyBase = qty;
        if (line.unit_id && line.item_id) {
          const { data: iu } = await supabase
            .from('item_units')
            .select('conversion_factor')
            .eq('item_id', line.item_id)
            .eq('unit_id', line.unit_id)
            .maybeSingle();
          if (iu) qtyBase = qty * parseFloat(iu.conversion_factor);
        }
        lineData.push({
          item_id: line.item_id || null,
          description: line.description,
          quantity: qty,
          unit_price: parseFloat(line.unit_price) || 0,
          total: lineTotal,
          unit_id: line.unit_id || null,
          quantity_in_base: qtyBase
        });
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

      let paid = parseFloat(paid_amount) || 0;
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
        const { data: cur } = await supabase.from('customers').select('balance').eq('id', cust).eq('user_id', userId).single();
        if (cur) await supabase.from('customers').update({ balance: parseFloat(cur.balance) + total - paid }).eq('id', cust).eq('user_id', userId);
      } else if (type === 'purchase' && supp) {
        const { data: cur } = await supabase.from('suppliers').select('balance').eq('id', supp).eq('user_id', userId).single();
        if (cur) await supabase.from('suppliers').update({ balance: parseFloat(cur.balance) + total - paid }).eq('id', supp).eq('user_id', userId);
      }

      return res.json(invoice);
    }

    if (req.method === 'PUT') {
      const { id, type, customer_id, supplier_id, date, reference, notes, lines } = req.body;
      if (!id) return res.status(400).json({ error: 'معرف الفاتورة مطلوب' });
      const cust = parseInt(customer_id) && customer_id !== 'cash' ? parseInt(customer_id) : null;
      const supp = parseInt(supplier_id) && supplier_id !== 'cash' ? parseInt(supplier_id) : null;

      const { data: existing } = await supabase.from('invoices').select('id').eq('id', id).eq('user_id', userId).single();
      if (!existing) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

      await supabase.from('invoice_lines').delete().eq('invoice_id', id);

      let total = 0;
      const lineData = [];
      for (let line of (lines || [])) {
        let lineTotal = parseFloat(line.total) || 0;
        total += lineTotal;

        let qty = parseFloat(line.quantity) || 0;
        let qtyBase = qty;
        if (line.unit_id && line.item_id) {
          const { data: iu } = await supabase.from('item_units').select('conversion_factor').eq('item_id', line.item_id).eq('unit_id', line.unit_id).maybeSingle();
          if (iu) qtyBase = qty * parseFloat(iu.conversion_factor);
        }
        lineData.push({
          invoice_id: id,
          item_id: line.item_id || null,
          description: line.description,
          quantity: qty,
          unit_price: parseFloat(line.unit_price) || 0,
          total: lineTotal,
          unit_id: line.unit_id || null,
          quantity_in_base: qtyBase
        });
      }

      if (lineData.length > 0) await supabase.from('invoice_lines').insert(lineData);

      const { data: updated, error: updateError } = await supabase
        .from('invoices')
        .update({ type, customer_id: cust, supplier_id: supp, date, reference, notes, total })
        .eq('id', id)
        .eq('user_id', userId)
        .select('id,user_id,type,customer_id,supplier_id,date,reference,notes,total,status,created_at,customer:customers(name),supplier:suppliers(name),invoice_lines(*,item:items(name),unit:units(name))')
        .single();
      if (updateError) throw updateError;
      return res.json(updated);
    }

    if (req.method === 'DELETE') {
      const invoiceId = req.query.id;
      if (!invoiceId) return res.status(400).json({ error: 'معرف الفاتورة مطلوب' });

      // 1. جلب الفاتورة كاملة
      const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select(`id, type, customer_id, supplier_id, total, invoice_lines ( id, item_id, quantity, quantity_in_base, unit_id )`)
        .eq('id', invoiceId)
        .eq('user_id', userId)
        .single();
      if (fetchError || !invoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

      // 2. جلب الدفعات المرتبطة
      const { data: payments, error: payError } = await supabase
        .from('payments')
        .select('id, amount, customer_id, supplier_id')
        .eq('invoice_id', invoiceId);
      if (payError) throw payError;

      // 3. عكس أثر الدفعات على الأرصدة
      for (const payment of (payments || [])) {
        if (payment.customer_id) {
          await supabase
            .from('customers')
            .update({ balance: supabase.raw(`balance + ${payment.amount}`) })
            .eq('id', payment.customer_id)
            .eq('user_id', userId);
        }
        if (payment.supplier_id) {
          await supabase
            .from('suppliers')
            .update({ balance: supabase.raw(`balance + ${payment.amount}`) })
            .eq('id', payment.supplier_id)
            .eq('user_id', userId);
        }
      }

      // 4. عكس أثر الفاتورة على رصيد الطرف
      if (invoice.type === 'sale' && invoice.customer_id) {
        await supabase
          .from('customers')
          .update({ balance: supabase.raw(`balance - ${invoice.total}`) })
          .eq('id', invoice.customer_id)
          .eq('user_id', userId);
      } else if (invoice.type === 'purchase' && invoice.supplier_id) {
        await supabase
          .from('suppliers')
          .update({ balance: supabase.raw(`balance - ${invoice.total}`) })
          .eq('id', invoice.supplier_id)
          .eq('user_id', userId);
      }

      // 5. تعديل المخزون (بيع: نعيد الكميات، شراء: نخصم الكميات)
      for (const line of (invoice.invoice_lines || [])) {
        const qty = parseFloat(line.quantity_in_base || line.quantity || 0);
        if (line.item_id && qty !== 0) {
          const delta = invoice.type === 'sale' ? qty : -qty;
          await supabase
            .from('items')
            .update({ quantity: supabase.raw(`quantity + ${delta}`) })
            .eq('id', line.item_id)
            .eq('user_id', userId);
        }
      }

      // 6. حذف الدفعات
      await supabase.from('payments').delete().eq('invoice_id', invoiceId);

      // 7. حذف بنود الفاتورة
      await supabase.from('invoice_lines').delete().eq('invoice_id', invoiceId);

      // 8. حذف الفاتورة
      const { error: deleteError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)
        .eq('user_id', userId);
      if (deleteError) throw deleteError;

      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
