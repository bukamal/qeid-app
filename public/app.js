/* ============================================
   الراجحي للمحاسبة - المنطق المحسّن v2
   ============================================ */

const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// تطبيق ثيم التلغرام
function applyTheme() {
  if (tg.colorScheme === 'dark') document.body.classList.add('dark');
  else document.body.classList.remove('dark');
}
applyTheme();
tg.onEvent('themeChanged', applyTheme);

const initData = tg.initData;
const user = tg.initDataUnsafe?.user;
const apiBase = '/api';

// ========== التخزين المؤقت ==========
const cache = {};
const CACHE_DURATION = 60000;
function getCached(key) {
  const entry = cache[key];
  if (entry && Date.now() - entry.time < CACHE_DURATION) return entry.data;
  delete cache[key];
  return null;
}
function setCache(key, data) { cache[key] = { data, time: Date.now() }; }
function invalidateCache(pattern) {
  Object.keys(cache).forEach(k => {
    if (k.includes(pattern)) delete cache[k];
  });
}

let customersCache = [], suppliersCache = [], itemsCache = [], categoriesCache = [], invoicesCache = [], unitsCache = [];

// ========== إدارة التمرير (الحل النهائي) ==========
let scrollLockPos = 0;
function lockScroll() {
  scrollLockPos = window.scrollY || document.documentElement.scrollTop;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollLockPos}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
  document.body.classList.add('scroll-locked');
}
function unlockScroll() {
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  document.body.classList.remove('scroll-locked');
  window.scrollTo(0, scrollLockPos);
}

// ========== الإشعارات (Toast) ==========
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
  toast.textContent = `${icon} ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ========== المودال الموحد ==========
function openModal({ title, bodyHTML, footerHTML = '', onClose, size = 'md' }) {
  const portal = document.getElementById('modal-portal');
  const existing = portal.querySelector('.modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" data-size="${size}">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" aria-label="إغلاق">×</button>
      </div>
      <div class="modal-body">${bodyHTML}</div>
      ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
    </div>
  `;
  portal.appendChild(overlay);
  lockScroll();

  const box = overlay.querySelector('.modal-box');
  const closeBtn = overlay.querySelector('.modal-close');

  function close() {
    overlay.style.animation = 'fadeIn 0.2s ease reverse';
    box.style.animation = 'slideUp 0.2s ease reverse';
    setTimeout(() => {
      overlay.remove();
      unlockScroll();
      if (onClose) onClose();
    }, 180);
  }

  closeBtn.onclick = close;
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });

  // منع تسرب التمرير
  overlay.addEventListener('touchmove', e => {
    const modalBody = overlay.querySelector('.modal-body');
    if (!modalBody.contains(e.target)) {
      e.preventDefault();
    }
  }, { passive: false });

  // إغلاق بزر الرجوع
  const handleEsc = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', handleEsc, { once: true });

  return { close, element: overlay };
}

function confirmDialog(message) {
  return new Promise(resolve => {
    const modal = openModal({
      title: 'تأكيد',
      bodyHTML: `<p style="font-size:15px;line-height:1.7;">${message}</p>`,
      footerHTML: `
        <button class="btn btn-secondary" id="confirm-cancel">إلغاء</button>
        <button class="btn btn-danger" id="confirm-ok">تأكيد</button>
      `,
      onClose: () => resolve(false)
    });
    modal.element.querySelector('#confirm-cancel').onclick = () => { modal.close(); resolve(false); };
    modal.element.querySelector('#confirm-ok').onclick = () => { modal.close(); resolve(true); };
  });
}

// ========== استدعاء API ==========
async function apiCall(endpoint, method = 'GET', body = {}) {
  let url = apiBase + endpoint;
  if (method === 'GET' || method === 'DELETE') {
    const sep = url.includes('?') ? '&' : '?';
    url += `${sep}initData=${encodeURIComponent(initData)}`;
  }

  if (method === 'GET') {
    const cached = getCached(url);
    if (cached) return cached;
  }

  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (method !== 'GET' && method !== 'DELETE') {
    options.body = JSON.stringify({ ...body, initData });
  }

  const res = await fetch(url, options);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `خطأ ${res.status}`);

  if (method === 'GET') setCache(url, json);

  // إبطال ذاكرة التخزين المؤقت بعد التعديلات
  if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
    const base = endpoint.split('?')[0].split('/')[1];
    invalidateCache('/' + base);
    if (base === 'definitions') {
      invalidateCache('/definitions');
    }
    // تحديث الكاش الرئيسي
    if (base === 'invoices') invoicesCache = await apiCall('/invoices', 'GET');
    if (base === 'items') itemsCache = await apiCall('/items', 'GET');
    if (base === 'customers') customersCache = await apiCall('/customers', 'GET');
    if (base === 'suppliers') suppliersCache = await apiCall('/suppliers', 'GET');
    if (base === 'payments') { /* payments لا GET cache */ }
    if (base === 'expenses') { /* expenses لا GET cache */ }
  }
  return json;
}

// ========== نماذج عامة ==========
function showFormModal({ title, fields, initialValues = {}, onSave, onSuccess }) {
  let body = '';
  fields.forEach(f => {
    const val = initialValues[f.id] !== undefined ? initialValues[f.id] : '';
    if (f.type === 'select') {
      body += `
        <div class="form-group">
          <label class="form-label">${f.label}</label>
          <select class="select" id="fm-${f.id}">${f.options}</select>
        </div>`;
    } else if (f.type === 'textarea') {
      body += `
        <div class="form-group">
          <label class="form-label">${f.label}</label>
          <textarea class="textarea" id="fm-${f.id}" placeholder="${f.placeholder || ''}">${val}</textarea>
        </div>`;
    } else {
      body += `
        <div class="form-group">
          <label class="form-label">${f.label}</label>
          <input class="input" id="fm-${f.id}" type="${f.type || 'text'}" placeholder="${f.placeholder || ''}" value="${val}">
        </div>`;
    }
  });

  const modal = openModal({
    title,
    bodyHTML: body,
    footerHTML: `
      <button class="btn btn-secondary" id="fm-cancel">إلغاء</button>
      <button class="btn btn-primary" id="fm-save">حفظ</button>
    `
  });

  modal.element.querySelector('#fm-cancel').onclick = () => modal.close();
  modal.element.querySelector('#fm-save').onclick = async () => {
    const values = {};
    fields.forEach(f => {
      const el = modal.element.querySelector(`#fm-${f.id}`);
      if (el) values[f.id] = el.value.trim();
    });
    try {
      const btn = modal.element.querySelector('#fm-save');
      btn.disabled = true;
      btn.textContent = 'جاري الحفظ...';
      const result = await onSave(values);
      if (result && result.error) throw new Error(result.error.message || result.error);
      modal.close();
      showToast('تم الحفظ بنجاح', 'success');
      if (onSuccess) onSuccess();
    } catch (e) {
      showToast(e.message, 'error');
      const btn = modal.element.querySelector('#fm-save');
      btn.disabled = false;
      btn.textContent = 'حفظ';
    }
  };
}

// ========== التبويبات والتنقل ==========
const tabTitles = {
  dashboard: 'لوحة التحكم',
  items: 'المواد',
  'sale-invoice': 'فاتورة بيع',
  'purchase-invoice': 'فاتورة شراء',
  customers: 'العملاء',
  suppliers: 'الموردين',
  categories: 'التصنيفات',
  payments: 'الدفعات',
  expenses: 'المصاريف',
  invoices: 'الفواتير',
  reports: 'التقارير'
};

