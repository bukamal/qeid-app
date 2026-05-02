const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();
if (tg.colorScheme === 'dark') document.body.classList.add('dark');
tg.onEvent('themeChanged', () => { document.body.classList.toggle('dark', tg.colorScheme === 'dark'); });

const initData = tg.initData;
const user = tg.initDataUnsafe?.user;
const apiBase = '/api';

// ---------- دوال قفل/تحرير التمرير النهائية ----------
function lockBodyScroll() {
  document.body.classList.add('modal-open');
  document.documentElement.classList.add('modal-open');
}

function unlockBodyScroll() {
  document.body.classList.remove('modal-open');
  document.documentElement.classList.remove('modal-open');
}

// ---------- التخزين المؤقت ----------
const cache = {};
const CACHE_DURATION = 60000;
function getCached(key) {
  const entry = cache[key];
  if (entry && Date.now() - entry.time < CACHE_DURATION) return entry.data;
  delete cache[key];
  return null;
}
function setCache(key, data) { cache[key] = { data, time: Date.now() }; }

// ---------- واجهة التحميل والأخطاء ----------
function showLoading(msg) {
  document.getElementById('loading').textContent = msg;
  document.getElementById('loading').style.display = 'block';
  document.getElementById('main').style.display = 'none';
}
function showError(msg) {
  document.getElementById('loading').textContent = '❌ ' + msg;
  document.getElementById('loading').style.display = 'block';
  document.getElementById('main').style.display = 'none';
}

// ---------- استدعاء API ----------
async function apiCall(endpoint, method = 'GET', body = {}) {
  let url = apiBase + endpoint;
  if (method === 'GET' || method === 'DELETE') {
    url += (url.includes('?') ? '&' : '?') + 'initData=' + encodeURIComponent(initData);
  }
  if (method === 'GET') {
    const cached = getCached(url);
    if (cached) return cached;
  }
  const options = { method, headers: { 'Content-Type': 'application/json' } };
  if (method !== 'GET' && method !== 'DELETE') {
    options.body = JSON.stringify({ ...body, initData });
  }
  const res = await fetch(url, options);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `خطأ ${res.status}`);
  if (method === 'GET') setCache(url, json);
  if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
    const base = endpoint.split('?')[0].split('/')[1];
    if (base === 'definitions') {
      const urlParams = new URLSearchParams(endpoint.split('?')[1]);
      const type = urlParams.get('type');
      if (type === 'category') categoriesCache = await apiCall('/definitions?type=category', 'GET');
      else if (type === 'unit') unitsCache = await apiCall('/definitions?type=unit', 'GET');
    } else {
      for (const k in cache) if (k.includes(`/${base}`)) delete cache[k];
      if (base === 'invoices') invoicesCache = await apiCall('/invoices', 'GET');
      else if (base === 'items') itemsCache = await apiCall('/items', 'GET');
      else if (base === 'customers') customersCache = await apiCall('/customers', 'GET');
      else if (base === 'suppliers') suppliersCache = await apiCall('/suppliers', 'GET');
      else if (base === 'categories') categoriesCache = await apiCall('/definitions?type=category', 'GET');
      else if (base === 'units') unitsCache = await apiCall('/definitions?type=unit', 'GET');
    }
  }
  return json;
}

let customersCache = [], suppliersCache = [], itemsCache = [], categoriesCache = [], invoicesCache = [], unitsCache = [];
function showFormModal({ title, fields, initialValues = {}, onSave, onSuccess, confirmMode = false }) {
  lockBodyScroll();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const container = document.createElement('div');
  container.className = 'modal-box';

  let fieldsHTML = '';
  for (const field of fields) {
    let input = '';
    if (field.type === 'select' && field.options) {
      input = `<select id="${field.id}" class="input-field">${field.options}</select>`;
    } else {
      const inputType = field.type || 'text';
      const placeholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';
      const value = initialValues[field.id] !== undefined ? `value="${initialValues[field.id]}"` : '';
      input = `<input id="${field.id}" type="${inputType}" class="input-field" ${placeholder} ${value} />`;
    }
    fieldsHTML += `<label class="form-label">${field.label}</label>${input}`;
  }
  const buttonsHTML = confirmMode
    ? `<button class="btn-danger" id="modal-confirm">نعم، احذف</button><button class="btn-secondary" id="modal-cancel">إلغاء</button>`
    : `<button class="btn-primary" id="modal-save">حفظ</button><button class="btn-secondary" id="modal-cancel">إلغاء</button>`;
  container.innerHTML = `<h3>${title}</h3>${fieldsHTML}<div class="modal-actions">${buttonsHTML}</div>`;
  overlay.appendChild(container);
  document.body.appendChild(overlay);

  const closeModal = () => {
    if (document.body.contains(overlay)) document.body.removeChild(overlay);
    unlockBodyScroll();
  };
  document.getElementById('modal-cancel').onclick = closeModal;
  const confirmBtn = document.getElementById(confirmMode ? 'modal-confirm' : 'modal-save');
  confirmBtn.onclick = async () => {
    if (confirmMode) { closeModal(); if (onSuccess) onSuccess(true); return; }
    const values = {};
    for (const field of fields) {
      const el = document.getElementById(field.id);
      if (el) values[field.id] = el.value.trim();
    }
    try {
      const result = await onSave(values);
      if (result && result.error) alert('خطأ: ' + result.error.message);
      else { closeModal(); if (onSuccess) onSuccess(); }
    } catch (e) { alert('خطأ: ' + e.message); }
  };
}

function confirmDialog(msg) {
  return new Promise(resolve => {
    showFormModal({ title: msg, fields: [], confirmMode: true, onSuccess: (confirmed) => resolve(confirmed) });
  });
}
async function loadItems() {
  try {
    let html = `<div class="card"><button class="btn-primary" id="btn-add-item">+ إضافة مادة</button><input id="items-search" type="text" class="input-field" placeholder="🔍 بحث..." style="margin-top:12px;" /></div><div id="items-list"></div>`;
    document.getElementById('tab-content').innerHTML = html;
    document.getElementById('btn-add-item')?.addEventListener('click', showAddItemModal);
    document.getElementById('items-search')?.addEventListener('input', renderFilteredItems);
    renderFilteredItems();
  } catch (err) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`; }
}

function renderFilteredItems() {
  const q = document.getElementById('items-search')?.value.trim().toLowerCase() || '';
  let filtered = itemsCache.filter(i => (i.name || '').toLowerCase().includes(q));
  if (!filtered.length) { document.getElementById('items-list').innerHTML = '<div class="card">لا توجد مواد مطابقة</div>'; return; }
  let html = '<div class="card" style="overflow-x:auto;"><table class="report-table"><thead><tr><th>اسم المادة</th><th>مشتري</th><th>مباع</th><th>متوفر</th><th>الوحدة</th><th>القيمة</th></tr></thead><tbody>';
  filtered.forEach(item => {
    html += `<tr style="cursor:pointer;" onclick="showItemDetailModal(${item.id})">
      <td>${item.name}</td><td>${item.purchase_qty ?? 0}</td><td>${item.sale_qty ?? 0}</td><td>${item.available ?? 0}</td><td>${item.unit || '-'}</td><td>${Math.round(item.total_value ?? 0)}</td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  document.getElementById('items-list').innerHTML = html;
}

