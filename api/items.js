const { supabase } = require('../lib/supabase');
const { setCorsHeaders, getUserId, rateLimitMiddleware } = require('../lib/auth');
const { escapeHtml } = require('../lib/sanitize');

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const allowed = await rateLimitMiddleware(req, res, 'items');
  if (!allowed) return;

  try {
    let initData = req.method === 'GET' || req.method === 'DELETE' ? req.query.initData : req.body?.initData;
    const userId = await getUserId(initData);

    if (req.method === 'GET') {
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select(`*, category:categories(name), base_unit:units!items_base_unit_id_fkey(name, abbreviation), item_units(id, unit_id, conversion_factor, unit:units(name, abbreviation))`)
        .eq('user_id', userId)
        .order('name');
      if (itemsError) throw itemsError;

      const { data: invoiceLines, error: linesError } = await supabase
        .from('invoice_lines')
        .select('item_id, quantity, quantity_in_base, invoice:invoices!inner(type, date)')
        .eq('invoice.user_id', userId)
        .not('item_id', 'is', null);
      if (linesError) throw linesError;

      const statsMap = {};
      for (const line of invoiceLines) {
        const { item_id, quantity_in_base, quantity, invoice } = line;
        if (!item_id) continue;
        const qtyBase = parseFloat(quantity_in_base ?? quantity ?? 0);
        if (!statsMap[item_id]) {
          statsMap[item_id] = {
            purchase_qty: 0,
            sale_qty: 0,
            purchase_count: 0,
            sale_count: 0,
            last_purchase_date: null,
            last_sale_date: null
          };
        }
        const stats = statsMap[item_id];
        if (invoice.type === 'purchase') {
          stats.purchase_qty += qtyBase;
          stats.purchase_count += 1;
          if (!stats.last_purchase_date || invoice.date > stats.last_purchase_date) {
            stats.last_purchase_date = invoice.date;
          }
        } else if (invoice.type === 'sale') {
          stats.sale_qty += qtyBase;
          stats.sale_count += 1;
          if (!stats.last_sale_date || invoice.date > stats.last_sale_date) {
            stats.last_sale_date = invoice.date;
          }
        }
      }

      const enrichedItems = items.map(item => {
        const s = statsMap[item.id] || {};
        const available = parseFloat(item.quantity) || 0;
        const totalValue = available * (parseFloat(item.average_cost) || 0);
        return {
          ...item,
          name: escapeHtml(item.name),
          purchase_qty: s.purchase_qty || 0,
          sale_qty: s.sale_qty || 0,
          purchase_count: s.purchase_count || 0,
          sale_count: s.sale_count || 0,
          last_purchase_date: s.last_purchase_date || null,
          last_sale_date: s.last_sale_date || null,
          available,
          total_value: totalValue
        };
      });

      return res.json(enrichedItems);
    }

    if (req.method === 'POST') {
      const { name, category_id, item_type, purchase_price, selling_price, quantity, base_unit_id, item_units } = req.body;
      if (!name) return res.status(400).json({ error: 'اسم المادة مطلوب' });

      const trimmedName = name.trim();
      const escapedName = escapeHtml(trimmedName);
      const { data: existing } = await supabase
        .from('items')
        .select('id')
        .eq('user_id', userId)
        .ilike('name', trimmedName)
        .maybeSingle();
      if (existing) return res.status(400).json({ error: 'توجد مادة بنفس الاسم' });

      if (base_unit_id) {
        const { data: unitCheck } = await supabase.from('units').select('id').eq('id', base_unit_id).eq('user_id', userId).single();
        if (!unitCheck) return res.status(400).json({ error: 'الوحدة الأساسية غير موجودة' });
      }

      const avgCost = parseFloat(purchase_price) || 0;

      const { data, error } = await supabase.from('items').insert({
        user_id: userId, name: escapedName, category_id: category_id || null,
        item_type: item_type || 'مخزون', purchase_price: parseFloat(purchase_price) || 0,
        selling_price: parseFloat(selling_price) || 0, quantity: parseFloat(quantity) || 0,
        base_unit_id: base_unit_id || null,
        average_cost: avgCost
      }).select().single();
      if (error) throw error;

      if (item_units && Array.isArray(item_units) && data) {
        const validUnits = [];
        for (const u of item_units) {
          if (u.unit_id) {
            const { data: unitCheck } = await supabase.from('units').select('id').eq('id', u.unit_id).eq('user_id', userId).single();
            if (unitCheck) validUnits.push({ item_id: data.id, unit_id: u.unit_id, conversion_factor: parseFloat(u.conversion_factor) || 1 });
          }
        }
        if (validUnits.length > 0) await supabase.from('item_units').insert(validUnits);
      }

      const { data: fullData } = await supabase.from('items').select(`*, category:categories(name), base_unit:units!items_base_unit_id_fkey(name, abbreviation), item_units(id, unit_id, conversion_factor, unit:units(name, abbreviation))`).eq('id', data.id).single();
      if (fullData) fullData.name = escapeHtml(fullData.name);
      return res.json(fullData || data);
    }

    if (req.method === 'PUT') {
      const { id, name, category_id, item_type, purchase_price, selling_price, quantity, base_unit_id, item_units } = req.body;
      if (!id) return res.status(400).json({ error: 'معرف المادة مطلوب' });

      const { data: itemCheck } = await supabase.from('items').select('id').eq('id', id).eq('user_id', userId).single();
      if (!itemCheck) return res.status(404).json({ error: 'المادة غير موجودة' });

      if (name) {
        const trimmedName = name.trim();
        const { data: existing } = await supabase
          .from('items')
          .select('id')
          .eq('user_id', userId)
          .ilike('name', trimmedName)
          .neq('id', id)
          .maybeSingle();
        if (existing) return res.status(400).json({ error: 'توجد مادة أخرى بنفس الاسم' });
      }

      if (base_unit_id) {
        const { data: unitCheck } = await supabase.from('units').select('id').eq('id', base_unit_id).eq('user_id', userId).single();
        if (!unitCheck) return res.status(400).json({ error: 'الوحدة الأساسية غير موجودة' });
      }

      await supabase.from('item_units').delete().eq('item_id', id);

      if (item_units && Array.isArray(item_units)) {
        const validUnits = [];
        for (const u of item_units) {
          if (u.unit_id) {
            const { data: unitCheck } = await supabase.from('units').select('id').eq('id', u.unit_id).eq('user_id', userId).single();
            if (unitCheck) validUnits.push({ item_id: id, unit_id: u.unit_id, conversion_factor: parseFloat(u.conversion_factor) || 1 });
          }
        }
        if (validUnits.length > 0) await supabase.from('item_units').insert(validUnits);
      }

      const escapedName = name ? escapeHtml(name.trim()) : undefined;
      const { data, error } = await supabase.from('items').update({
        name: escapedName, category_id: category_id || null, item_type,
        purchase_price: parseFloat(purchase_price) || 0, selling_price: parseFloat(selling_price) || 0,
        quantity: parseFloat(quantity) || 0, base_unit_id: base_unit_id || null
      }).eq('id', id).eq('user_id', userId).select().single();
      if (error) throw error;

      const { data: fullData } = await supabase.from('items').select(`*, category:categories(name), base_unit:units!items_base_unit_id_fkey(name, abbreviation), item_units(id, unit_id, conversion_factor, unit:units(name, abbreviation))`).eq('id', id).single();
      if (fullData) fullData.name = escapeHtml(fullData.name);
      return res.json(fullData || data);
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'معرف المادة مطلوب' });

      const { data: usedLines, error: checkError } = await supabase.from('invoice_lines').select('id').eq('item_id', id).limit(1);
      if (checkError) throw checkError;
      if (usedLines && usedLines.length > 0) return res.status(400).json({ error: 'لا يمكن حذف المادة لأنها مستخدمة في فواتير' });

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
