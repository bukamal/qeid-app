const { createClient } = require('@supabase/supabase-js');
const { setCorsHeaders, getUserId, rateLimitMiddleware } = require('../lib/auth');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const allowed = await rateLimitMiddleware(req, res, 'items');
  if (!allowed) return;

  try {
    let initData = req.method === 'GET' || req.method === 'DELETE' ? req.query.initData : req.body?.initData;
    const userId = await getUserId(initData);

    // ==================== GET ====================
    if (req.method === 'GET') {
      const itemId = req.query.id;          // طلب مادة واحدة
      const detail = req.query.detail === '1'; // تفاصيل موسعة

      // 🟢 طلب مادة محددة (مع دعم التفاصيل الحية)
      if (itemId) {
        const { data: item, error: itemError } = await supabase
          .from('items')
          .select(`*, category:categories(name), base_unit:units!items_base_unit_id_fkey(name, abbreviation), item_units(id, unit_id, conversion_factor, unit:units(name, abbreviation))`)
          .eq('id', itemId)
          .eq('user_id', userId)
          .single();

        if (itemError || !item) {
          return res.status(404).json({ error: 'المادة غير موجودة' });
        }

        // إذا لم يُطلب تفاصيل إضافية، نرجع البيانات الأساسية فقط
        if (!detail) {
          return res.json(item);
        }

        // --- تفاصيل إضافية تحسب مباشرة من قاعدة البيانات ---
        // آخر سعر شراء فعلي
        const { data: lastPurchase } = await supabase
          .from('invoice_lines')
          .select('unit_price, invoice:invoices!inner(date, type)')
          .eq('item_id', itemId)
          .eq('invoice.type', 'purchase')
          .eq('invoice.user_id', userId)
          .order('invoice.date', { ascending: false })
          .limit(1)
          .maybeSingle();

        // إجمالي الكميات المشتراة والمباعة
        const { data: movements } = await supabase
          .from('invoice_lines')
          .select('quantity_in_base, invoice:invoices!inner(type)')
          .eq('item_id', itemId)
          .eq('invoice.user_id', userId);

        const purchaseQty = movements
          ?.filter(l => l.invoice?.type === 'purchase')
          .reduce((s, l) => s + parseFloat(l.quantity_in_base || 0), 0) || 0;
        const saleQty = movements
          ?.filter(l => l.invoice?.type === 'sale')
          .reduce((s, l) => s + parseFloat(l.quantity_in_base || 0), 0) || 0;

        // آخر 5 حركات
        const { data: lastMovements } = await supabase
          .from('invoice_lines')
          .select('quantity, unit_price, total, invoice:invoices!inner(id, date, type, reference)')
          .eq('item_id', itemId)
          .eq('invoice.user_id', userId)
          .order('invoice.date', { ascending: false })
          .limit(5);

        // بناء الكائن المخصب
        const enriched = {
          ...item,
          available: parseFloat(item.quantity) || 0,
          average_cost: parseFloat(item.average_cost) || 0,
          selling_price: parseFloat(item.selling_price) || 0,
          purchase_qty: purchaseQty,
          sale_qty: saleQty,
          total_value: (parseFloat(item.quantity) || 0) * (parseFloat(item.average_cost) || 0),
          selling_value: (parseFloat(item.quantity) || 0) * (parseFloat(item.selling_price) || 0),
          expected_profit:
            (parseFloat(item.quantity) || 0) * (parseFloat(item.selling_price) || 0) -
            (parseFloat(item.quantity) || 0) * (parseFloat(item.average_cost) || 0),
          last_purchase_price: lastPurchase ? parseFloat(lastPurchase.unit_price) : null,
          last_movements: lastMovements || []
        };

        return res.json(enriched);
      }

      // 🟢 القائمة الكاملة للمواد (السلوك الأصلي)
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select(`*, category:categories(name), base_unit:units!items_base_unit_id_fkey(name, abbreviation), item_units(id, unit_id, conversion_factor, unit:units(name, abbreviation))`)
        .eq('user_id', userId)
        .order('name');
      if (itemsError) throw itemsError;

      const { data: invoiceLines, error: linesError } = await supabase
        .from('invoice_lines')
        .select('item_id, quantity_in_base, invoice:invoices!inner(type)')
        .eq('invoice.user_id', userId)
        .not('item_id', 'is', null);
      if (linesError) throw linesError;

      const qtyMap = {};
      for (const line of invoiceLines) {
        const { item_id, quantity_in_base, invoice } = line;
        if (!item_id) continue;
        const qtyBase = parseFloat(quantity_in_base ?? 0);
        if (!qtyMap[item_id]) qtyMap[item_id] = { purchase: 0, sale: 0 };
        if (invoice.type === 'purchase') qtyMap[item_id].purchase += qtyBase;
        else if (invoice.type === 'sale') qtyMap[item_id].sale += qtyBase;
      }

      const enrichedItems = items.map(item => {
        const q = qtyMap[item.id] || { purchase: 0, sale: 0 };
        const available = parseFloat(item.quantity) || 0;
        const totalValue = available * (parseFloat(item.average_cost) || 0);
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

    // ==================== POST ====================
    if (req.method === 'POST') {
      const { name, category_id, item_type, purchase_price, selling_price, quantity, base_unit_id, item_units } = req.body;
      if (!name) return res.status(400).json({ error: 'اسم المادة مطلوب' });

      const trimmedName = name.trim();
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
        user_id: userId, name: trimmedName, category_id: category_id || null,
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
      return res.json(fullData || data);
    }

    // ==================== PUT ====================
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

      const { data, error } = await supabase.from('items').update({
        name: name?.trim(), category_id: category_id || null, item_type,
        purchase_price: parseFloat(purchase_price) || 0, selling_price: parseFloat(selling_price) || 0,
        quantity: parseFloat(quantity) || 0, base_unit_id: base_unit_id || null
      }).eq('id', id).eq('user_id', userId).select().single();
      if (error) throw error;

      const { data: fullData } = await supabase.from('items').select(`*, category:categories(name), base_unit:units!items_base_unit_id_fkey(name, abbreviation), item_units(id, unit_id, conversion_factor, unit:units(name, abbreviation))`).eq('id', id).single();
      return res.json(fullData || data);
    }

    // ==================== DELETE ====================
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