function showItemDetailModal(itemId) {
  const item = itemsCache.find(i => i.id === itemId);
  if (!item) return;
  lockBodyScroll();
  const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
  const container = document.createElement('div'); container.className = 'modal-box';
  container.innerHTML = `<h3>${item.name}</h3>
    <p>الوحدة: ${item.unit || '-'}</p>
    <p>الكمية المشتراة: ${item.purchase_qty ?? 0}</p>
    <p>الكمية المباعة: ${item.sale_qty ?? 0}</p>
    <p>المتوفرة: ${item.available ?? 0}</p>
    <p>القيمة: ${(item.total_value ?? 0).toFixed(2)}</p>
    <p>التصنيف: ${item.category?.name || 'بدون'}</p>
    <p>سعر الشراء: ${item.purchase_price}</p>
    <p>سعر البيع: ${item.selling_price}</p>
    <div class="modal-actions">
      <button class="btn-secondary" id="edit-item-detail">✏️ تعديل</button>
      <button class="btn-danger" id="delete-item-detail">🗑️ حذف</button>
      <button class="btn-secondary" id="close-detail">إغلاق</button>
    </div>`;
  overlay.appendChild(container);
  document.body.appendChild(overlay);
  const closeModal = () => { if (document.body.contains(overlay)) document.body.removeChild(overlay); unlockBodyScroll(); };
  document.getElementById('edit-item-detail').onclick = () => { closeModal(); showEditItemModal(itemId); };
  document.getElementById('delete-item-detail').onclick = () => { closeModal(); deleteItem(itemId); };
  document.getElementById('close-detail').onclick = closeModal;
}

async function deleteItem(id) {
  if (!await confirmDialog('متأكد من حذف المادة؟')) return;
  try { await apiCall(`/items?id=${id}`, 'DELETE'); alert('تم الحذف'); loadItems(); } catch (e) { alert('خطأ: ' + e.message); }
}

function showAddItemModal() {
  const catOpts = categoriesCache.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  showFormModal({
    title: 'إضافة مادة جديدة',
    fields: [
      { id: 'name', label: 'اسم المادة' },
      { id: 'category_id', label: 'التصنيف', type: 'select', options: `<option value="">بدون تصنيف</option>${catOpts}` },
      { id: 'item_type', label: 'نوع المادة', type: 'select', options: `<option value="مخزون">مخزون</option><option value="منتج نهائي">منتج نهائي</option><option value="خدمة">خدمة</option>` },
      { id: 'unit', label: 'وحدة القياس', placeholder: 'قطعة، صندوق...' },
      { id: 'purchase_price', label: 'سعر الشراء', type: 'number', placeholder: '0' },
      { id: 'selling_price', label: 'سعر البيع', type: 'number', placeholder: '0' }
    ],
    onSave: async (values) => {
      const payload = { ...values, category_id: values.category_id || null, purchase_price: parseFloat(values.purchase_price) || 0, selling_price: parseFloat(values.selling_price) || 0 };
      if (itemsCache.some(i => i.name.toLowerCase() === payload.name.toLowerCase())) return { error: { message: 'توجد مادة بنفس الاسم' } };
      return apiCall('/items', 'POST', payload);
    },
    onSuccess: () => loadItems()
  });
}

function showEditItemModal(itemId) {
  const it = itemsCache.find(i => i.id === itemId);
  if (!it) return;
  const catOpts = categoriesCache.map(c => `<option value="${c.id}" ${c.id === it.category_id ? 'selected' : ''}>${c.name}</option>`).join('');
  showFormModal({
    title: 'تعديل المادة',
    fields: [
      { id: 'name', label: 'اسم المادة' },
      { id: 'category_id', label: 'التصنيف', type: 'select', options: `<option value="">بدون تصنيف</option>${catOpts}` },
      { id: 'item_type', label: 'نوع المادة', type: 'select', options: `<option value="مخزون">مخزون</option><option value="منتج نهائي">منتج نهائي</option><option value="خدمة">خدمة</option>` },
      { id: 'unit', label: 'وحدة القياس' },
      { id: 'purchase_price', label: 'سعر الشراء', type: 'number' },
      { id: 'selling_price', label: 'سعر البيع', type: 'number' }
    ],
    initialValues: { name: it.name, category_id: it.category_id || '', item_type: it.item_type || 'مخزون', unit: it.unit || '', purchase_price: it.purchase_price, selling_price: it.selling_price },
    onSave: values => apiCall('/items', 'PUT', { id: itemId, ...values, category_id: values.category_id || null, purchase_price: parseFloat(values.purchase_price) || 0, selling_price: parseFloat(values.selling_price) || 0 }),
    onSuccess: () => loadItems()
  });
}
let g_currentSection = null;

function buildGenericItemHtml(item, { idField, nameField, extraFields }) {
  let info = '';
  extraFields.forEach(f => { const val = item[f.key] !== undefined ? item[f.key] : ''; info += `${f.prefix || ''}${val} `; });
  return `<div class="card">
    <strong>${item[nameField]}</strong> ${info ? '<br/>' + info : ''}
    <div class="card-actions">
      <button class="btn-secondary edit-btn" data-id="${item[idField]}" data-type="${g_currentSection.apiBase}">✏️ تعديل</button>
      <button class="btn-danger delete-btn" data-id="${item[idField]}" data-type="${g_currentSection.apiBase}">🗑️ حذف</button>
    </div>
  </div>`;
}

