const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
  const pairs = Array.from(params.entries());
  pairs.sort((a, b) => a[0].localeCompare(b[0]));
  const dataCheckString = pairs.map(([k, v]) => `${k}=${v}`).join('\n');
  const computedHash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  return computedHash === hash;
}

async function getUserId(initData) {
  if (!initData || !verifyTelegramData(initData)) throw new Error('Unauthorized');
  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get('user'));
  return user.id;
}

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let initData;
    if (req.method === 'GET' || req.method === 'DELETE') {
      initData = req.query.initData;
    } else {
      initData = req.body?.initData;
    }
    const userId = await getUserId(initData);

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customer:customers(name), supplier:suppliers(name), invoice_lines(*, item:items(name))')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      if (error) throw error;
      return res.json(data);
    } 
    else if (req.method === 'POST') {
      const { type, customer_id, supplier_id, date, reference, notes, lines, paid_amount } = req.body;
      if (!type || !['sale', 'purchase'].includes(type))
        return res.status(400).json({ error: 'نوع الفاتورة غير صحيح' });
      if (!lines || !Array.isArray(lines) || lines.length === 0)
        return res.status(400).json({ error: 'يجب إضافة بند واحد على الأقل' });

      let total = 0;
      for (const line of lines) total += parseFloat(line.total) || 0;

      const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .insert({
          user_id: userId, type, customer_id: customer_id || null,
          supplier_id: supplier_id || null,
          date: date || new Date().toISOString().split('T')[0],
          reference, notes, total, status: 'posted'
        })
        .select().single();
      if (invError) throw invError;

      const linesToInsert = lines.map(l => ({
        invoice_id: invoice.id, item_id: l.item_id || null,
        description: l.description, quantity: parseFloat(l.quantity) || 0,
        unit_price: parseFloat(l.unit_price) || 0, total: parseFloat(l.total) || 0
      }));
      await supabase.from('invoice_lines').insert(linesToInsert);

      // --- المبلغ المدفوع والدفعات التلقائية ---
      const amountPaid = parseFloat(paid_amount) || 0;
      if (amountPaid > 0) {
        // إنشاء دفعة مرتبطة بالفاتورة
        await supabase.from('payments').insert({
          user_id: userId,
          invoice_id: invoice.id,
          customer_id: customer_id || null,
          supplier_id: supplier_id || null,
          amount: amountPaid,
          payment_date: invoice.date,
          notes: 'دفعة تلقائية من الفاتورة'
        });
      }

      // تحديث رصيد العميل أو المورد (الفرق بين الإجمالي والمدفوع)
      if (type === 'sale' && customer_id) {
        const { data: cust } = await supabase.from('customers').select('balance').eq('id', customer_id).eq('user_id', userId).single();
        if (cust) {
          const newBalance = parseFloat(cust.balance) + total - amountPaid; // يزيد الرصيد بالمبلغ غير المدفوع
          await supabase.from('customers').update({ balance: newBalance }).eq('id', customer_id).eq('user_id', userId);
        }
      } else if (type === 'purchase' && supplier_id) {
        const { data: sup } = await supabase.from('suppliers').select('balance').eq('id', supplier_id).eq('user_id', userId).single();
        if (sup) {
          const newBalance = parseFloat(sup.balance) + total - amountPaid; // يزيد الالتزام بالمبلغ غير المدفوع
          await supabase.from('suppliers').update({ balance: newBalance }).eq('id', supplier_id).eq('user_id', userId);
        }
      }

      return res.json(invoice);
    } 
    else if (req.method === 'PUT') {
      // ... (نفس الكود السابق للتعديل، بدون تغيير)
      const { id, type, customer_id, supplier_id, date, reference, notes, lines } = req.body;
      if (!id) return res.status(400).json({ error: 'معرف الفاتورة مطلوب' });

      const { data: existing } = await supabase
        .from('invoices').select('id').eq('id', id).eq('user_id', userId).single();
      if (!existing) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

      await supabase.from('invoice_lines').delete().eq('invoice_id', id);

      let total = 0;
      if (lines && Array.isArray(lines)) {
        for (const line of lines) total += parseFloat(line.total) || 0;
        const linesToInsert = lines.map(l => ({
          invoice_id: id, item_id: l.item_id || null,
          description: l.description, quantity: parseFloat(l.quantity) || 0,
          unit_price: parseFloat(l.unit_price) || 0, total: parseFloat(l.total) || 0
        }));
        await supabase.from('invoice_lines').insert(linesToInsert);
      }

      const { data: updated, error: updateError } = await supabase
        .from('invoices')
        .update({ type, customer_id: customer_id || null, supplier_id: supplier_id || null, date, reference, notes, total })
        .eq('id', id).eq('user_id', userId)
        .select('*, customer:customers(name), supplier:suppliers(name), invoice_lines(*, item:items(name))')
        .single();
      if (updateError) throw updateError;
      return res.json(updated);
    }
    else if (req.method === 'DELETE') {
      // ... (نفس كود الحذف السابق)
      const invoiceId = req.query.id;
      if (!invoiceId) return res.status(400).json({ error: 'معرف الفاتورة مطلوب' });

      const { data: invoice, error: fetchError } = await supabase
        .from('invoices').select('id').eq('id', invoiceId).eq('user_id', userId).single();
      if (fetchError || !invoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

      await supabase.from('invoice_lines').delete().eq('invoice_id', invoiceId);
      const { error: deleteError } = await supabase
        .from('invoices').delete().eq('id', invoiceId).eq('user_id', userId);
      if (deleteError) throw deleteError;

      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