function setActiveTab(tabName) {
  document.querySelectorAll('.nav-item, .bottom-item').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tabName);
  });
  document.getElementById('page-title').textContent = tabTitles[tabName] || '';
}

function navigateTo(tabName) {
  setActiveTab(tabName);
  // إغلاق القائمة المزيد
  document.getElementById('more-menu').style.display = 'none';
  // إغلاق السايدبار في الموبايل
  document.getElementById('sidebar').classList.remove('open');

  switch (tabName) {
    case 'dashboard': loadDashboard(); break;
    case 'items': loadItems(); break;
    case 'sale-invoice': showInvoiceModal('sale'); break;
    case 'purchase-invoice': showInvoiceModal('purchase'); break;
    case 'customers': loadGenericSection(getSectionOptions('/customers')); break;
    case 'suppliers': loadGenericSection(getSectionOptions('/suppliers')); break;
    case 'categories': loadGenericSection(getSectionOptions('/definitions?type=category')); break;
    case 'payments': loadPayments(); break;
    case 'expenses': loadExpenses(); break;
    case 'invoices': loadInvoices(); break;
    case 'reports': loadReports(); break;
    case 'more': showMoreMenu(); break;
  }
}

function showMoreMenu() {
  const menu = document.getElementById('more-menu');
  menu.style.display = 'flex';
  lockScroll();
}

// مستمعو الأحداث للتبويبات
document.querySelectorAll('.nav-item, .bottom-item').forEach(btn => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.tab));
});

document.querySelectorAll('.sheet-item').forEach(btn => {
  btn.addEventListener('click', () => {
    unlockScroll();
    navigateTo(btn.dataset.tab);
  });
});

document.querySelector('.sheet-backdrop').addEventListener('click', () => {
  document.getElementById('more-menu').style.display = 'none';
  unlockScroll();
});