async function loadGenericSection(options) {
  g_currentSection = options;
  const { cache, title } = options;
  try {
    let html = `<div class="card"><button class="btn-primary add-btn" data-type="${options.apiBase}">+ إضافة ${title}</button></div>`;
    if (!cache || cache.length === 0) html += `<div class="card">لا يوجد ${title}</div>`;
    else cache.forEach(item => { html += buildGenericItemHtml(item, options); });
    document.getElementById('tab-content').innerHTML = html;
  } catch (err) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`; }
}

function getSectionOptions(key) {
  const map = {
    '/customers': {
      cache: customersCache, title: 'عميل', apiBase: '/customers', idField: 'id', nameField: 'name',
      extraFields: [{ key: 'balance', prefix: 'الرصيد: ' }, { key: 'phone', prefix: '📞 ' }, { key: 'address', prefix: '🏠 ' }],
      addFields: [{ id: 'name', label: 'الاسم', placeholder: 'اسم العميل' }, { id: 'phone', label: 'الهاتف', placeholder: 'رقم الهاتف' }, { id: 'address', label: 'العنوان', placeholder: 'العنوان' }],
      editFields: [{ id: 'name', label: 'الاسم' }, { id: 'phone', label: 'الهاتف' }, { id: 'address', label: 'العنوان' }],
      prepareAdd: v => ({ name: v.name, phone: v.phone || null, address: v.address || null }),
      prepareEdit: (id, v) => ({ id, name: v.name, phone: v.phone || null, address: v.address || null })
    },
    '/suppliers': {
      cache: suppliersCache, title: 'مورد', apiBase: '/suppliers', idField: 'id', nameField: 'name',
      extraFields: [{ key: 'balance', prefix: 'الرصيد: ' }, { key: 'phone', prefix: '📞 ' }, { key: 'address', prefix: '🏠 ' }],
      addFields: [{ id: 'name', label: 'الاسم', placeholder: 'اسم المورد' }, { id: 'phone', label: 'الهاتف', placeholder: 'رقم الهاتف' }, { id: 'address', label: 'العنوان', placeholder: 'العنوان' }],
      editFields: [{ id: 'name', label: 'الاسم' }, { id: 'phone', label: 'الهاتف' }, { id: 'address', label: 'العنوان' }],
      prepareAdd: v => ({ name: v.name, phone: v.phone || null, address: v.address || null }),
      prepareEdit: (id, v) => ({ id, name: v.name, phone: v.phone || null, address: v.address || null })
    },
    '/definitions?type=category': {
      cache: categoriesCache, title: 'تصنيف', apiBase: '/definitions?type=category', idField: 'id', nameField: 'name',
      extraFields: [],
      addFields: [{ id: 'name', label: 'اسم التصنيف', placeholder: 'اسم التصنيف' }],
      editFields: [{ id: 'name', label: 'اسم التصنيف' }],
      prepareAdd: v => ({ type: 'category', name: v.name }),
      prepareEdit: (id, v) => ({ type: 'category', id, name: v.name })
    },
    '/definitions?type=unit': {
      cache: unitsCache, title: 'وحدة', apiBase: '/definitions?type=unit', idField: 'id', nameField: 'name',
      extraFields: [{ key: 'abbreviation', prefix: '(' }],
      addFields: [{ id: 'name', label: 'اسم الوحدة', placeholder: 'اسم الوحدة' }, { id: 'abbreviation', label: 'الاختصار', placeholder: 'مثلاً: كغ' }],
      editFields: [{ id: 'name', label: 'الاسم' }, { id: 'abbreviation', label: 'الاختصار' }],
      prepareAdd: v => ({ type: 'unit', name: v.name, abbreviation: v.abbreviation || null }),
      prepareEdit: (id, v) => ({ type: 'unit', id, name: v.name, abbreviation: v.abbreviation || null })
    }
  };
  return map[key];
}

document.addEventListener('click', async (e) => {
  const t = e.target;
  if (t.classList.contains('add-btn')) {
    const key = t.dataset.type; const opts = getSectionOptions(key); if (!opts) return;
    showFormModal({
      title: `إضافة ${opts.title} جديد`,
      fields: opts.addFields,
      onSave: v => apiCall(opts.apiBase, 'POST', opts.prepareAdd(v)),
      onSuccess: () => loadGenericSection(opts)
    });
  } else if (t.classList.contains('edit-btn')) {
    const id = t.dataset.id, key = t.dataset.type, opts = getSectionOptions(key); if (!opts) return;
    const item = opts.cache.find(x => x[opts.idField] == id); if (!item) return;
    const init = {}; opts.editFields.forEach(f => init[f.id] = item[f.id] !== undefined ? item[f.id] : '');
    showFormModal({
      title: `تعديل ${opts.title}`,
      fields: opts.editFields,
      initialValues: init,
      onSave: v => apiCall(opts.apiBase, 'PUT', opts.prepareEdit(id, v)),
      onSuccess: () => loadGenericSection(opts)
    });
  } else if (t.classList.contains('delete-btn')) {
    const id = t.dataset.id, key = t.dataset.type, opts = getSectionOptions(key); if (!opts) return;
    if (!await confirmDialog(`متأكد من حذف ${opts.title}؟`)) return;
    try {
      const delUrl = opts.apiBase.includes('?') ? `${opts.apiBase}&id=${id}` : `${opts.apiBase}?id=${id}`;
      await apiCall(delUrl, 'DELETE');
      alert('تم الحذف');
      loadGenericSection(opts);
    } catch (err) { alert('خطأ: ' + err.message); }
  }
});
async function showInvoiceModal(type) {
  try {
    lockBodyScroll();
    const [customers, suppliers, items] = await Promise.all([apiCall('/customers', 'GET'), apiCall('/suppliers', 'GET'), apiCall('/items', 'GET')]);
    itemsCache = items; customersCache = customers; suppliersCache = suppliers;
    let entOpts = type === 'sale' ? `<option value="cash">عميل نقدي</option>${customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}` : `<option value="cash">مورد نقدي</option>${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}`;
    const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
    const container = document.createElement('div');
    container.className = 'modal-box';
    container.style.maxWidth = '600px';
    container.style.maxHeight = '90vh';
    container.style.overflowY = 'auto';
    container.innerHTML = `
      <h3>فاتورة ${type === 'sale' ? 'مبيعات' : 'مشتريات'} جديدة</h3>
      <input type="hidden" id="inv-type" value="${type}" />
      <h4>البنود</h4>
      <div id="inv-lines-container"><div class="line-row">
        <select class="input-field item-select"><option value="">اختر مادة</option>${items.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}</select>
        <input type="number" step="any" class="input-field qty-input" placeholder="الكمية" />
        <input type="number" step="0.01" class="input-field price-input" placeholder="السعر" />
        <input type="number" step="0.01" class="input-field total-input" placeholder="الإجمالي" readonly />
        <button class="btn-remove-line btn-secondary" style="display:none;">✕</button>
      </div></div>
      <button id="btn-add-inv-line" class="btn-secondary" style="width:auto;margin:8px 0;">+ بند</button>
      <label class="form-label">${type === 'sale' ? 'العميل' : 'المورد'}</label>
      <select id="inv-entity" class="input-field">${entOpts}</select>
      <label class="form-label">التاريخ</label><input id="inv-date" type="date" class="input-field" value="${new Date().toISOString().split('T')[0]}" />
      <label class="form-label">الرقم المرجعي</label><input id="inv-ref" class="input-field" />
      <label class="form-label">ملاحظات</label><textarea id="inv-notes" class="input-field"></textarea>
      <label class="form-label">المبلغ المدفوع</label><input id="inv-paid" type="number" step="0.01" class="input-field" />
      <div class="modal-actions"><button class="btn-primary" id="btn-save-invoice">حفظ الفاتورة</button><button class="btn-secondary" id="btn-cancel-invoice">إلغاء</button></div>
    `;
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    const closeModal = () => { if (document.body.contains(overlay)) document.body.removeChild(overlay); unlockBodyScroll(); };
    document.getElementById('btn-cancel-invoice').onclick = closeModal;

    attachInvoiceEvents(type);

    document.getElementById('btn-save-invoice').onclick = async () => {
      const itype = document.getElementById('inv-type').value;
      const entity = document.getElementById('inv-entity').value;
      let cust = null, supp = null;
      if (itype === 'sale') cust = entity === 'cash' ? null : entity;
      else supp = entity === 'cash' ? null : entity;
      const date = document.getElementById('inv-date').value;
      const ref = document.getElementById('inv-ref').value.trim();
      const notes = document.getElementById('inv-notes').value.trim();
      const paid = parseFloat(document.getElementById('inv-paid')?.value) || 0;
      const lines = []; const ids = new Set(); let dup = false;
      document.querySelectorAll('#inv-lines-container .line-row').forEach(row => {
        const id = row.querySelector('.item-select').value || null;
        if (id) { if (ids.has(id)) dup = true; ids.add(id); }
        const qty = parseFloat(row.querySelector('.qty-input').value) || 0;
        const price = parseFloat(row.querySelector('.price-input').value) || 0;
        const total = parseFloat(row.querySelector('.total-input').value) || 0;
        if (id || qty > 0) lines.push({ item_id: id, description: id ? '' : 'بند', quantity: qty, unit_price: price, total });
      });
      if (dup) return alert('لا يمكن تكرار نفس المادة');
      if (!lines.length) return alert('أضف بنداً');
      try {
        await apiCall('/invoices', 'POST', { type: itype, customer_id: cust, supplier_id: supp, date, reference: ref, notes, lines, paid_amount: paid });
        closeModal(); alert('تم حفظ الفاتورة بنجاح'); loadInvoices();
      } catch (e) { alert('خطأ: ' + e.message); }
    };
  } catch (err) { alert('خطأ: ' + err.message); unlockBodyScroll(); }
}

function attachInvoiceEvents(invoiceType) {
  function isItemDuplicate(id, cur) { if (!id) return false; let found = false; document.querySelectorAll('#inv-lines-container .line-row').forEach(r => { if (r !== cur && r.querySelector('.item-select')?.value === id) found = true; }); return found; }
  function autoFillPrice(sel, pr) {
    const id = sel.value; if (!id) { pr.value = ''; return; }
    const item = itemsCache.find(i => i.id == id);
    if (item) {
      pr.value = (invoiceType === 'sale' ? item.selling_price : item.purchase_price) || 0;
      const row = sel.closest('.line-row'), qty = row.querySelector('.qty-input'), tot = row.querySelector('.total-input');
      if (qty && tot) tot.value = Math.round((parseFloat(qty.value) || 0) * (parseFloat(pr.value) || 0));
    }
  }
  document.querySelectorAll('#inv-lines-container .line-row').forEach(row => {
    const sel = row.querySelector('.item-select'), pr = row.querySelector('.price-input');
    if (sel && pr) autoFillPrice(sel, pr);
    sel?.addEventListener('change', function () { if (isItemDuplicate(this.value, this.closest('.line-row'))) { alert('المادة مضافة مسبقاً'); this.value = ''; pr.value = ''; return; } autoFillPrice(this, pr); });
    const qty = row.querySelector('.qty-input'), tot = row.querySelector('.total-input');
    const calc = () => { tot.value = Math.round((parseFloat(qty.value) || 0) * (parseFloat(pr.value) || 0)); };
    qty?.addEventListener('input', calc); pr?.addEventListener('input', calc);
  });
  document.getElementById('btn-add-inv-line')?.addEventListener('click', () => {
    const ctr = document.getElementById('inv-lines-container');
    const nl = document.createElement('div'); nl.className = 'line-row';
    nl.innerHTML = `<select class="input-field item-select"><option value="">اختر مادة</option>${itemsCache.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}</select>
      <input type="number" step="any" class="input-field qty-input" placeholder="الكمية" />
      <input type="number" step="0.01" class="input-field price-input" placeholder="السعر" />
      <input type="number" step="0.01" class="input-field total-input" placeholder="الإجمالي" readonly />
      <button class="btn-remove-line btn-secondary">✕</button>`;
    ctr.appendChild(nl);
    updateInvoiceRemoveButtons();
    const sel = nl.querySelector('.item-select'), pr = nl.querySelector('.price-input'), qty = nl.querySelector('.qty-input'), tot = nl.querySelector('.total-input');
    sel.addEventListener('change', function () { if (isItemDuplicate(this.value, this.closest('.line-row'))) { alert('المادة مضافة مسبقاً'); this.value = ''; pr.value = ''; return; } autoFillPrice(this, pr); });
    const calc = () => { tot.value = Math.round((parseFloat(qty.value) || 0) * (parseFloat(pr.value) || 0)); };
    qty.addEventListener('input', calc); pr.addEventListener('input', calc);
  });
  document.getElementById('inv-lines-container')?.addEventListener('click', e => { if (e.target.classList.contains('btn-remove-line')) { const row = e.target.closest('.line-row'); if (document.querySelectorAll('#inv-lines-container .line-row').length > 1) { row.remove(); updateInvoiceRemoveButtons(); } } });
  updateInvoiceRemoveButtons();
}
function updateInvoiceRemoveButtons() { document.querySelectorAll('#inv-lines-container .line-row').forEach(row => { const btn = row.querySelector('.btn-remove-line'); if (btn) btn.style.display = document.querySelectorAll('#inv-lines-container .line-row').length > 1 ? 'inline-block' : 'none'; }); }
async function loadInvoices() {
  try {
    let html = `<div class="card"><h3>جميع الفواتير</h3><div style="display:flex;gap:8px;margin-bottom:8px;"><button class="filter-tab active" data-filter="all">الكل</button><button class="filter-tab" data-filter="sale">بيع</button><button class="filter-tab" data-filter="purchase">شراء</button></div><input id="invoice-search" type="text" class="input-field" placeholder="🔍 بحث..." /></div><div id="invoices-list"></div>`;
    document.getElementById('tab-content').innerHTML = html;
    document.querySelectorAll('.filter-tab').forEach(tab => tab.addEventListener('click', function () { document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active')); this.classList.add('active'); renderFilteredInvoices(); }));
    document.getElementById('invoice-search').addEventListener('input', renderFilteredInvoices);
    renderFilteredInvoices();
  } catch (err) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`; }
}

