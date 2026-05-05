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
      // جلب المواد مع وحداتها
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select(`
          *,
          category:categories(name),
          base_unit:units!items_base_unit_id_fkey(name, abbreviation),
          item_units(
            id,
            unit_id,
            conversion_factor,
            unit:units(name, abbreviation)
          )
        `)
        .eq('user_id', userId)
        .order('name');
      if (itemsError) throw itemsError;

      // جلب بنود الفواتير لحساب الكميات المستخدمة
      const { data: invoiceLines, error: linesError } = await supabase
        .from('invoice_lines')
        .select('item_id, quantity, quantity_in_base, invoice:invoices!inner(type)')
        .eq('invoice.user_id', userId)
        .not('item_id', 'is', null);
      if (linesError) throw linesError;

      // تجميع الكميات بالوحدة الأساسية لكل مادة
      const qtyMap = {};
      for (const line of invoiceLines) {
        const { item_id, quantity_in_base, quantity, invoice } = line;
        if (!item_id) continue;

        // نفضّل quantity_in_base، وإلا نستخدم quantity (للتوافق مع البيانات القديمة)
        const qtyBase = parseFloat(quantity_in_base ?? quantity ?? 0);

        if (!qtyMap[item_id]) qtyMap[item_id] = { purchase: 0, sale: 0 };
        if (invoice.type === 'purchase') qtyMap[item_id].purchase += qtyBase;
        else if (invoice.type === 'sale') qtyMap[item_id].sale += qtyBase;
      }

      // إثراء المواد بالكميات المحسوبة
      const enrichedItems = items.map(item => {
        const q = qtyMap[item.id] || { purchase: 0, sale: 0 };
        const opening = parseFloat(item.quantity) || 0;
        const available = opening + q.purchase - q.sale;
        const totalValue = available * (parseFloat(item.purchase_price) || 0);
        return {
          ...item,
          purchase_qty: q.purchase,
          sale_qty: q.sale,
          available,
          total_value: totalValue
        };
      });

      return res.json(enrichedItems);
    }

    if (req.method === 'POST') {
      const { name, category_id, item_type, purchase_price, selling_price, quantity, base_unit_id, item_units } = req.body;
      if (!name) return res.status(400).json({ error: 'اسم المادة مطلوب' });

      // التحقق من الوحدة الأساسية
      if (base_unit_id) {
        const { data: unitCheck } = await supabase
          .from('units')
          .select('id')
          .eq('id', base_unit_id)
          .eq('user_id', userId)
          .single();
        if (!unitCheck) return res.status(400).json({ error: 'الوحدة الأساسية غير موجودة' });
      }

      const { data, error } = await supabase.from('items').insert({
        user_id: userId,
        name: name.trim(),
        category_id: category_id || null,
        item_type: item_type || 'مخزون',
        purchase_price: parseFloat(purchase_price) || 0,
        selling_price: parseFloat(selling_price) || 0,
        quantity: parseFloat(quantity) || 0,
        base_unit_id: base_unit_id || null
      }).select().single();
      if (error) throw error;

      // إدراج الوحدات الفرعية
      if (item_units && Array.isArray(item_units) && data) {
        const validUnits = [];
        for (const u of item_units) {
          if (u.unit_id) {
            const { data: unitCheck } = await supabase
              .from('units')
              .select('id')
              .eq('id', u.unit_id)
              .eq('user_id', userId)
              .single();
            if (unitCheck) {
              validUnits.push({
                item_id: data.id,
                unit_id: u.unit_id,
                conversion_factor: parseFloat(u.conversion_factor) || 1
              });
            }
          }
        }
        if (validUnits.length > 0) {
          await supabase.from('item_units').insert(validUnits);
        }
      }

      // إرجاع المادة كاملة مع العلاقات
      const { data: fullData } = await supabase
        .from('items')
        .select(`
          *,
          category:categories(name),
          base_unit:units!items_base_unit_id_fkey(name, abbreviation),
          item_units(
            id,
            unit_id,
            conversion_factor,
            unit:units(name, abbreviation)
          )
        `)
        .eq('id', data.id)
        .single();
      return res.json(fullData || data);
    }

    if (req.method === 'PUT') {
      const { id, name, category_id, item_type, purchase_price, selling_price, quantity, base_unit_id, item_units } = req.body;
      if (!id) return res.status(400).json({ error: 'معرف المادة مطلوب' });

      const { data: itemCheck } = await supabase
        .from('items')
        .select('id')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      if (!itemCheck) return res.status(404).json({ error: 'المادة غير موجودة' });

      if (base_unit_id) {
        const { data: unitCheck } = await supabase
          .from('units')
          .select('id')
          .eq('id', base_unit_id)
          .eq('user_id', userId)
          .single();
        if (!unitCheck) return res.status(400).json({ error: 'الوحدة الأساسية غير موجودة' });
      }

      // حذف الوحدات الفرعية القديمة وإعادة إدراجها
      await supabase.from('item_units').delete().eq('item_id', id);

      if (item_units && Array.isArray(item_units)) {
        const validUnits = [];
        for (const u of item_units) {
          if (u.unit_id) {
            const { data: unitCheck } = await supabase
              .from('units')
              .select('id')
              .eq('id', u.unit_id)
              .eq('user_id', userId)
              .single();
            if (unitCheck) {
              validUnits.push({
                item_id: id,
                unit_id: u.unit_id,
                conversion_factor: parseFloat(u.conversion_factor) || 1
              });
            }
          }
        }
        if (validUnits.length > 0) {
          await supabase.from('item_units').insert(validUnits);
        }
      }

      const { data, error } = await supabase.from('items').update({
        name: name?.trim(),
        category_id: category_id || null,
        item_type,
        purchase_price: parseFloat(purchase_price) || 0,
        selling_price: parseFloat(selling_price) || 0,
        quantity: parseFloat(quantity) || 0,
        base_unit_id: base_unit_id || null
      }).eq('id', id).eq('user_id', userId).select().single();
      if (error) throw error;

      const { data: fullData } = await supabase
        .from('items')
        .select(`
          *,
          category:categories(name),
          base_unit:units!items_base_unit_id_fkey(name, abbreviation),
          item_units(
            id,
            unit_id,
            conversion_factor,
            unit:units(name, abbreviation)
          )
        `)
        .eq('id', id)
        .single();
      return res.json(fullData || data);
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'معرف المادة مطلوب' });

      // منع حذف المادة المستخدمة في الفواتير
      const { data: usedLines, error: checkError } = await supabase
        .from('invoice_lines')
        .select('id')
        .eq('item_id', id)
        .limit(1);
      if (checkError) throw checkError;
      if (usedLines && usedLines.length > 0) {
        return res.status(400).json({ error: 'لا يمكن حذف المادة لأنها مستخدمة في فواتير' });
      }

      await supabase.from('item_units').delete().eq('item_id', id);
      const { error } = await supabase.from('items').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