document.getElementById('menu-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ========== المواد ==========
async function loadItems() {
  try {
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">المواد</h3>
          <button class="btn btn-primary btn-sm" id="btn-add-item">+ إضافة</button>
        </div>
        <input type="text" class="input" id="items-search" placeholder="🔍 البحث في المواد...">
      </div>
      <div id="items-list"></div>
    `;
    document.getElementById('btn-add-item').addEventListener('click', showAddItemModal);
    document.getElementById('items-search').addEventListener('input', renderFilteredItems);
    renderFilteredItems();
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:var(--color-danger)">⚠️ ${err.message}</div>`;
  }
}

function renderFilteredItems() {
  const q = (document.getElementById('items-search')?.value || '').trim().toLowerCase();
  const filtered = itemsCache.filter(i => (i.name || '').toLowerCase().includes(q));
  const container = document.getElementById('items-list');
  if (!filtered.length) {
    container.innerHTML = '<div class="card" style="text-align:center;color:var(--color-text-muted)">لا توجد مواد مطابقة</div>';
    return;
  }
  let html = '<div class="table-wrap"><table class="table"><thead><tr><th>المادة</th><th>متوفر</th><th>القيمة</th></tr></thead><tbody>';
  filtered.forEach(item => {
    html += `<tr onclick="showItemDetail(${item.id})">
      <td><strong>${item.name}</strong><br><small style="color:var(--color-text-muted)">${item.category?.name || 'بدون تصنيف'}</small></td>
      <td>${item.available ?? 0}</td>
      <td>${Math.round(item.total_value ?? 0).toLocaleString()}</td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function showItemDetail(itemId) {
  const item = itemsCache.find(i => i.id === itemId);
  if (!item) return;
  openModal({
    title: item.name,
    bodyHTML: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
        <div><div class="form-label">الكمية المشتراة</div><div style="font-weight:700">${item.purchase_qty ?? 0}</div></div>
        <div><div class="form-label">الكمية المباعة</div><div style="font-weight:700">${item.sale_qty ?? 0}</div></div>
        <div><div class="form-label">المتوفرة</div><div style="font-weight:700;font-size:18px;color:var(--color-primary)">${item.available ?? 0}</div></div>
        <div><div class="form-label">القيمة الإجمالية</div><div style="font-weight:700">${(item.total_value ?? 0).toFixed(2)}</div></div>
        <div><div class="form-label">سعر الشراء</div><div>${item.purchase_price}</div></div>
        <div><div class="form-label">سعر البيع</div><div>${item.selling_price}</div></div>
      </div>
      <div class="form-label">التصنيف</div>
      <p>${item.category?.name || 'بدون تصنيف'}</p>
    `,
    footerHTML: `
      <button class="btn btn-secondary" onclick="closeCurrentModal();showEditItemModal(${item.id})">✏️ تعديل</button>
      <button class="btn btn-danger" onclick="closeCurrentModal();deleteItem(${item.id})">🗑️ حذف</button>
    `
  });
}

let currentModal = null;
function closeCurrentModal() { if (currentModal) currentModal.close(); }

async function deleteItem(id) {
  if (!await confirmDialog('متأكد من حذف المادة؟')) return;
  try {
    await apiCall(`/items?id=${id}`, 'DELETE');
    showToast('تم الحذف', 'success');
    loadItems();
  } catch (e) { showToast(e.message, 'error'); }
}

function showAddItemModal() {
  const catOpts = categoriesCache.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  showFormModal({
    title: 'إضافة مادة',
    fields: [
      { id: 'name', label: 'اسم المادة' },
      { id: 'category_id', label: 'التصنيف', type: 'select', options: `<option value="">بدون تصنيف</option>${catOpts}` },
      { id: 'item_type', label: 'نوع المادة', type: 'select', options: '<option value="مخزون">مخزون</option><option value="منتج نهائي">منتج نهائي</option><option value="خدمة">خدمة</option>' },
      { id: 'unit', label: 'وحدة القياس', placeholder: 'قطعة، صندوق...' },
      { id: 'purchase_price', label: 'سعر الشراء', type: 'number', placeholder: '0' },
      { id: 'selling_price', label: 'سعر البيع', type: 'number', placeholder: '0' }
    ],
    onSave: async (values) => {
      const payload = {
        ...values,
        category_id: values.category_id || null,
        purchase_price: parseFloat(values.purchase_price) || 0,
        selling_price: parseFloat(values.selling_price) || 0
      };
      if (itemsCache.some(i => i.name.toLowerCase() === payload.name.toLowerCase())) {
        throw new Error('توجد مادة بنفس الاسم');
      }
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
      { id: 'item_type', label: 'نوع المادة', type: 'select', options: '<option value="مخزون">مخزون</option><option value="منتج نهائي">منتج نهائي</option><option value="خدمة">خدمة</option>' },
      { id: 'unit', label: 'وحدة القياس' },
      { id: 'purchase_price', label: 'سعر الشراء', type: 'number' },
      { id: 'selling_price', label: 'سعر البيع', type: 'number' }
    ],
    initialValues: {
      name: it.name, category_id: it.category_id || '', item_type: it.item_type || 'مخزون',
      unit: it.unit || '', purchase_price: it.purchase_price, selling_price: it.selling_price
    },
    onSave: values => apiCall('/items', 'PUT', {
      id: itemId, ...values, category_id: values.category_id || null,
      purchase_price: parseFloat(values.purchase_price) || 0,
      selling_price: parseFloat(values.selling_price) || 0
    }),
    onSuccess: () => loadItems()
  });
}

// ========== الأقسام العامة ==========
let g_currentSection = null;

function buildGenericItemHtml(item, opts) {
  let info = opts.extraFields.map(f => {
    const val = item[f.key];
    if (val === undefined || val === null) return '';
    return `<span style="color:var(--color-text-muted);font-size:13px;">${f.prefix || ''}${val}</span>`;
  }).filter(Boolean).join(' · ');
  return `
    <div class="card card-hover">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div style="font-weight:700;margin-bottom:4px;">${item[opts.nameField]}</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">${info}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button class="btn btn-secondary btn-sm edit-btn" data-id="${item[opts.idField]}" data-type="${opts.apiBase}">تعديل</button>
          <button class="btn btn-danger btn-sm delete-btn" data-id="${item[opts.idField]}" data-type="${opts.apiBase}">حذف</button>
        </div>
      </div>
    </div>`;
}

async function loadGenericSection(options) {
  g_currentSection = options;
  try {
    let html = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${options.titlePlural || options.title}</h3>
          <button class="btn btn-primary btn-sm add-btn" data-type="${options.apiBase}">+ إضافة</button>
        </div>
      </div>`;
    if (!options.cache || !options.cache.length) {
      html += `<div class="card" style="text-align:center;color:var(--color-text-muted)">لا يوجد ${options.title}</div>`;
    } else {
      options.cache.forEach(item => { html += buildGenericItemHtml(item, options); });
    }
    document.getElementById('tab-content').innerHTML = html;
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:var(--color-danger)">⚠️ ${err.message}</div>`;
  }
}

function getSectionOptions(key) {
  const map = {
    '/customers': {
      cache: customersCache, title: 'عميل', titlePlural: 'العملاء', apiBase: '/customers', idField: 'id', nameField: 'name',
      extraFields: [{ key: 'balance', prefix: 'الرصيد: ' }, { key: 'phone', prefix: '📞 ' }],
      addFields: [
        { id: 'name', label: 'الاسم', placeholder: 'اسم العميل' },
        { id: 'phone', label: 'الهاتف', placeholder: 'رقم الهاتف' },
        { id: 'address', label: 'العنوان', placeholder: 'العنوان' }
      ],
      editFields: [
        { id: 'name', label: 'الاسم' },
        { id: 'phone', label: 'الهاتف' },
        { id: 'address', label: 'العنوان' }
      ],
      prepareAdd: v => ({ name: v.name, phone: v.phone || null, address: v.address || null }),
      prepareEdit: (id, v) => ({ id, name: v.name, phone: v.phone || null, address: v.address || null })
    },
    '/suppliers': {
      cache: suppliersCache, title: 'مورد', titlePlural: 'الموردين', apiBase: '/suppliers', idField: 'id', nameField: 'name',
      extraFields: [{ key: 'balance', prefix: 'الرصيد: ' }, { key: 'phone', prefix: '📞 ' }],
      addFields: [
        { id: 'name', label: 'الاسم', placeholder: 'اسم المورد' },
        { id: 'phone', label: 'الهاتف', placeholder: 'رقم الهاتف' },
        { id: 'address', label: 'العنوان', placeholder: 'العنوان' }
      ],
      editFields: [
        { id: 'name', label: 'الاسم' },
        { id: 'phone', label: 'الهاتف' },
        { id: 'address', label: 'العنوان' }
      ],
      prepareAdd: v => ({ name: v.name, phone: v.phone || null, address: v.address || null }),
      prepareEdit: (id, v) => ({ id, name: v.name, phone: v.phone || null, address: v.address || null })
    },
    '/definitions?type=category': {
      cache: categoriesCache, title: 'تصنيف', titlePlural: 'التصنيفات', apiBase: '/definitions?type=category', idField: 'id', nameField: 'name',
      extraFields: [],
      addFields: [{ id: 'name', label: 'اسم التصنيف', placeholder: 'اسم التصنيف' }],
      editFields: [{ id: 'name', label: 'اسم التصنيف' }],
      prepareAdd: v => ({ type: 'category', name: v.name }),
      prepareEdit: (id, v) => ({ type: 'category', id, name: v.name })
    },
    '/definitions?type=unit': {
      cache: unitsCache, title: 'وحدة', titlePlural: 'وحدات القياس', apiBase: '/definitions?type=unit', idField: 'id', nameField: 'name',
      extraFields: [{ key: 'abbreviation', prefix: 'الاختصار: ' }],
      addFields: [
        { id: 'name', label: 'اسم الوحدة', placeholder: 'اسم الوحدة' },
        { id: 'abbreviation', label: 'الاختصار', placeholder: 'مثلاً: كغ' }
      ],
      editFields: [
        { id: 'name', label: 'الاسم' },
        { id: 'abbreviation', label: 'الاختصار' }
      ],
      prepareAdd: v => ({ type: 'unit', name: v.name, abbreviation: v.abbreviation || null }),
      prepareEdit: (id, v) => ({ type: 'unit', id, name: v.name, abbreviation: v.abbreviation || null })
    }
  };
  return map[key];
}

document.addEventListener('click', async (e) => {
  const t = e.target.closest('button');
  if (!t) return;

  if (t.classList.contains('add-btn')) {
    const key = t.dataset.type; const opts = getSectionOptions(key); if (!opts) return;
    showFormModal({
      title: `إضافة ${opts.title} جديد`,
      fields: opts.addFields,
      onSave: v => apiCall(opts.apiBase, 'POST', opts.prepareAdd(v)),
      onSuccess: () => loadGenericSection(opts)
    });
  }
  else if (t.classList.contains('edit-btn')) {
    const id = t.dataset.id, key = t.dataset.type, opts = getSectionOptions(key); if (!opts) return;
    const item = opts.cache.find(x => x[opts.idField] == id); if (!item) return;
    const init = {};
    opts.editFields.forEach(f => init[f.id] = item[f.id] !== undefined ? item[f.id] : '');
    showFormModal({
      title: `تعديل ${opts.title}`,
      fields: opts.editFields,
      initialValues: init,
      onSave: v => apiCall(opts.apiBase, 'PUT', opts.prepareEdit(id, v)),
      onSuccess: () => loadGenericSection(opts)
    });
  }
  else if (t.classList.contains('delete-btn')) {
    const id = t.dataset.id, key = t.dataset.type, opts = getSectionOptions(key); if (!opts) return;
    if (!await confirmDialog(`متأكد من حذف ${opts.title}؟`)) return;
    try {
      const delUrl = opts.apiBase.includes('?') ? `${opts.apiBase}&id=${id}` : `${opts.apiBase}?id=${id}`;
      await apiCall(delUrl, 'DELETE');
      showToast('تم الحذف', 'success');
      loadGenericSection(opts);
    } catch (err) { showToast(err.message, 'error'); }
  }
});

// ========== الفواتير ==========
async function showInvoiceModal(type) {
  try {
    const [customers, suppliers, items] = await Promise.all([
      apiCall('/customers', 'GET'), apiCall('/suppliers', 'GET'), apiCall('/items', 'GET')
    ]);
    itemsCache = items; customersCache = customers; suppliersCache = suppliers;

    const entOpts = type === 'sale'
      ? `<option value="cash">عميل نقدي</option>${customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}`
      : `<option value="cash">مورد نقدي</option>${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}`;

    const body = `
      <input type="hidden" id="inv-type" value="${type}">
      <div class="invoice-lines" id="inv-lines">
        <div class="line-row">
          <div class="form-group" style="grid-column:1/-1">
            <select class="select item-select"><option value="">اختر مادة</option>${items.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}</select>
          </div>
          <div class="form-group">
            <input type="number" step="any" class="input qty-input" placeholder="الكمية">
          </div>
          <div class="form-group">
            <input type="number" step="0.01" class="input price-input" placeholder="السعر">
          </div>
          <div class="form-group">
            <input type="number" step="0.01" class="input total-input" placeholder="الإجمالي" readonly style="background:var(--color-border-light)">
          </div>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" id="btn-add-line" style="width:auto;margin-bottom:16px;">+ إضافة بند</button>

      <div class="form-group">
        <label class="form-label">${type === 'sale' ? 'العميل' : 'المورد'}</label>
        <select class="select" id="inv-entity">${entOpts}</select>
      </div>
      <div class="form-group">
        <label class="form-label">التاريخ</label>
        <input type="date" class="input" id="inv-date" value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group">
        <label class="form-label">الرقم المرجعي</label>
        <input type="text" class="input" id="inv-ref">
      </div>
      <div class="form-group">
        <label class="form-label">ملاحظات</label>
        <textarea class="textarea" id="inv-notes"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">المبلغ المدفوع</label>
        <input type="number" step="0.01" class="input" id="inv-paid" placeholder="0">
      </div>
    `;

    const modal = openModal({
      title: `فاتورة ${type === 'sale' ? 'مبيعات' : 'مشتريات'}`,
      bodyHTML: body,
      footerHTML: `
        <button class="btn btn-secondary" id="inv-cancel">إلغاء</button>
        <button class="btn btn-primary" id="inv-save">حفظ الفاتورة</button>
      `
    });

    attachInvoiceEvents(type);

    modal.element.querySelector('#inv-cancel').onclick = () => modal.close();
    modal.element.querySelector('#inv-save').onclick = async () => {
      const itype = modal.element.querySelector('#inv-type').value;
      const entity = modal.element.querySelector('#inv-entity').value;
      let cust = null, supp = null;
      if (itype === 'sale') cust = entity === 'cash' ? null : entity;
      else supp = entity === 'cash' ? null : entity;

      const lines = [];
      const ids = new Set();
      let dup = false;
      modal.element.querySelectorAll('.line-row').forEach(row => {
        const id = row.querySelector('.item-select').value || null;
        if (id) { if (ids.has(id)) dup = true; ids.add(id); }
        const qty = parseFloat(row.querySelector('.qty-input').value) || 0;
        const price = parseFloat(row.querySelector('.price-input').value) || 0;
        const total = parseFloat(row.querySelector('.total-input').value) || 0;
        if (id || qty > 0) lines.push({ item_id: id, description: id ? '' : 'بند', quantity: qty, unit_price: price, total });
      });
      if (dup) return showToast('لا يمكن تكرار نفس المادة', 'error');
      if (!lines.length) return showToast('أضف بنداً واحداً على الأقل', 'error');

      try {
        const btn = modal.element.querySelector('#inv-save');
        btn.disabled = true; btn.textContent = 'جاري الحفظ...';
        await apiCall('/invoices', 'POST', {
          type: itype, customer_id: cust, supplier_id: supp,
          date: modal.element.querySelector('#inv-date').value,
          reference: modal.element.querySelector('#inv-ref').value.trim(),
          notes: modal.element.querySelector('#inv-notes').value.trim(),
          lines,
          paid_amount: parseFloat(modal.element.querySelector('#inv-paid').value) || 0
        });
        modal.close();
        showToast('تم حفظ الفاتورة', 'success');
        loadInvoices();
      } catch (e) { showToast(e.message, 'error'); }
    };
  } catch (err) { showToast(err.message, 'error'); }
}

function attachInvoiceEvents(invoiceType) {
  const container = document.getElementById('inv-lines');
  if (!container) return;

  function isDup(id, cur) {
    if (!id) return false;
    let found = false;
    container.querySelectorAll('.line-row').forEach(r => {
      if (r !== cur && r.querySelector('.item-select')?.value === id) found = true;
    });
    return found;
  }
  function autoFill(sel, pr) {
    const id = sel.value;
    if (!id) { pr.value = ''; return; }
    const item = itemsCache.find(i => i.id == id);
    if (item) {
      pr.value = (invoiceType === 'sale' ? item.selling_price : item.purchase_price) || 0;
      const row = sel.closest('.line-row');
      const qty = row.querySelector('.qty-input');
      const tot = row.querySelector('.total-input');
      if (qty && tot) tot.value = Math.round((parseFloat(qty.value) || 0) * (parseFloat(pr.value) || 0));
    }
  }
  function calc(row) {
    const qty = parseFloat(row.querySelector('.qty-input')?.value) || 0;
    const pr = parseFloat(row.querySelector('.price-input')?.value) || 0;
    const tot = row.querySelector('.total-input');
    if (tot) tot.value = Math.round(qty * pr);
  }

  container.querySelectorAll('.line-row').forEach(row => {
    const sel = row.querySelector('.item-select');
    const pr = row.querySelector('.price-input');
    if (sel && pr) autoFill(sel, pr);
    sel?.addEventListener('change', function() {
      if (isDup(this.value, this.closest('.line-row'))) {
        showToast('المادة مضافة مسبقاً', 'warning');
        this.value = ''; pr.value = ''; return;
      }
      autoFill(this, pr);
    });
    row.querySelector('.qty-input')?.addEventListener('input', () => calc(row));
    row.querySelector('.price-input')?.addEventListener('input', () => calc(row));
  });

  document.getElementById('btn-add-line')?.addEventListener('click', () => {
    const nl = document.createElement('div');
    nl.className = 'line-row';
    nl.innerHTML = `
      <div class="form-group" style="grid-column:1/-1">
        <select class="select item-select"><option value="">اختر مادة</option>${itemsCache.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}</select>
      </div>
      <div class="form-group"><input type="number" step="any" class="input qty-input" placeholder="الكمية"></div>
      <div class="form-group"><input type="number" step="0.01" class="input price-input" placeholder="السعر"></div>
      <div class="form-group"><input type="number" step="0.01" class="input total-input" placeholder="الإجمالي" readonly style="background:var(--color-border-light)"></div>
      <button class="line-remove">×</button>
    `;
    container.appendChild(nl);

    const sel = nl.querySelector('.item-select');
    const pr = nl.querySelector('.price-input');
    sel.addEventListener('change', function() {
      if (isDup(this.value, this.closest('.line-row'))) {
        showToast('المادة مضافة مسبقاً', 'warning');
        this.value = ''; pr.value = ''; return;
      }
      autoFill(this, pr);
    });
    nl.querySelector('.qty-input').addEventListener('input', () => calc(nl));
    nl.querySelector('.price-input').addEventListener('input', () => calc(nl));
    nl.querySelector('.line-remove').addEventListener('click', () => {
      if (container.querySelectorAll('.line-row').length > 1) nl.remove();
    });
  });
}

// ========== قائمة الفواتير ==========
async function loadInvoices() {
  try {
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">الفواتير</h3>
        </div>
        <div class="filter-bar">
          <button class="filter-pill active" data-filter="all">الكل</button>
          <button class="filter-pill" data-filter="sale">مبيعات</button>
          <button class="filter-pill" data-filter="purchase">مشتريات</button>
        </div>
        <input type="text" class="input" id="invoice-search" placeholder="🔍 البحث في الفواتير...">
      </div>
      <div id="invoices-list"></div>
    `;
    document.querySelectorAll('.filter-pill').forEach(tab => {
      tab.addEventListener('click', function() {
        document.querySelectorAll('.filter-pill').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        renderFilteredInvoices();
      });
    });
    document.getElementById('invoice-search').addEventListener('input', renderFilteredInvoices);
    renderFilteredInvoices();
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:var(--color-danger)">⚠️ ${err.message}</div>`;
  }
}

function renderFilteredInvoices() {
  const filt = document.querySelector('.filter-pill.active')?.dataset.filter || 'all';
  const q = (document.getElementById('invoice-search')?.value || '').trim().toLowerCase();
  let data = invoicesCache;
  if (filt !== 'all') data = data.filter(inv => inv.type === filt);
  if (q) data = data.filter(inv =>
    (inv.reference || '').includes(q) ||
    (inv.customer?.name || '').includes(q) ||
    (inv.supplier?.name || '').includes(q) ||
    String(inv.total).includes(q)
  );
  const container = document.getElementById('invoices-list');
  if (!data.length) {
    container.innerHTML = '<div class="card" style="text-align:center;color:var(--color-text-muted)">لا توجد فواتير مطابقة</div>';
    return;
  }
  let html = '';
  data.forEach(inv => {
    const typeLabel = inv.type === 'sale' ? 'بيع' : 'شراء';
    const entity = inv.customer?.name || inv.supplier?.name || 'نقدي';
    html += `
      <div class="card card-hover">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
          <div>
            <div style="font-weight:700">فاتورة ${typeLabel} ${inv.reference || ''}</div>
            <div style="font-size:13px;color:var(--color-text-muted)">${inv.date} · ${entity}</div>
          </div>
          <div style="font-weight:800;font-size:18px;color:var(--color-primary)">${Math.round(inv.total).toLocaleString()}</div>
        </div>
        <div style="display:flex;gap:12px;font-size:13px;color:var(--color-text-secondary);margin-bottom:12px;">
          <span>مدفوع: ${Math.round(inv.paid || 0).toLocaleString()}</span>
          <span style="color:var(--color-danger)">باقي: ${Math.round(inv.balance || 0).toLocaleString()}</span>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-secondary btn-sm edit-invoice-btn" data-id="${inv.id}">تعديل</button>
          <button class="btn btn-primary btn-sm print-invoice-btn" data-id="${inv.id}">طباعة</button>
          <button class="btn btn-primary btn-sm pdf-invoice-btn" data-id="${inv.id}">PDF</button>
          <button class="btn btn-danger btn-sm delete-invoice-btn" data-id="${inv.id}">حذف</button>
        </div>
      </div>`;
  });
  container.innerHTML = html;

  container.querySelectorAll('.edit-invoice-btn').forEach(b => b.addEventListener('click', e => {
    const inv = invoicesCache.find(i => i.id === parseInt(e.target.dataset.id));
    if (inv) showToast('التعديل قريباً', 'warning');
  }));
  container.querySelectorAll('.print-invoice-btn').forEach(b => b.addEventListener('click', e => {
    const inv = invoicesCache.find(i => i.id === parseInt(e.target.dataset.id));
    if (inv) printInvoice(inv);
  }));
  container.querySelectorAll('.pdf-invoice-btn').forEach(b => b.addEventListener('click', async e => {
    const id = parseInt(e.target.dataset.id);
    e.target.disabled = true; e.target.textContent = '⏳';
    try {
      await apiCall('/send-invoice-pdf', 'POST', { invoiceId: id });
      showToast('تم إرسال PDF إلى البوت', 'success');
    } catch (ex) { showToast('فشل الإرسال: ' + ex.message, 'error'); }
    finally { e.target.disabled = false; e.target.textContent = 'PDF'; }
  }));
  container.querySelectorAll('.delete-invoice-btn').forEach(b => b.addEventListener('click', e => deleteInvoice(parseInt(e.target.dataset.id))));
}

async function deleteInvoice(id) {
  if (!await confirmDialog('متأكد من حذف الفاتورة؟')) return;
  try {
    await apiCall(`/invoices?id=${id}`, 'DELETE');
    showToast('تم الحذف', 'success');
    loadInvoices();
  } catch (e) { showToast(e.message, 'error'); }
}

function printInvoice(invoice) {
  const rows = invoice.invoice_lines?.map(l =>
    `<tr><td>${l.item?.name || '-'}</td><td>${l.quantity}</td><td>${l.unit_price}</td><td>${l.total}</td></tr>`
  ).join('') || '';
  const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>فاتورة</title>
    <style>body{font-family:Cairo,sans-serif;padding:24px;max-width:700px;margin:0 auto}
    table{width:100%;border-collapse:collapse;margin:16px 0}
    th,td{border:1px solid #ddd;padding:10px;text-align:right}
    th{background:#f8fafc}
    .total{font-size:20px;font-weight:800;margin-top:16px}
    button{padding:10px 24px;background:#2563eb;color:white;border:none;border-radius:8px;cursor:pointer;font-family:inherit}
    </style></head><body>
    <h2>فاتورة ${invoice.type==='sale'?'بيع':'شراء'}</h2>
    <p>التاريخ: ${invoice.date} | المرجع: ${invoice.reference||'-'}</p>
    <p>${invoice.customer?.name?'العميل: '+invoice.customer.name:''}${invoice.supplier?.name?'المورد: '+invoice.supplier.name:''}</p>
    <table><thead><tr><th>المادة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="total">الإجمالي: ${Math.round(invoice.total)}</div>
    <p>مدفوع: ${Math.round(invoice.paid||0)} | باقي: ${Math.round(invoice.balance||0)}</p>
    <button onclick="window.print();setTimeout(()=>window.close(),500)">طباعة</button>
    </body></html>`;
  const w = window.open('', '_blank', 'width=800,height=600');
  if (w) { w.document.write(html); w.document.close(); }
  else showToast('الرجاء السماح بالنوافذ المنبثقة', 'warning');
}

// ========== المدفوعات ==========
async function loadPayments() {
  try {
    const [payments, invoices, customers, suppliers] = await Promise.all([
      apiCall('/payments', 'GET'), apiCall('/invoices', 'GET'),
      apiCall('/customers', 'GET'), apiCall('/suppliers', 'GET')
    ]);
    let html = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">الدفعات</h3>
          <button class="btn btn-primary btn-sm" id="btn-add-pmt">+ إضافة</button>
        </div>
      </div>`;
    if (!payments.length) html += '<div class="card" style="text-align:center;color:var(--color-text-muted)">لا توجد دفعات</div>';
    else {
      payments.forEach(p => {
        html += `
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-weight:700;font-size:18px;color:var(--color-success)">${parseFloat(p.amount).toLocaleString()}</div>
                <div style="font-size:13px;color:var(--color-text-muted)">${p.payment_date}</div>
              </div>
              <button class="btn btn-danger btn-sm" onclick="deletePayment(${p.id})">حذف</button>
            </div>
            <div style="margin-top:8px;font-size:13px;color:var(--color-text-secondary)">
              ${p.customer?.name ? 'العميل: ' + p.customer.name : ''}
              ${p.supplier?.name ? 'المورد: ' + p.supplier.name : ''}
              ${p.invoice ? '· فاتورة: ' + (p.invoice.type==='sale'?'بيع':'شراء') + ' ' + (p.invoice.reference||'') : ''}
              ${p.notes ? '<br>' + p.notes : ''}
            </div>
          </div>`;
      });
    }
    document.getElementById('tab-content').innerHTML = html;
    document.getElementById('btn-add-pmt')?.addEventListener('click', () => showAddPaymentModal(customers, suppliers, invoices));
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:var(--color-danger)">⚠️ ${err.message}</div>`;
  }
}

function showAddPaymentModal(customers, suppliers, invoices) {
  const body = `
    <div class="form-group">
      <label class="form-label">النوع</label>
      <select class="select" id="pmt-type"><option value="customer">من عميل</option><option value="supplier">إلى مورد</option></select>
    </div>
    <div class="form-group" id="pmt-cust-block">
      <label class="form-label">العميل</label>
      <select class="select" id="pmt-customer"><option value="">اختر عميل</option>${customers.map(c => `<option value="${c.id}">${c.name} (${c.balance})</option>`).join('')}</select>
    </div>
    <div class="form-group" id="pmt-supp-block" style="display:none">
      <label class="form-label">المورد</label>
      <select class="select" id="pmt-supplier"><option value="">اختر مورد</option>${suppliers.map(s => `<option value="${s.id}">${s.name} (${s.balance})</option>`).join('')}</select>
    </div>
    <div class="form-group">
      <label class="form-label">الفاتورة (اختياري)</label>
      <select class="select" id="pmt-invoice"><option value="">بدون فاتورة</option></select>
    </div>
    <div class="form-group">
      <label class="form-label">المبلغ</label>
      <input type="number" step="0.01" class="input" id="pmt-amount">
    </div>
    <div class="form-group">
      <label class="form-label">التاريخ</label>
      <input type="date" class="input" id="pmt-date" value="${new Date().toISOString().split('T')[0]}">
    </div>
    <div class="form-group">
      <label class="form-label">ملاحظات</label>
      <textarea class="textarea" id="pmt-notes"></textarea>
    </div>
  `;

  const modal = openModal({
    title: 'إضافة دفعة',
    bodyHTML: body,
    footerHTML: `
      <button class="btn btn-secondary" id="pmt-cancel">إلغاء</button>
      <button class="btn btn-primary" id="pmt-save">حفظ</button>
    `
  });

  const tSel = modal.element.querySelector('#pmt-type');
  const cBlock = modal.element.querySelector('#pmt-cust-block');
  const sBlock = modal.element.querySelector('#pmt-supp-block');
  const invSel = modal.element.querySelector('#pmt-invoice');
  const cSel = modal.element.querySelector('#pmt-customer');
  const sSel = modal.element.querySelector('#pmt-supplier');

  const updateInv = (type, eId) => {
    const filt = invoices.filter(inv => type === 'customer'
      ? inv.type === 'sale' && inv.customer_id == eId
      : inv.type === 'purchase' && inv.supplier_id == eId);
    invSel.innerHTML = '<option value="">بدون فاتورة</option>' +
      filt.map(inv => `<option value="${inv.id}">${inv.type==='sale'?'بيع':'شراء'} ${inv.reference||''} (${inv.total})</option>`).join('');
  };

  tSel.addEventListener('change', () => {
    if (tSel.value === 'customer') {
      cBlock.style.display = 'block'; sBlock.style.display = 'none';
      updateInv('customer', cSel.value);
    } else {
      cBlock.style.display = 'none'; sBlock.style.display = 'block';
      updateInv('supplier', sSel.value);
    }
  });
  cSel.addEventListener('change', () => updateInv('customer', cSel.value));
  sSel.addEventListener('change', () => updateInv('supplier', sSel.value));

  modal.element.querySelector('#pmt-cancel').onclick = () => modal.close();
  modal.element.querySelector('#pmt-save').onclick = async () => {
    const type = tSel.value;
    const cust = type === 'customer' ? (cSel.value || null) : null;
    const supp = type === 'supplier' ? (sSel.value || null) : null;
    const amount = parseFloat(modal.element.querySelector('#pmt-amount').value);
    if (!amount || amount <= 0) return showToast('المبلغ مطلوب', 'error');
    if (!cust && !supp) return showToast('اختر عميلاً أو مورداً', 'error');
    try {
      await apiCall('/payments', 'POST', {
        invoice_id: invSel.value || null, customer_id: cust, supplier_id: supp,
        amount, payment_date: modal.element.querySelector('#pmt-date').value,
        notes: modal.element.querySelector('#pmt-notes').value.trim()
      });
      modal.close();
      showToast('تم حفظ الدفعة', 'success');
      loadPayments();
    } catch (e) { showToast(e.message, 'error'); }
  };
}

async function deletePayment(id) {
  if (!await confirmDialog('متأكد من حذف الدفعة؟')) return;
  try {
    await apiCall(`/payments?id=${id}`, 'DELETE');
    showToast('تم الحذف', 'success');
    loadPayments();
  } catch (e) { showToast(e.message, 'error'); }
}

// ========== المصاريف ==========
async function loadExpenses() {
  try {
    const expenses = await apiCall('/expenses', 'GET');
    let html = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">المصاريف</h3>
          <button class="btn btn-primary btn-sm" id="btn-add-expense">+ إضافة</button>
        </div>
      </div>`;
    if (!expenses.length) html += '<div class="card" style="text-align:center;color:var(--color-text-muted)">لا توجد مصاريف</div>';
    else {
      expenses.forEach(ex => {
        html += `
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-weight:700;font-size:18px;color:var(--color-danger)">${parseFloat(ex.amount).toLocaleString()}</div>
                <div style="font-size:13px;color:var(--color-text-muted)">${ex.expense_date}</div>
              </div>
              <button class="btn btn-danger btn-sm" onclick="deleteExpense(${ex.id})">حذف</button>
            </div>
            ${ex.description ? `<div style="margin-top:8px;font-size:14px">${ex.description}</div>` : ''}
          </div>`;
      });
    }
    document.getElementById('tab-content').innerHTML = html;
    document.getElementById('btn-add-expense')?.addEventListener('click', showAddExpenseModal);
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:var(--color-danger)">⚠️ ${err.message}</div>`;
  }
}

function showAddExpenseModal() {
  showFormModal({
    title: 'إضافة مصروف',
    fields: [
      { id: 'amount', label: 'المبلغ', type: 'number', placeholder: '0' },
      { id: 'expense_date', label: 'التاريخ', type: 'date' },
      { id: 'description', label: 'الوصف', type: 'textarea', placeholder: 'وصف المصروف' }
    ],
    initialValues: { expense_date: new Date().toISOString().split('T')[0] },
    onSave: values => apiCall('/expenses', 'POST', { ...values, amount: parseFloat(values.amount) }),
    onSuccess: () => loadExpenses()
  });
}

async function deleteExpense(id) {
  if (!await confirmDialog('متأكد من حذف المصروف؟')) return;
  try {
    await apiCall(`/expenses?id=${id}`, 'DELETE');
    showToast('تم الحذف', 'success');
    loadExpenses();
  } catch (e) { showToast(e.message, 'error'); }
}

// ========== لوحة التحكم ==========
async function loadDashboard() {
  try {
    const data = await apiCall('/summary', 'GET');
    const totalSales = data.total_sales || 0;
    const totalPurchases = data.total_purchases || 0;

    let html = `
      <div class="stats-grid">
        <div class="stat-card profit">
          <div class="stat-label">صافي الربح</div>
          <div class="stat-value ${data.net_profit >= 0 ? 'positive' : 'negative'}">${data.net_profit.toFixed(2)}</div>
        </div>
        <div class="stat-card cash">
          <div class="stat-label">رصيد الصندوق</div>
          <div class="stat-value ${data.cash_balance >= 0 ? 'positive' : 'negative'}">${data.cash_balance.toFixed(2)}</div>
        </div>
        <div class="stat-card receivables">
          <div class="stat-label">الذمم المدينة</div>
          <div class="stat-value">${data.receivables.toFixed(2)}</div>
        </div>
        <div class="stat-card payables">
          <div class="stat-label">الذمم الدائنة</div>
          <div class="stat-value">${data.payables.toFixed(2)}</div>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-title">المبيعات vs المشتريات</div>
        <canvas id="incomeChart"></canvas>
      </div>
    `;

    if (data.monthly) {
      html += `
        <div class="chart-card">
          <div class="chart-title">الحركات المالية الشهرية</div>
          <canvas id="paymentsChart"></canvas>
        </div>
      `;
    }
    if (data.daily?.dates.length) {
      html += `
        <div class="chart-card">
          <div class="chart-title">الربح اليومي (آخر 30 يوم)</div>
          <canvas id="profitChart"></canvas>
        </div>
      `;
    }

    document.getElementById('tab-content').innerHTML = html;

    new Chart(document.getElementById('incomeChart'), {
      type: 'doughnut',
      data: {
        labels: ['مبيعات', 'مشتريات'],
        datasets: [{ data: [totalSales, totalPurchases], backgroundColor: ['#10b981', '#f59e0b'], borderWidth: 0 }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });

    if (data.monthly) {
      new Chart(document.getElementById('paymentsChart'), {
        type: 'bar',
        data: {
          labels: data.monthly.labels,
          datasets: [
            { label: 'وارد', data: data.monthly.payments_in, backgroundColor: '#3b82f6', borderRadius: 6 },
            { label: 'منصرف', data: data.monthly.payments_out, backgroundColor: '#ef4444', borderRadius: 6 }
          ]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } } }
      });
    }

    if (data.daily?.dates.length) {
      const last30 = data.daily.dates.slice(-30);
      const profits30 = data.daily.profits.slice(-30);
      new Chart(document.getElementById('profitChart'), {
        type: 'line',
        data: {
          labels: last30,
          datasets: [{
            label: 'صافي الربح',
            data: profits30,
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139,92,246,0.1)',
            tension: 0.3,
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 5
          }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } } }
      });
    }
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:var(--color-danger)">⚠️ ${err.message}</div>`;
  }
}

// ========== التقارير ==========
async function loadReports() {
  document.getElementById('tab-content').innerHTML = `
    <div class="card"><h3 class="card-title">التقارير المالية</h3></div>
    <div class="report-card" data-report="trial_balance"><div class="report-icon">📊</div><div class="report-info"><h4>ميزان المراجعة</h4><p>نظرة شاملة على الحسابات</p></div></div>
    <div class="report-card" data-report="income_statement"><div class="report-icon">📈</div><div class="report-info"><h4>قائمة الدخل</h4><p>الإيرادات والمصروفات والأرباح</p></div></div>
    <div class="report-card" data-report="balance_sheet"><div class="report-icon">⚖️</div><div class="report-info"><h4>الميزانية العمومية</h4><p>الأصول والخصوم وحقوق الملكية</p></div></div>
    <div class="report-card" data-report="account_ledger"><div class="report-icon">📒</div><div class="report-info"><h4>الأستاذ العام</h4><p>كشف حساب تفصيلي</p></div></div>
    <div class="report-card" data-report="customer_statement"><div class="report-icon">👤</div><div class="report-info"><h4>كشف حساب عميل</h4><p>حركات عميل محدد</p></div></div>
    <div class="report-card" data-report="supplier_statement"><div class="report-icon">🏭</div><div class="report-info"><h4>كشف حساب مورد</h4><p>حركات مورد محدد</p></div></div>
  `;
  document.querySelectorAll('.report-card').forEach(el => {
    el.addEventListener('click', () => {
      const r = el.dataset.report;
      if (r === 'trial_balance') loadTrialBalance();
      else if (r === 'income_statement') loadIncomeStatement();
      else if (r === 'balance_sheet') loadBalanceSheet();
      else if (r === 'account_ledger') loadAccountLedgerForm();
      else if (r === 'customer_statement') loadCustomerStatementForm();
      else if (r === 'supplier_statement') loadSupplierStatementForm();
    });
  });
}

async function loadTrialBalance() {
  try {
    const data = await apiCall('/reports?type=trial_balance', 'GET');
    const rows = data.map(r => `<tr><td>${r.name}</td><td>${r.total_debit.toFixed(2)}</td><td>${r.total_credit.toFixed(2)}</td><td class="${r.balance >= 0 ? 'positive' : 'negative'}">${r.balance.toFixed(2)}</td></tr>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn btn-secondary btn-sm" onclick="loadReports()" style="width:auto;margin-bottom:12px;">🔙 رجوع</button>
        <h3 class="card-title">ميزان المراجعة</h3>
        <div class="table-wrap"><table class="table"><thead><tr><th>الحساب</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>${rows}</tbody></table></div>
      </div>`;
  } catch (e) { showToast(e.message, 'error'); }
}

async function loadIncomeStatement() {
  try {
    const d = await apiCall('/reports?type=income_statement', 'GET');
    const iRows = d.income.map(i => `<tr><td>${i.name}</td><td>${i.balance.toFixed(2)}</td></tr>`).join('');
    const eRows = d.expenses.map(e => `<tr><td>${e.name}</td><td>${e.balance.toFixed(2)}</td></tr>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn btn-secondary btn-sm" onclick="loadReports()" style="width:auto;margin-bottom:12px;">🔙 رجوع</button>
        <h3 class="card-title">قائمة الدخل</h3>
        <h4 style="margin:16px 0 8px;font-size:14px;color:var(--color-text-muted)">الإيرادات</h4>
        <div class="table-wrap"><table class="table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${iRows}</tbody></table></div>
        <p style="font-weight:700;margin:8px 0">إجمالي الإيرادات: ${d.total_income.toFixed(2)}</p>
        <h4 style="margin:16px 0 8px;font-size:14px;color:var(--color-text-muted)">المصروفات</h4>
        <div class="table-wrap"><table class="table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${eRows}</tbody></table></div>
        <p style="font-weight:700;margin:8px 0">إجمالي المصروفات: ${d.total_expenses.toFixed(2)}</p>
        <hr style="border-color:var(--color-border);margin:16px 0">
        <h2 style="color:${d.net_profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">صافي الربح: ${d.net_profit.toFixed(2)}</h2>
      </div>`;
  } catch (e) { showToast(e.message, 'error'); }
}

async function loadBalanceSheet() {
  try {
    const d = await apiCall('/reports?type=balance_sheet', 'GET');
    const aRows = d.assets.map(a => `<tr><td>${a.name}</td><td>${a.balance.toFixed(2)}</td></tr>`).join('');
    const lRows = d.liabilities.map(l => `<tr><td>${l.name}</td><td>${l.balance.toFixed(2)}</td></tr>`).join('');
    const eRows = d.equity.map(e => `<tr><td>${e.name}</td><td>${e.balance.toFixed(2)}</td></tr>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn btn-secondary btn-sm" onclick="loadReports()" style="width:auto;margin-bottom:12px;">🔙 رجوع</button>
        <h3 class="card-title">الميزانية العمومية</h3>
        <h4 style="margin:16px 0 8px;font-size:14px;color:var(--color-text-muted)">الأصول</h4>
        <div class="table-wrap"><table class="table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${aRows}</tbody></table></div>
        <p style="font-weight:700;margin:8px 0">إجمالي الأصول: ${d.total_assets.toFixed(2)}</p>
        <h4 style="margin:16px 0 8px;font-size:14px;color:var(--color-text-muted)">الخصوم</h4>
        <div class="table-wrap"><table class="table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${lRows}</tbody></table></div>
        <p style="font-weight:700;margin:8px 0">إجمالي الخصوم: ${d.total_liabilities.toFixed(2)}</p>
        <h4 style="margin:16px 0 8px;font-size:14px;color:var(--color-text-muted)">حقوق الملكية</h4>
        <div class="table-wrap"><table class="table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${eRows}</tbody></table></div>
        <p style="font-weight:700;margin:8px 0">إجمالي حقوق الملكية: ${d.total_equity.toFixed(2)}</p>
      </div>`;
  } catch (e) { showToast(e.message, 'error'); }
}

async function loadAccountLedgerForm() {
  try {
    const accounts = await apiCall('/accounts', 'GET');
    const opts = accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn btn-secondary btn-sm" onclick="loadReports()" style="width:auto;margin-bottom:12px;">🔙 رجوع</button>
        <h3 class="card-title">الأستاذ العام</h3>
        <div class="form-group">
          <select class="select" id="ledger-account">${opts}</select>
        </div>
        <button class="btn btn-primary" id="btn-ledger" style="width:auto;">عرض الحركات</button>
        <div id="ledger-result" style="margin-top:16px"></div>
      </div>`;
    document.getElementById('btn-ledger').addEventListener('click', async () => {
      const id = document.getElementById('ledger-account').value;
      if (!id) return;
      try {
        const lines = await apiCall(`/reports?type=account_ledger&account_id=${id}`, 'GET');
        let html = '<div class="table-wrap"><table class="table"><thead><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>';
        lines.forEach(l => html += `<tr><td>${l.date || ''}</td><td>${l.description || ''}</td><td>${(l.debit || 0).toFixed(2)}</td><td>${(l.credit || 0).toFixed(2)}</td><td class="${(l.balance || 0) >= 0 ? 'positive' : 'negative'}">${(l.balance || 0).toFixed(2)}</td></tr>`);
        html += '</tbody></table></div>';
        document.getElementById('ledger-result').innerHTML = html;
      } catch (e) { showToast(e.message, 'error'); }
    });
  } catch (e) { showToast(e.message, 'error'); }
}

async function loadCustomerStatementForm() {
  try {
    const custs = await apiCall('/customers', 'GET');
    const opts = custs.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn btn-secondary btn-sm" onclick="loadReports()" style="width:auto;margin-bottom:12px;">🔙 رجوع</button>
        <h3 class="card-title">كشف حساب عميل</h3>
        <div class="form-group"><select class="select" id="stmt-cust">${opts}</select></div>
        <button class="btn btn-primary" id="btn-stmt-cust" style="width:auto;">عرض الكشف</button>
        <div id="stmt-result" style="margin-top:16px"></div>
      </div>`;
    document.getElementById('btn-stmt-cust').addEventListener('click', async () => {
      const id = document.getElementById('stmt-cust').value;
      if (!id) return;
      try {
        const lines = await apiCall(`/reports?type=customer_statement&customer_id=${id}`, 'GET');
        let html = '<div class="table-wrap"><table class="table"><thead><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>';
        lines.forEach(l => html += `<tr><td>${l.date || ''}</td><td>${l.description || ''}</td><td>${(l.debit || 0).toFixed(2)}</td><td>${(l.credit || 0).toFixed(2)}</td><td class="${(l.balance || 0) >= 0 ? 'positive' : 'negative'}">${(l.balance || 0).toFixed(2)}</td></tr>`);
        html += '</tbody></table></div>';
        document.getElementById('stmt-result').innerHTML = html;
      } catch (e) { showToast(e.message, 'error'); }
    });
  } catch (e) { showToast(e.message, 'error'); }
}

async function loadSupplierStatementForm() {
  try {
    const supps = await apiCall('/suppliers', 'GET');
    const opts = supps.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn btn-secondary btn-sm" onclick="loadReports()" style="width:auto;margin-bottom:12px;">🔙 رجوع</button>
        <h3 class="card-title">كشف حساب مورد</h3>
        <div class="form-group"><select class="select" id="stmt-supp">${opts}</select></div>
        <button class="btn btn-primary" id="btn-stmt-supp" style="width:auto;">عرض الكشف</button>
        <div id="stmt-result" style="margin-top:16px"></div>
      </div>`;
    document.getElementById('btn-stmt-supp').addEventListener('click', async () => {
      const id = document.getElementById('stmt-supp').value;
      if (!id) return;
      try {
        const lines = await apiCall(`/reports?type=supplier_statement&supplier_id=${id}`, 'GET');
        let html = '<div class="table-wrap"><table class="table"><thead><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>';
        lines.forEach(l => html += `<tr><td>${l.date || ''}</td><td>${l.description || ''}</td><td>${(l.debit || 0).toFixed(2)}</td><td>${(l.credit || 0).toFixed(2)}</td><td class="${(l.balance || 0) >= 0 ? 'positive' : 'negative'}">${(l.balance || 0).toFixed(2)}</td></tr>`);
        html += '</tbody></table></div>';
        document.getElementById('stmt-result').innerHTML = html;
      } catch (e) { showToast(e.message, 'error'); }
    });
  } catch (e) { showToast(e.message, 'error'); }
}

// ========== المساعدة ==========
function showHelpModal() {
  openModal({
    title: 'مركز المساعدة',
    bodyHTML: `
      <p style="margin-bottom:12px;line-height:1.8">مرحباً بك في <strong>نظام الراجحي للمحاسبة</strong>. يمكنك من خلال هذا النظام:</p>
      <ul style="line-height:2;padding-right:20px">
        <li>إدارة المواد والعملاء والموردين</li>
        <li>إنشاء فواتير المبيعات والمشتريات</li>
        <li>تسجيل الدفعات والمصاريف</li>
        <li>عرض التقارير المالية المتكاملة</li>
        <li>إرسال الفواتير PDF إلى التلغرام</li>
      </ul>
      <p style="margin-top:12px;color:var(--color-text-muted)">للدعم الفني: @bukamal1991</p>
    `
  });
}

document.getElementById('btn-help').addEventListener('click', showHelpModal);

// ========== بدء التطبيق ==========
async function verifyUser() {
  try {
    const data = await apiCall('/verify', 'POST');
    if (data.verified) {
      document.getElementById('user-name-sidebar').textContent = user?.first_name || '';
      document.getElementById('loading-screen').classList.add('hidden');

      [itemsCache, customersCache, suppliersCache, invoicesCache, categoriesCache, unitsCache] = await Promise.all([
        apiCall('/items', 'GET'), apiCall('/customers', 'GET'), apiCall('/suppliers', 'GET'),
        apiCall('/invoices', 'GET'), apiCall('/definitions?type=category', 'GET'), apiCall('/definitions?type=unit', 'GET')
      ]);
      loadDashboard();
    } else {
      document.getElementById('loading-screen').innerHTML = `<div style="color:var(--color-danger);font-size:18px">❌ ${data.error || 'غير مصرح'}</div>`;
    }
  } catch (err) {
    document.getElementById('loading-screen').innerHTML = `<div style="color:var(--color-danger);font-size:18px">❌ ${err.message}</div>`;
  }
}
verifyUser();