function renderFilteredInvoices() {
  const filt = document.querySelector('.filter-tab.active')?.dataset.filter || 'all';
  const q = document.getElementById('invoice-search')?.value.trim().toLowerCase() || '';
  let data = invoicesCache;
  if (filt === 'sale') data = data.filter(inv => inv.type === 'sale');
  else if (filt === 'purchase') data = data.filter(inv => inv.type === 'purchase');
  if (q) data = data.filter(inv => (inv.reference||'').includes(q) || (inv.customer?.name||'').includes(q) || (inv.supplier?.name||'').includes(q) || String(inv.total).includes(q));
  if (!data.length) { document.getElementById('invoices-list').innerHTML = '<div class="card">لا توجد فواتير مطابقة</div>'; return; }
  let html = '';
  data.forEach(inv => {
    html += `<div class="card">
      <strong>${inv.type==='sale'?'بيع':'شراء'} ${inv.reference||''}</strong> – ${inv.date}<br/>
      ${inv.customer?.name?'العميل: '+inv.customer.name:''} ${inv.supplier?.name?'المورد: '+inv.supplier.name:''}<br/>
      الإجمالي: ${Math.round(inv.total)} | المدفوع: ${Math.round(inv.paid||0)} | الباقي: <strong>${Math.round(inv.balance||0)}</strong>
      <div class="card-actions">
        <button class="btn-secondary edit-invoice-btn" data-id="${inv.id}">✏️ تعديل</button>
        <button class="btn-primary print-invoice-btn" data-id="${inv.id}">🖨️ طباعة</button>
        <button class="btn-primary pdf-invoice-btn" data-id="${inv.id}">📥 PDF</button>
        <button class="btn-danger delete-invoice-btn" data-id="${inv.id}">🗑️ حذف</button>
      </div>
    </div>`;
  });
  document.getElementById('invoices-list').innerHTML = html;
  document.querySelectorAll('.edit-invoice-btn').forEach(b => b.addEventListener('click', e => { const inv = invoicesCache.find(i=>i.id===parseInt(e.target.dataset.id)); if(inv) showEditInvoiceModal(inv); }));
  document.querySelectorAll('.print-invoice-btn').forEach(b => b.addEventListener('click', e => { const inv = invoicesCache.find(i=>i.id===parseInt(e.target.dataset.id)); if(inv) printInvoice(inv); }));
  document.querySelectorAll('.pdf-invoice-btn').forEach(b => b.addEventListener('click', async e => { const id=parseInt(e.target.dataset.id); b.disabled=true; b.textContent='⏳ جاري...'; try{await apiCall('/send-invoice-pdf','POST',{invoiceId:id}); alert('تم إرسال PDF إلى البوت'); }catch(ex){alert('فشل الإرسال: '+ex.message);} finally{b.disabled=false; b.textContent='📥 PDF';} }));
  document.querySelectorAll('.delete-invoice-btn').forEach(b => b.addEventListener('click', e => deleteInvoice(parseInt(e.target.dataset.id))));
}

