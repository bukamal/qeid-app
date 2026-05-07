const { createClient } = require('@supabase/supabase-js');
const { setCorsHeaders, getUserId } = require('../lib/auth');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let initData = req.method === 'GET' || req.method === 'DELETE' ? req.query.initData : req.body?.initData;
    const userId = await getUserId(initData);

    // ==================== GET ====================
    if (req.method === 'GET') {
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select(`*, category:categories(name), base_unit:units!items_base_unit_id_fkey(name, abbreviation), item_units(id, unit_id, conversion_factor, unit:units(name, abbreviation))`)
        .eq('user_id', userId)
        .order('name');
      if (itemsError) throw itemsError;

      // المخزون الفعلي صار مباشرة من حقل quantity والتكلفة من average_cost
      const enrichedItems = items.map(item => {
        const available = parseFloat(item.quantity) || 0;
        const totalValue = available * (parseFloat(item.average_cost) || 0);
        return {
          ...item,
          available,
          total_value: totalValue
        };
      });

      return res.json(enrichedItems);
    }

    // ==================== POST ====================
    if (req.method === 'POST') {
      const { name, category_id, item_type, purchase_price, selling_price, quantity, base_unit_id, item_units } = req.body;
      if (!name) return res.status(400).json({ error: 'اسم المادة مطلوب' });

      if (base_unit_id) {
        const { data: unitCheck } = await supabase.from('units').select('id').eq('id', base_unit_id).eq('user_id', userId).single();
        if (!unitCheck) return res.status(400).json({ error: 'الوحدة الأساسية غير موجودة' });
      }

      // التكلفة الأولية للمخزون تساوي سعر الشراء المُدخل
      const avgCost = parseFloat(purchase_price) || 0;

      const { data, error } = await supabase
        .from('items')
        .insert({
          user_id: userId,
          name: name.trim(),
          category_id: category_id || null,
          item_type: item_type || 'مخزون',
          purchase_price: parseFloat(purchase_price) || 0,
          selling_price: parseFloat(selling_price) || 0,
          quantity: parseFloat(quantity) || 0,
          base_unit_id: base_unit_id || null,
          average_cost: avgCost           // ← تعيين التكلفة الابتدائية
        })
        .select()
        .single();
      if (error) throw error;

      // إضافة وحدات فرعية (إن وجدت)
      if (item_units && Array.isArray(item_units) && data) {
        const validUnits = [];
        for (const u of item_units) {
          if (u.unit_id) {
            const { data: unitCheck } = await supabase.from('units').select('id').eq('id', u.unit_id).eq('user_id', userId).single();
            if (unitCheck) validUnits.push({
              item_id: data.id,
              unit_id: u.unit_id,
              conversion_factor: parseFloat(u.conversion_factor) || 1
            });
          }
        }
        if (validUnits.length > 0) await supabase.from('item_units').insert(validUnits);
      }

      // إرجاع المادة كاملة مع العلاقات
      const { data: fullData } = await supabase
        .from('items')
        .select(`*, category:categories(name), base_unit:units!items_base_unit_id_fkey(name, abbreviation), item_units(id, unit_id, conversion_factor, unit:units(name, abbreviation))`)
        .eq('id', data.id)
        .single();
      return res.json(fullData || data);
    }

    // ==================== PUT ====================
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
        const { data: unitCheck } = await supabase.from('units').select('id').eq('id', base_unit_id).eq('user_id', userId).single();
        if (!unitCheck) return res.status(400).json({ error: 'الوحدة الأساسية غير موجودة' });
      }

      // حذف الوحدات الفرعية القديمة وإعادة بنائها
      await supabase.from('item_units').delete().eq('item_id', id);

      if (item_units && Array.isArray(item_units)) {
        const validUnits = [];
        for (const u of item_units) {
          if (u.unit_id) {
            const { data: unitCheck } = await supabase.from('units').select('id').eq('id', u.unit_id).eq('user_id', userId).single();
            if (unitCheck) validUnits.push({
              item_id: id,
              unit_id: u.unit_id,
              conversion_factor: parseFloat(u.conversion_factor) || 1
            });
          }
        }
        if (validUnits.length > 0) await supabase.from('item_units').insert(validUnits);
      }

      // تحديث المادة (لاحظ أن average_cost لا يُغيّر هنا، بل من حركات الشراء فقط)
      const { data, error } = await supabase
        .from('items')
        .update({
          name: name?.trim(),
          category_id: category_id || null,
          item_type,
          purchase_price: parseFloat(purchase_price) || 0,
          selling_price: parseFloat(selling_price) || 0,
          quantity: parseFloat(quantity) || 0,
          base_unit_id: base_unit_id || null
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;

      const { data: fullData } = await supabase
        .from('items')
        .select(`*, category:categories(name), base_unit:units!items_base_unit_id_fkey(name, abbreviation), item_units(id, unit_id, conversion_factor, unit:units(name, abbreviation))`)
        .eq('id', id)
        .single();
      return res.json(fullData || data);
    }

    // ==================== DELETE ====================
    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'معرف المادة مطلوب' });

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