function showEditInvoiceModal(invoice) { alert('سيتم فتح نافذة تعديل الفاتورة قريباً'); }
async function deleteInvoice(id) { if (!await confirmDialog('متأكد من حذف الفاتورة؟')) return; try { await apiCall(`/invoices?id=${id}`, 'DELETE'); alert('تم الحذف'); loadInvoices(); } catch (e) { alert('خطأ: ' + e.message); } }

function printInvoice(invoice) {
  const rows = invoice.invoice_lines?.map(l => `<tr><td>${l.item?.name||'-'}</td><td>${l.quantity}</td><td>${l.unit_price}</td><td>${l.total}</td>`).join('')||'';
  const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>فاتورة</title><style>body{font-family:Tajawal,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:right}</style></head><body><h2>فاتورة ${invoice.type==='sale'?'بيع':'شراء'}</h2><p>التاريخ: ${invoice.date} | المرجع: ${invoice.reference||'-'}</p><p>${invoice.customer?.name?'العميل: '+invoice.customer.name:''} ${invoice.supplier?.name?'المورد: '+invoice.supplier.name:''}</p><table><thead><tr><th>المادة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table><h3>الإجمالي: ${Math.round(invoice.total)}</h3><p>المدفوع: ${Math.round(invoice.paid||0)} | الباقي: ${Math.round(invoice.balance||0)}</p><p>${invoice.notes||''}</p><button onclick="window.print();setTimeout(()=>window.close(),500);">🖨️ طباعة</button></body></html>`;
  const w = window.open('', '_blank', 'width=800,height=600');
  if (w) { w.document.write(html); w.document.close(); } else alert('الرجاء السماح بالنوافذ المنبثقة');
}
async function loadPayments() {
  try {
    const [payments, invoices, customers, suppliers] = await Promise.all([apiCall('/payments','GET'), apiCall('/invoices','GET'), apiCall('/customers','GET'), apiCall('/suppliers','GET')]);
    let html = `<div class="card"><button class="btn-primary" id="btn-add-pmt">+ إضافة دفعة</button></div>`;
    if (!payments.length) html += '<div class="card">لا توجد دفعات</div>';
    else payments.forEach(p => html += `<div class="card"><strong>${p.amount}</strong> – ${p.payment_date}<br/>${p.customer?.name?'العميل: '+p.customer.name:''} ${p.supplier?.name?'المورد: '+p.supplier.name:''} ${p.invoice?`| فاتورة: ${p.invoice.type==='sale'?'بيع':'شراء'} ${p.invoice.reference||''}`:''} ${p.notes?'<br/>'+p.notes:''}<div class="card-actions"><button class="btn-danger" onclick="deletePayment(${p.id})">🗑️ حذف</button></div></div>`);
    document.getElementById('tab-content').innerHTML = html;
    document.getElementById('btn-add-pmt')?.addEventListener('click', () => showAddPaymentModal(customers, suppliers, invoices));
  } catch (err) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`; }
}

function showAddPaymentModal(customers, suppliers, invoices) {
  lockBodyScroll();
  const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
  const container = document.createElement('div'); container.className = 'modal-box';
  container.innerHTML = `<h3>إضافة دفعة جديدة</h3>
    <label class="form-label">النوع</label>
    <select id="pmt-type" class="input-field"><option value="customer">من عميل</option><option value="supplier">إلى مورد</option></select>
    <div id="pmt-cust-block"><label class="form-label">العميل</label><select id="pmt-customer" class="input-field"><option value="">اختر عميل</option>${customers.map(c=>`<option value="${c.id}">${c.name} (${c.balance})</option>`).join('')}</select></div>
    <div id="pmt-supp-block" style="display:none;"><label class="form-label">المورد</label><select id="pmt-supplier" class="input-field"><option value="">اختر مورد</option>${suppliers.map(s=>`<option value="${s.id}">${s.name} (${s.balance})</option>`).join('')}</select></div>
    <label class="form-label">الفاتورة (اختياري)</label><select id="pmt-invoice" class="input-field"><option value="">بدون فاتورة</option></select>
    <label class="form-label">المبلغ</label><input id="pmt-amount" type="number" step="0.01" class="input-field" />
    <label class="form-label">التاريخ</label><input id="pmt-date" type="date" class="input-field" value="${new Date().toISOString().split('T')[0]}" />
    <label class="form-label">ملاحظات</label><textarea id="pmt-notes" class="input-field"></textarea>
    <div class="modal-actions"><button class="btn-primary" id="btn-save-pmt">حفظ الدفعة</button><button class="btn-secondary" id="btn-cancel-pmt">إلغاء</button></div>`;
  overlay.appendChild(container);
  document.body.appendChild(overlay);

  const closeModal = () => { if (document.body.contains(overlay)) document.body.removeChild(overlay); unlockBodyScroll(); };
  const tSel = document.getElementById('pmt-type'), cBlock = document.getElementById('pmt-cust-block'), sBlock = document.getElementById('pmt-supp-block'), invSel = document.getElementById('pmt-invoice'), cSel = document.getElementById('pmt-customer'), sSel = document.getElementById('pmt-supplier');
  const updateInvList = (type, eId) => {
    const filt = invoices.filter(inv => type==='customer' ? inv.type==='sale' && inv.customer_id==eId : inv.type==='purchase' && inv.supplier_id==eId);
    invSel.innerHTML = '<option value="">بدون فاتورة</option>' + filt.map(inv=>`<option value="${inv.id}">${inv.type==='sale'?'بيع':'شراء'} ${inv.reference||''} (${inv.total})</option>`).join('');
  };
  tSel.addEventListener('change', ()=>{ if(tSel.value==='customer'){cBlock.style.display='block';sBlock.style.display='none';updateInvList('customer',cSel.value);}else{cBlock.style.display='none';sBlock.style.display='block';updateInvList('supplier',sSel.value);} });
  cSel.addEventListener('change', ()=>updateInvList('customer',cSel.value));
  sSel.addEventListener('change', ()=>updateInvList('supplier',sSel.value));
  document.getElementById('btn-save-pmt').onclick = async () => {
    const type = tSel.value, cust = type==='customer'?(cSel.value||null):null, supp = type==='supplier'?(sSel.value||null):null, invId = invSel.value||null, amount = parseFloat(document.getElementById('pmt-amount').value);
    if (!amount || amount<=0) return alert('المبلغ مطلوب');
    if (!cust && !supp) return alert('اختر عميلاً أو مورداً');
    try {
      await apiCall('/payments','POST',{invoice_id:invId,customer_id:cust,supplier_id:supp,amount,payment_date:document.getElementById('pmt-date').value,notes:document.getElementById('pmt-notes').value.trim()});
      closeModal(); alert('تم حفظ الدفعة'); loadPayments();
    } catch(e){ alert('خطأ: '+e.message); }
  };
  document.getElementById('btn-cancel-pmt').onclick = closeModal;
}

async function deletePayment(id) { if (!await confirmDialog('متأكد من حذف الدفعة؟')) return; try { await apiCall(`/payments?id=${id}`, 'DELETE'); alert('تم الحذف'); loadPayments(); } catch(e){ alert('خطأ: '+e.message); } }
async function loadExpenses() {
  try {
    const expenses = await apiCall('/expenses','GET');
    let html = `<div class="card"><button class="btn-primary" id="btn-add-expense">+ إضافة مصروف</button></div>`;
    if (!expenses.length) html += '<div class="card">لا توجد مصاريف</div>';
    else expenses.forEach(ex => html += `<div class="card"><strong>${ex.amount}</strong> – ${ex.expense_date}<br/>${ex.description||''}<div class="card-actions"><button class="btn-danger" onclick="deleteExpense(${ex.id})">🗑️ حذف</button></div></div>`);
    document.getElementById('tab-content').innerHTML = html;
    document.getElementById('btn-add-expense')?.addEventListener('click', showAddExpenseModal);
  } catch(err){ document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`; }
}

function showAddExpenseModal() {
  showFormModal({
    title: 'إضافة مصروف جديد',
    fields: [
      { id:'amount', label:'المبلغ', type:'number', placeholder:'المبلغ' },
      { id:'expense_date', label:'التاريخ', type:'date' },
      { id:'description', label:'الوصف', placeholder:'وصف المصروف' }
    ],
    initialValues: { expense_date: new Date().toISOString().split('T')[0] },
    onSave: values => apiCall('/expenses','POST',{...values, amount:parseFloat(values.amount)}),
    onSuccess: () => loadExpenses()
  });
}
async function deleteExpense(id) { if (!await confirmDialog('متأكد من حذف المصروف؟')) return; try { await apiCall(`/expenses?id=${id}`, 'DELETE'); alert('تم الحذف'); loadExpenses(); } catch(e){ alert('خطأ: '+e.message); } }
async function loadDashboard() {
  try {
    const data = await apiCall('/summary','GET');
    const totalSales = data.total_sales||0, totalPurchases = data.total_purchases||0;
    let html = `<div class="summary-strip">
      <div class="summary-item profit"><div class="summary-value ${data.net_profit>=0?'positive':'negative'}">${data.net_profit.toFixed(2)}</div><div>صافي الربح</div></div>
      <div class="summary-item cash"><div class="summary-value ${data.cash_balance>=0?'positive':'negative'}">${data.cash_balance.toFixed(2)}</div><div>رصيد الصندوق</div></div>
      <div class="summary-item daily-cash"><div class="summary-value ${data.daily_cash_balance>=0?'positive':'negative'}">${data.daily_cash_balance.toFixed(2)}</div><div>الرصيد اليومي</div></div>
      <div class="summary-item receivables"><div class="summary-value">${data.receivables.toFixed(2)}</div><div>الذمم المدينة</div></div>
      <div class="summary-item payables"><div class="summary-value">${data.payables.toFixed(2)}</div><div>الذمم الدائنة</div></div>
    </div>
    <div class="dashboard-grid">
      <div class="dash-card"><div class="dash-value">${itemsCache.length}</div><div>المواد</div></div>
      <div class="dash-card"><div class="dash-value">${customersCache.length}</div><div>العملاء</div></div>
      <div class="dash-card"><div class="dash-value">${suppliersCache.length}</div><div>الموردين</div></div>
      <div class="dash-card"><div class="dash-value">${invoicesCache.length}</div><div>الفواتير</div></div>
    </div>
    <div class="charts-row">
      <div class="chart-container"><canvas id="incomeChart"></canvas></div>
      <div class="chart-container"><canvas id="paymentsChart"></canvas></div>
      <div class="chart-container"><canvas id="profitChart"></canvas></div>
    </div>`;
    document.getElementById('tab-content').innerHTML = html;
    new Chart(document.getElementById('incomeChart'), { type:'doughnut', data:{labels:['مبيعات','مشتريات'],datasets:[{data:[totalSales,totalPurchases],backgroundColor:['#10b981','#f59e0b']}]}, options:{responsive:true,plugins:{legend:{position:'bottom'}}} });
    if(data.monthly) new Chart(document.getElementById('paymentsChart'), { type:'bar', data:{labels:data.monthly.labels,datasets:[{label:'وارد',data:data.monthly.payments_in,backgroundColor:'#3b82f6'},{label:'منصرف',data:data.monthly.payments_out,backgroundColor:'#ef4444'}]}, options:{responsive:true,scales:{y:{beginAtZero:true}}} });
    if(data.daily?.dates.length){
      const last30 = data.daily.dates.slice(-30), profits30 = data.daily.profits.slice(-30);
      new Chart(document.getElementById('profitChart'), { type:'line', data:{labels:last30,datasets:[{label:'صافي الربح اليومي',data:profits30,borderColor:'#8b5cf6',tension:0.3,fill:true,backgroundColor:'rgba(139,92,246,0.1)'}]}, options:{responsive:true,scales:{y:{beginAtZero:true}}} });
    }
  } catch(err){ document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`; }
}
async function loadReports() {
  let html = `<div class="card"><h3>التقارير</h3></div>
    <div class="card report-link" data-report="trial_balance">📊 ميزان المراجعة</div>
    <div class="card report-link" data-report="income_statement">📈 قائمة الدخل</div>
    <div class="card report-link" data-report="balance_sheet">⚖️ الميزانية العمومية</div>
    <div class="card report-link" data-report="account_ledger">📒 الأستاذ العام</div>
    <div class="card report-link" data-report="customer_statement">👤 كشف حساب عميل</div>
    <div class="card report-link" data-report="supplier_statement">🏭 كشف حساب مورد</div>`;
  document.getElementById('tab-content').innerHTML = html;
  document.querySelectorAll('.report-link').forEach(el => el.addEventListener('click', () => {
    const r = el.dataset.report;
    if (r==='trial_balance') loadTrialBalance();
    else if (r==='income_statement') loadIncomeStatement();
    else if (r==='balance_sheet') loadBalanceSheet();
    else if (r==='account_ledger') loadAccountLedgerForm();
    else if (r==='customer_statement') loadCustomerStatementForm();
    else if (r==='supplier_statement') loadSupplierStatementForm();
  }));
}

async function loadTrialBalance() { try{ const data = await apiCall('/reports?type=trial_balance','GET'); let rows = data.map(r=>`<tr><td>${r.name}</td><td>${r.total_debit.toFixed(2)}</td><td>${r.total_credit.toFixed(2)}</td><td class="${r.balance>=0?'positive':'negative'}">${r.balance.toFixed(2)}</td>`).join(''); document.getElementById('tab-content').innerHTML=`<div class="card"><button class="btn-secondary" onclick="loadReports()">🔙 رجوع</button><h3>ميزان المراجعة</h3><div class="report-table-wrapper"><table class="report-table"><thead><tr><th>الحساب</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>${rows}</tbody></table></div></div>`; } catch(e){ document.getElementById('tab-content').innerHTML=`<div class="card" style="color:red;">⚠️ ${e.message}</div>`; } }
async function loadIncomeStatement() { try{ const d = await apiCall('/reports?type=income_statement','GET'); const iRows=d.income.map(i=>`<tr><td>${i.name}</td><td>${i.balance.toFixed(2)}</td>`).join(''); const eRows=d.expenses.map(e=>`<tr><td>${e.name}</td><td>${e.balance.toFixed(2)}</td>`).join(''); document.getElementById('tab-content').innerHTML=`<div class="card"><button class="btn-secondary" onclick="loadReports()">🔙 رجوع</button><h3>قائمة الدخل</h3><h4>الإيرادات</h4><table class="report-table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${iRows}</tbody></table><strong>إجمالي الإيرادات: ${d.total_income.toFixed(2)}</strong><h4>المصروفات</h4><table class="report-table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${eRows}</tbody></table><strong>إجمالي المصروفات: ${d.total_expenses.toFixed(2)}</strong><hr/><h2>صافي الربح: ${d.net_profit.toFixed(2)}</h2></div>`; } catch(e){ document.getElementById('tab-content').innerHTML=`<div class="card" style="color:red;">⚠️ ${e.message}</div>`; } }
async function loadBalanceSheet() { try{ const d=await apiCall('/reports?type=balance_sheet','GET'); const aRows=d.assets.map(a=>`<tr><td>${a.name}</td><td>${a.balance.toFixed(2)}</td>`).join(''); const lRows=d.liabilities.map(l=>`<tr><td>${l.name}</td><td>${l.balance.toFixed(2)}</td>`).join(''); const eRows=d.equity.map(e=>`<tr><td>${e.name}</td><td>${e.balance.toFixed(2)}</td>`).join(''); document.getElementById('tab-content').innerHTML=`<div class="card"><button class="btn-secondary" onclick="loadReports()">🔙 رجوع</button><h3>الميزانية العمومية</h3><h4>الأصول</h4><table class="report-table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${aRows}</tbody></table><strong>إجمالي الأصول: ${d.total_assets.toFixed(2)}</strong><h4>الخصوم</h4><table class="report-table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${lRows}</tbody></table><strong>إجمالي الخصوم: ${d.total_liabilities.toFixed(2)}</strong><h4>حقوق الملكية</h4><table class="report-table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${eRows}</tbody><tr><strong>إجمالي حقوق الملكية: ${d.total_equity.toFixed(2)}</strong></div>`; } catch(e){ document.getElementById('tab-content').innerHTML=`<div class="card" style="color:red;">⚠️ ${e.message}</div>`; } }
async function loadAccountLedgerForm() { try{ const accounts=await apiCall('/accounts','GET'); const opts=accounts.map(a=>`<option value="${a.id}">${a.name}</option>`).join(''); document.getElementById('tab-content').innerHTML=`<div class="card"><button class="btn-secondary" onclick="loadReports()">🔙 رجوع</button><h3>الأستاذ العام</h3><select id="ledger-account" class="input-field">${opts}</select><button id="btn-ledger" class="btn-primary">عرض الحركات</button><div id="ledger-result" style="margin-top:15px"></div></div>`; document.getElementById('btn-ledger').addEventListener('click',async()=>{const id=document.getElementById('ledger-account').value; if(!id)return; try{const lines=await apiCall(`/reports?type=account_ledger&account_id=${id}`,'GET'); let html='<div class="report-table-wrapper"><table class="report-table"><thead><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>'; lines.forEach(l=>html+=`<tr><td>${l.date||''}</td><td>${l.description||''}</td><td>${(l.debit||0).toFixed(2)}</td><td>${(l.credit||0).toFixed(2)}</td><td class="${(l.balance||0)>=0?'positive':'negative'}">${(l.balance||0).toFixed(2)}</td>`); html+='</tbody></table></div>'; document.getElementById('ledger-result').innerHTML=html;}catch(e){document.getElementById('ledger-result').innerHTML=`<div style="color:red;">⚠️ ${e.message}</div>`;}}); } catch(e){ document.getElementById('tab-content').innerHTML=`<div class="card" style="color:red;">⚠️ ${e.message}</div>`; } }
async function loadCustomerStatementForm() { try{ const custs=await apiCall('/customers','GET'); const opts=custs.map(c=>`<option value="${c.id}">${c.name}</option>`).join(''); document.getElementById('tab-content').innerHTML=`<div class="card"><button class="btn-secondary" onclick="loadReports()">🔙 رجوع</button><h3>كشف حساب عميل</h3><select id="stmt-cust" class="input-field">${opts}</select><button id="btn-stmt-cust" class="btn-primary">عرض الكشف</button><div id="stmt-result"></div></div>`; document.getElementById('btn-stmt-cust').addEventListener('click',async()=>{const id=document.getElementById('stmt-cust').value; if(!id)return; try{const lines=await apiCall(`/reports?type=customer_statement&customer_id=${id}`,'GET'); let html='<div class="report-table-wrapper"><table class="report-table"><thead><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>'; lines.forEach(l=>html+=`<tr><td>${l.date||''}</td><td>${l.description||''}</td><td>${(l.debit||0).toFixed(2)}</td><td>${(l.credit||0).toFixed(2)}</td><td class="${(l.balance||0)>=0?'positive':'negative'}">${(l.balance||0).toFixed(2)}</td>`); html+='</tbody></table></div>'; document.getElementById('stmt-result').innerHTML=html;}catch(e){document.getElementById('stmt-result').innerHTML=`<div style="color:red;">⚠️ ${e.message}</div>`;}}); } catch(e){ document.getElementById('tab-content').innerHTML=`<div class="card" style="color:red;">⚠️ ${e.message}</div>`; } }
async function loadSupplierStatementForm() { try{ const supps=await apiCall('/suppliers','GET'); const opts=supps.map(s=>`<option value="${s.id}">${s.name}</option>`).join(''); document.getElementById('tab-content').innerHTML=`<div class="card"><button class="btn-secondary" onclick="loadReports()">🔙 رجوع</button><h3>كشف حساب مورد</h3><select id="stmt-supp" class="input-field">${opts}</select><button id="btn-stmt-supp" class="btn-primary">عرض الكشف</button><div id="stmt-result"></div></div>`; document.getElementById('btn-stmt-supp').addEventListener('click',async()=>{const id=document.getElementById('stmt-supp').value; if(!id)return; try{const lines=await apiCall(`/reports?type=supplier_statement&supplier_id=${id}`,'GET'); let html='<div class="report-table-wrapper"><table class="report-table"><thead><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>'; lines.forEach(l=>html+=`<tr><td>${l.date||''}</td><td>${l.description||''}</td><td>${(l.debit||0).toFixed(2)}</td><td>${(l.credit||0).toFixed(2)}</td><td class="${(l.balance||0)>=0?'positive':'negative'}">${(l.balance||0).toFixed(2)}</td>`); html+='</tbody></table></div>'; document.getElementById('stmt-result').innerHTML=html;}catch(e){document.getElementById('stmt-result').innerHTML=`<div style="color:red;">⚠️ ${e.message}</div>`;}}); } catch(e){ document.getElementById('tab-content').innerHTML=`<div class="card" style="color:red;">⚠️ ${e.message}</div>`; } }
function showHelpModal() {
  lockBodyScroll();
  const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
  const container = document.createElement('div'); container.className = 'modal-box';
  container.innerHTML = `<h3>📚 مركز المساعدة</h3><p>مرحباً بك في نظام الراجحي للمحاسبة. يمكنك:</p><ul><li>إدارة المواد والعملاء والموردين</li><li>إنشاء فواتير المبيعات والمشتريات</li><li>تسجيل الدفعات والمصاريف</li><li>عرض التقارير المالية المتكاملة</li><li>إرسال الفواتير PDF إلى التيليجرام</li></ul><p>للدعم: @bukamal1991</p><div class="modal-actions"><button class="btn-primary" id="close-help">حسناً</button></div>`;
  overlay.appendChild(container);
  document.body.appendChild(overlay);
  const closeModal = () => { if (document.body.contains(overlay)) document.body.removeChild(overlay); unlockBodyScroll(); };
  document.getElementById('close-help').onclick = closeModal;
}
// إخفاء التبويبات عند التمرير للأسفل
(function() {
  const nav = document.querySelector('nav');
  if (!nav) return;
  let lastScrollY = window.scrollY, ticking = false;
  function onScroll() {
    const currentScrollY = window.scrollY;
    if (currentScrollY > 70 && currentScrollY > lastScrollY) nav.classList.add('nav-hidden');
    else if (currentScrollY < lastScrollY) nav.classList.remove('nav-hidden');
    lastScrollY = currentScrollY; ticking = false;
  }
  window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } });
})();

// ربط التبويبات (النقر)
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const tname = tab.dataset.tab;
    if (tname === 'dashboard') loadDashboard();
    else if (tname === 'items') loadItems();
    else if (tname === 'sale-invoice') showInvoiceModal('sale');
    else if (tname === 'purchase-invoice') showInvoiceModal('purchase');
    else if (tname === 'customers') loadGenericSection(getSectionOptions('/customers'));
    else if (tname === 'suppliers') loadGenericSection(getSectionOptions('/suppliers'));
    else if (tname === 'categories') loadGenericSection(getSectionOptions('/definitions?type=category'));
    else if (tname === 'payments') loadPayments();
    else if (tname === 'expenses') loadExpenses();
    else if (tname === 'invoices') loadInvoices();
    else if (tname === 'reports') loadReports();
  });
});

// سحب وإفلات التبويبات (دون تعطيل النقر)
(function () {
  const nav = document.querySelector('nav');
  if (!nav) return;
  let dragInfo = null;
  const THRESHOLD = 5;

  function getPos(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return clientX;
  }
  function findTarget(x) {
    const tabs = Array.from(nav.querySelectorAll('.tab:not(.dragging)'));
    for (let tab of tabs) {
      const rect = tab.getBoundingClientRect();
      if (x < rect.left + rect.width / 2) return tab;
    }
    return null;
  }

  function onStart(e) {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    const startX = getPos(e);
    dragInfo = { tab, startX, moved: false, startXorig: startX };
    tab.classList.add('dragging');
    tab.style.opacity = '0.6';
    tab.style.zIndex = '1000';
  }

  function onMove(e) {
    if (!dragInfo) return;
    const x = getPos(e);
    if (Math.abs(x - dragInfo.startX) < THRESHOLD && !dragInfo.moved) return;
    if (!dragInfo.moved) {
      dragInfo.moved = true;
      const placeholder = document.createElement('div');
      placeholder.className = 'tab-placeholder';
      const style = getComputedStyle(dragInfo.tab);
      placeholder.style.width = style.width;
      placeholder.style.height = style.height;
      placeholder.style.flexShrink = '0';
      placeholder.style.border = '2px dashed var(--primary)';
      placeholder.style.borderRadius = '40px';
      placeholder.style.background = 'transparent';
      dragInfo.placeholder = placeholder;
      nav.insertBefore(placeholder, dragInfo.tab);
    }
    const target = findTarget(x);
    if (target && target !== dragInfo.placeholder) {
      nav.insertBefore(dragInfo.placeholder, target);
    } else if (!target && dragInfo.placeholder) {
      nav.appendChild(dragInfo.placeholder);
    }
  }

  function onEnd(e) {
    if (!dragInfo) return;
    if (dragInfo.moved && dragInfo.placeholder) {
      nav.insertBefore(dragInfo.tab, dragInfo.placeholder);
      dragInfo.placeholder.remove();
      const order = Array.from(nav.querySelectorAll('.tab')).map(t => t.dataset.tab);
      localStorage.setItem('tabOrder', JSON.stringify(order));
    }
    dragInfo.tab.classList.remove('dragging');
    dragInfo.tab.style.opacity = '1';
    dragInfo.tab.style.zIndex = '';
    if (dragInfo.placeholder) dragInfo.placeholder.remove();
    dragInfo = null;
  }

  nav.addEventListener('touchstart', onStart, { passive: false });
  nav.addEventListener('touchmove', onMove, { passive: false });
  nav.addEventListener('touchend', onEnd);
  nav.addEventListener('mousedown', onStart);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onEnd);

  try {
    const saved = JSON.parse(localStorage.getItem('tabOrder'));
    if (saved && Array.isArray(saved)) {
      saved.forEach(id => {
        const el = nav.querySelector(`.tab[data-tab="${id}"]`);
        if (el) nav.appendChild(el);
      });
    }
  } catch {}

  if (!document.getElementById('drag-styles')) {
    const style = document.createElement('style');
    style.id = 'drag-styles';
    style.textContent = `.tab.dragging { opacity: 0.6; transition: none; } .tab-placeholder { transition: all 0.2s; } .tab { user-select: none; touch-action: none; }`;
    document.head.appendChild(style);
  }
})();
async function verifyUser() {
  try {
    const data = await apiCall('/verify', 'POST');
    if (data.verified) {
      document.getElementById('user-name').textContent = user.first_name;
      document.getElementById('loading').style.display = 'none';
      document.getElementById('main').style.display = 'block';
      [itemsCache, customersCache, suppliersCache, invoicesCache, categoriesCache, unitsCache] = await Promise.all([
        apiCall('/items', 'GET'), apiCall('/customers', 'GET'), apiCall('/suppliers', 'GET'),
        apiCall('/invoices', 'GET'), apiCall('/definitions?type=category', 'GET'), apiCall('/definitions?type=unit', 'GET')
      ]);
      loadDashboard();
      document.getElementById('btn-help').addEventListener('click', showHelpModal);
    } else showError(data.error || 'غير مصرح');
  } catch (err) { showError(err.message); }
}
verifyUser();
