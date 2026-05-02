/* ============================================
   الراجحي للمحاسبة - المنطق المحسّن v3 Pro
   ============================================ */

const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// ========== الأيقونات ==========
const ICONS = {
  home: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  box: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  cart: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
  download: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  users: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  factory: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22h20"/><path d="M4 22V10l4-2v14"/><path d="M12 22V8l4-2v16"/><path d="M20 22V4l-4 2v16"/></svg>',
  tag: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  wallet: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><path d="M16 10a4 4 0 0 1-4 4"/></svg>',
  dollar: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  fileText: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
  chart: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  check: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  x: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  alert: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  print: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
  file: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
};

// ========== الثيم ==========
function applyTheme() {
  if (tg.colorScheme === 'dark') document.body.classList.add('dark');
  else document.body.classList.remove('dark');
  tg.setHeaderColor(tg.colorScheme === 'dark' ? '#0b1120' : '#f1f5f9');
}
applyTheme();
tg.onEvent('themeChanged', applyTheme);

const initData = tg.initData;
const user = tg.initDataUnsafe?.user;
const apiBase = '/api';

// ========== دوال مساعدة ==========
function formatNumber(num) {
  if (num === undefined || num === null) return '0.00';
  return Number(num).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}
function debounce(fn, ms = 300) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// ========== التخزين المؤقت ==========
const cache = {}; const CACHE_DURATION = 60000;
function getCached(key) {
  const e = cache[key]; if (e && Date.now() - e.time < CACHE_DURATION) return e.data;
  delete cache[key]; return null;
}
function setCache(key, data) { cache[key] = { data, time: Date.now() }; }
function invalidateCache(pattern) { Object.keys(cache).forEach(k => { if (k.includes(pattern)) delete cache[k]; }); }

let customersCache = [], suppliersCache = [], itemsCache = [], categoriesCache = [], invoicesCache = [], unitsCache = [];

// ========== إدارة التمرير ==========
let scrollLockPos = 0;
function lockScroll() {
  scrollLockPos = window.scrollY || document.documentElement.scrollTop;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollLockPos}px`;
  document.body.style.width = '100%';
  document.body.classList.add('scroll-locked');
}
function unlockScroll() {
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  document.body.classList.remove('scroll-locked');
  window.scrollTo(0, scrollLockPos);
}

// ========== الإشعارات ==========
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  let iconSvg = ICONS.info;
  if (type === 'success') iconSvg = ICONS.check;
  if (type === 'error') iconSvg = ICONS.x;
  if (type === 'warning') iconSvg = ICONS.alert;
  toast.innerHTML = `<span class="toast-icon">${iconSvg}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ========== المودال ==========
let activeModal = null;
function openModal({ title, bodyHTML, footerHTML = '', onClose, size = 'md' }) {
  const portal = document.getElementById('modal-portal');
  if (activeModal) { activeModal.close(); }
  
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" data-size="${size}">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" aria-label="إغلاق">${ICONS.x}</button>
      </div>
      <div class="modal-body">${bodyHTML}</div>
      ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
    </div>
  `;
  portal.appendChild(overlay);
  lockScroll();
  activeModal = overlay;

  const box = overlay.querySelector('.modal-box');
  const closeBtn = overlay.querySelector('.modal-close');

  function close() {
    overlay.style.animation = 'fadeIn 0.2s ease reverse';
    box.style.animation = 'slideUp 0.25s ease reverse';
    setTimeout(() => {
      overlay.remove();
      if (activeModal === overlay) activeModal = null;
      unlockScroll();
      if (onClose) onClose();
    }, 200);
  }

  closeBtn.onclick = close;
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  
  const handleEsc = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', handleEsc, { once: true });

  return { close, element: overlay };
}

function confirmDialog(message) {
  return new Promise(resolve => {
    const modal = openModal({
      title: 'تأكيد العملية',
      bodyHTML: `<div style="display:flex;gap:12px;align-items:center;padding:8px 0;"><div style="color:var(--warning);flex-shrink:0;">${ICONS.alert}</div><p style="font-size:15px;line-height:1.7;">${message}</p></div>`,
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
async function apiCall(endpoint, method = 'GET', body = {}, retries = 1) {
  let url = apiBase + endpoint;
  if (method === 'GET' || method === 'DELETE') {
    const sep = url.includes('?') ? '&' : '?';
    url += `${sep}initData=${encodeURIComponent(initData)}`;
  }
  if (method === 'GET') { const c = getCached(url); if (c) return c; }

  const options = { method, headers: { 'Content-Type': 'application/json' } };
  if (method !== 'GET' && method !== 'DELETE') options.body = JSON.stringify({ ...body, initData });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    options.signal = controller.signal;
    
    const res = await fetch(url, options);
    clearTimeout(timeout);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `خطأ ${res.status}`);
    if (method === 'GET') setCache(url, json);
    
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      const base = endpoint.split('?')[0].split('/')[1];
      invalidateCache('/' + base);
      if (base === 'definitions') invalidateCache('/definitions');
      if (base === 'invoices') invoicesCache = await apiCall('/invoices', 'GET');
      if (base === 'items') itemsCache = await apiCall('/items', 'GET');
      if (base === 'customers') customersCache = await apiCall('/customers', 'GET');
      if (base === 'suppliers') suppliersCache = await apiCall('/suppliers', 'GET');
    }
    return json;
  } catch (err) {
    if (retries > 0 && err.name !== 'AbortError') return apiCall(endpoint, method, body, retries - 1);
    throw err;
  }
}
// ========== نماذج عامة ==========
function showFormModal({ title, fields, initialValues = {}, onSave, onSuccess }) {
  let body = '';
  fields.forEach(f => {
    const val = initialValues[f.id] !== undefined ? initialValues[f.id] : '';
    if (f.type === 'select') {
      body += `<div class="form-group"><label class="form-label">${f.label}</label><select class="select" id="fm-${f.id}">${f.options}</select></div>`;
    } else if (f.type === 'textarea') {
      body += `<div class="form-group"><label class="form-label">${f.label}</label><textarea class="textarea" id="fm-${f.id}" placeholder="${f.placeholder || ''}">${val}</textarea></div>`;
    } else {
      body += `<div class="form-group"><label class="form-label">${f.label}</label><input class="input" id="fm-${f.id}" type="${f.type || 'text'}" placeholder="${f.placeholder || ''}" value="${val}"></div>`;
    }
  });

  const modal = openModal({
    title,
    bodyHTML: body,
    footerHTML: `<button class="btn btn-secondary" id="fm-cancel">إلغاء</button><button class="btn btn-primary" id="fm-save">${ICONS.check} حفظ</button>`
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
      btn.disabled = true; btn.innerHTML = `<span class="loader-inline"></span> جاري الحفظ...`;
      const result = await onSave(values);
      if (result && result.error) throw new Error(result.error.message || result.error);
      modal.close();
      showToast('تم الحفظ بنجاح', 'success');
      if (onSuccess) onSuccess();
    } catch (e) {
      showToast(e.message, 'error');
      const btn = modal.element.querySelector('#fm-save');
      btn.disabled = false; btn.innerHTML = `${ICONS.check} حفظ`;
    }
  };
}

// ========== التنقل ==========
const tabsConfig = {
  dashboard: { title: 'لوحة التحكم', subtitle: 'نظرة عامة على أداء عملك', icon: ICONS.home },
  items: { title: 'المواد', subtitle: 'إدارة المخزون والمنتجات', icon: ICONS.box },
  'sale-invoice': { title: 'فاتورة بيع', subtitle: 'إنشاء فاتورة مبيعات جديدة', icon: ICONS.cart },
  'purchase-invoice': { title: 'فاتورة شراء', subtitle: 'إنشاء فاتورة مشتريات جديدة', icon: ICONS.download },
  customers: { title: 'العملاء', subtitle: 'قائمة العملاء والذمم المدينة', icon: ICONS.users },
  suppliers: { title: 'الموردين', subtitle: 'قائمة الموردين والذمم الدائنة', icon: ICONS.factory },
  categories: { title: 'التصنيفات', subtitle: 'تصنيفات المواد', icon: ICONS.tag },
  payments: { title: 'الدفعات', subtitle: 'سجل المقبوضات والمدفوعات', icon: ICONS.wallet },
  expenses: { title: 'المصاريف', subtitle: 'تتبع المصاريف التشغيلية', icon: ICONS.dollar },
  invoices: { title: 'الفواتير', subtitle: 'سجل الفواتير والحركات', icon: ICONS.fileText },
  reports: { title: 'التقارير', subtitle: 'التقارير المالية والإحصائيات', icon: ICONS.chart }
};

function setActiveTab(tabName) {
  document.querySelectorAll('.nav-item, .bottom-item').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tabName);
  });
  const cfg = tabsConfig[tabName];
  document.getElementById('page-title').textContent = cfg?.title || '';
  document.getElementById('page-subtitle').textContent = cfg?.subtitle || '';
  document.getElementById('page-subtitle').style.display = cfg?.subtitle ? 'block' : 'none';
}

function navigateTo(tabName) {
  setActiveTab(tabName);
  document.getElementById('more-menu').style.display = 'none';
  document.getElementById('sidebar').classList.remove('open');
  if (scrollLockPos !== undefined) unlockScroll();
  
  const content = document.getElementById('tab-content');
  content.style.opacity = '0';
  content.style.transform = 'translateY(10px)';
  
  setTimeout(() => {
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
    requestAnimationFrame(() => {
      content.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
      content.style.opacity = '1';
      content.style.transform = 'translateY(0)';
    });
  }, 50);
}

function showMoreMenu() {
  document.getElementById('more-menu').style.display = 'flex';
  lockScroll();
}

// بناء القوائم
function initNavigation() {
  const sidebarNav = document.getElementById('sidebar-nav');
  const sheetGrid = document.getElementById('sheet-grid');
  
  const mainTabs = ['dashboard','items','sale-invoice','purchase-invoice','customers','suppliers','categories','payments','expenses','invoices','reports'];
  const moreTabs = ['purchase-invoice','customers','suppliers','categories','payments','expenses','reports'];
  
  mainTabs.forEach(key => {
    const cfg = tabsConfig[key];
    if (!cfg) return;
    const btn = document.createElement('button');
    btn.className = 'nav-item' + (key === 'dashboard' ? ' active' : '');
    btn.dataset.tab = key;
    btn.innerHTML = `${cfg.icon}<span>${cfg.title}</span>`;
    btn.onclick = () => navigateTo(key);
    sidebarNav.appendChild(btn);
  });
  
  moreTabs.forEach(key => {
    const cfg = tabsConfig[key];
    if (!cfg) return;
    const btn = document.createElement('button');
    btn.className = 'sheet-item';
    btn.dataset.tab = key;
    btn.innerHTML = `${cfg.icon}<span>${cfg.title}</span>`;
    btn.onclick = () => { unlockScroll(); navigateTo(key); };
    sheetGrid.appendChild(btn);
  });
}

// مستمعات الأحداث الثابتة
document.getElementById('menu-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

const moreBackdrop = document.querySelector('.sheet-backdrop');
if (moreBackdrop) {
  moreBackdrop.addEventListener('click', () => {
    document.getElementById('more-menu').style.display = 'none';
    unlockScroll();
  });
}

// تبويبات الشريط السفلي
document.querySelectorAll('.bottom-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    if (tabName === 'more') {
      showMoreMenu();
    } else if (tabName) {
      navigateTo(tabName);
    }
  });
});
// ========== المواد (Items) ==========
async function loadItems() {
  try {
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <div class="card-header">
          <div><h3 class="card-title">المواد</h3><span class="card-subtitle">إدارة المخزون والمنتجات</span></div>
          <button class="btn btn-primary btn-sm" id="btn-add-item">${ICONS.plus} إضافة</button>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <input type="text" class="input" id="items-search" placeholder="البحث في المواد...">
        </div>
      </div>
      <div id="items-list"></div>
    `;
    document.getElementById('btn-add-item').addEventListener('click', showAddItemModal);
    document.getElementById('items-search').addEventListener('input', debounce(renderFilteredItems, 200));
    renderFilteredItems();
  } catch (err) { showToast(err.message, 'error'); }
}

function renderFilteredItems() {
  const q = (document.getElementById('items-search')?.value || '').trim().toLowerCase();
  const filtered = itemsCache.filter(i => (i.name || '').toLowerCase().includes(q));
  const container = document.getElementById('items-list');
  if (!filtered.length) { container.innerHTML = emptyState('لا توجد مواد مطابقة', 'يمكنك إضافة مواد جديدة من الزر أعلاه'); return; }
  let html = '<div class="table-wrap"><table class="table"><thead><tr><th>المادة</th><th>متوفر</th><th>القيمة</th></tr></thead><tbody>';
  filtered.forEach(item => {
    html += `<tr onclick="showItemDetail(${item.id})">
      <td><div style="font-weight:700;">${item.name}</div><div style="color:var(--text-muted);font-size:12px;">${item.category?.name || 'بدون تصنيف'}</div></td>
      <td style="font-weight:700;color:${(item.available ?? 0) <= 0 ? 'var(--danger)' : 'var(--success)'}">${item.available ?? 0}</td>
      <td style="font-weight:700;">${formatNumber(item.total_value ?? 0)}</td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function emptyState(title, subtitle) {
  return `<div class="empty-state">
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
    <h3>${title}</h3><p>${subtitle}</p>
  </div>`;
}

function showItemDetail(itemId) {
  const item = itemsCache.find(i => i.id === itemId);
  if (!item) return;

  const modal = openModal({
    title: item.name,
    bodyHTML: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
        <div class="stat-card" style="margin:0;padding:12px;"><div class="stat-label">الكمية المشتراة</div><div class="stat-value" style="font-size:16px;">${item.purchase_qty ?? 0}</div></div>
        <div class="stat-card" style="margin:0;padding:12px;"><div class="stat-label">الكمية المباعة</div><div class="stat-value" style="font-size:16px;">${item.sale_qty ?? 0}</div></div>
        <div class="stat-card" style="margin:0;padding:12px;border-color:var(--primary);"><div class="stat-label">المتوفرة</div><div class="stat-value text-primary" style="font-size:20px;">${item.available ?? 0}</div></div>
        <div class="stat-card" style="margin:0;padding:12px;"><div class="stat-label">القيمة الإجمالية</div><div class="stat-value" style="font-size:16px;">${formatNumber(item.total_value ?? 0)}</div></div>
        <div class="stat-card" style="margin:0;padding:12px;"><div class="stat-label">سعر الشراء</div><div class="stat-value" style="font-size:16px;">${formatNumber(item.purchase_price)}</div></div>
        <div class="stat-card" style="margin:0;padding:12px;"><div class="stat-label">سعر البيع</div><div class="stat-value" style="font-size:16px;">${formatNumber(item.selling_price)}</div></div>
      </div>
      <div class="form-label">التصنيف</div>
      <p style="margin-bottom:16px;">${item.category?.name || 'بدون تصنيف'}</p>
      <div class="form-label">نوع المادة</div>
      <p>${item.item_type || 'مخزون'}</p>
    `,
    footerHTML: `
      <button class="btn btn-secondary edit-btn" data-id="${item.id}" data-type="/items">${ICONS.edit} تعديل</button>
      <button class="btn btn-danger delete-btn" data-id="${item.id}" data-type="/items">${ICONS.trash} حذف</button>
    `
  });

  // إغلاق المودال عند النقر على أي من الزرين
  modal.element.querySelector('.edit-btn').addEventListener('click', () => modal.close());
  modal.element.querySelector('.delete-btn').addEventListener('click', () => modal.close());
}

function showAddItemModal() {
  const catOpts = categoriesCache.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  showFormModal({
    title: 'إضافة مادة جديدة',
    fields: [
      { id: 'name', label: 'اسم المادة', placeholder: 'مثال: حبر طابعة' },
      { id: 'category_id', label: 'التصنيف', type: 'select', options: `<option value="">بدون تصنيف</option>${catOpts}` },
      { id: 'item_type', label: 'نوع المادة', type: 'select', options: '<option value="مخزون">مخزون</option><option value="منتج نهائي">منتج نهائي</option><option value="خدمة">خدمة</option>' },
      { id: 'unit', label: 'وحدة القياس', placeholder: 'قطعة، صندوق، كرتونة...' },
      { id: 'purchase_price', label: 'سعر الشراء', type: 'number', placeholder: '0.00' },
      { id: 'selling_price', label: 'سعر البيع', type: 'number', placeholder: '0.00' }
    ],
    onSave: async (values) => {
      const payload = { ...values, category_id: values.category_id || null, purchase_price: parseFloat(values.purchase_price) || 0, selling_price: parseFloat(values.selling_price) || 0 };
      if (itemsCache.some(i => i.name.toLowerCase() === payload.name.toLowerCase())) throw new Error('توجد مادة بنفس الاسم');
      return apiCall('/items', 'POST', payload);
    },
    onSuccess: () => loadItems()
  });
}

function showEditItemModal(itemId) {
  const it = itemsCache.find(i => i.id === itemId); if (!it) return;
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
    initialValues: { name: it.name, category_id: it.category_id || '', item_type: it.item_type || 'مخزون', unit: it.unit || '', purchase_price: it.purchase_price, selling_price: it.selling_price },
    onSave: values => apiCall('/items', 'PUT', { id: itemId, ...values, category_id: values.category_id || null, purchase_price: parseFloat(values.purchase_price) || 0, selling_price: parseFloat(values.selling_price) || 0 }),
    onSuccess: () => loadItems()
  });
}

// ========== الأقسام العامة ==========
let g_currentSection = null;

function buildGenericItemHtml(item, opts) {
  let info = opts.extraFields.map(f => {
    const val = item[f.key]; if (val === undefined || val === null) return '';
    return `<span style="color:var(--text-muted);font-size:13px;background:var(--bg);padding:2px 8px;border-radius:6px;">${f.prefix || ''}${val}</span>`;
  }).filter(Boolean).join(' ');
  return `
    <div class="card card-hover" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <div style="min-width:0;">
          <div style="font-weight:800;margin-bottom:6px;font-size:15px;">${item[opts.nameField]}</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">${info}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button class="btn btn-secondary btn-sm edit-btn" data-id="${item[opts.idField]}" data-type="${opts.apiBase}">${ICONS.edit}</button>
          <button class="btn btn-danger btn-sm delete-btn" data-id="${item[opts.idField]}" data-type="${opts.apiBase}">${ICONS.trash}</button>
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
          <div><h3 class="card-title">${options.titlePlural || options.title}</h3></div>
          <button class="btn btn-primary btn-sm add-btn" data-type="${options.apiBase}">${ICONS.plus} إضافة</button>
        </div>
      </div>`;
    if (!options.cache || !options.cache.length) {
      html += emptyState(`لا يوجد ${options.titlePlural || options.title}`, 'ابدأ بإضافة أول سجل');
    } else {
      options.cache.forEach(item => { html += buildGenericItemHtml(item, options); });
    }
    document.getElementById('tab-content').innerHTML = html;
  } catch (err) { showToast(err.message, 'error'); }
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
    // مدخل المواد لتفعيل أزرار الحذف والتعديل عبر الأحداث العامة
    '/items': {
      cache: itemsCache,
      title: 'مادة',
      titlePlural: 'المواد',
      apiBase: '/items',
      idField: 'id',
      nameField: 'name',
      extraFields: [],
      addFields: [],
      editFields: [],
      prepareAdd: v => ({}),
      prepareEdit: (id, v) => ({ id })
    }
  };
  return map[key];
}

// مستمع الأحداث العامة (إضافة، تعديل، حذف) لجميع الأقسام
document.addEventListener('click', async (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  
  if (t.classList.contains('add-btn')) {
    const key = t.dataset.type;
    const opts = getSectionOptions(key);
    if (!opts) return;
    
    showFormModal({
      title: `إضافة ${opts.title} جديد`,
      fields: opts.addFields,
      onSave: async (values) => {
        // منع تكرار الاسم للأقسام التي تحتوي على اسم (عملاء، موردين، تصنيفات)
        const name = values.name?.trim();
        if (name) {
          const exists = opts.cache.some(item => item.name?.toLowerCase() === name.toLowerCase());
          if (exists) throw new Error(`يوجد ${opts.title} بنفس الاسم`);
        }
        return apiCall(opts.apiBase, 'POST', opts.prepareAdd(values));
      },
      onSuccess: () => loadGenericSection(opts)
    });
  }
  else if (t.classList.contains('edit-btn')) {
    const id = t.dataset.id, key = t.dataset.type, opts = getSectionOptions(key); if (!opts) return;
    const item = opts.cache.find(x => x[opts.idField] == id); if (!item) return;
    const init = {}; opts.editFields.forEach(f => init[f.id] = item[f.id] !== undefined ? item[f.id] : '');
    showFormModal({ title: `تعديل ${opts.title}`, fields: opts.editFields, initialValues: init, onSave: v => apiCall(opts.apiBase, 'PUT', opts.prepareEdit(id, v)), onSuccess: () => loadGenericSection(opts) });
  }
  else if (t.classList.contains('delete-btn')) {
    const id = t.dataset.id, key = t.dataset.type, opts = getSectionOptions(key); if (!opts) return;
    const found = opts.cache.find(x => x[opts.idField] == id);
    if (!await confirmDialog(`هل أنت متأكد من حذف ${opts.title} <strong>${found?.[opts.nameField] || ''}</strong>؟`)) return;
    try {
      const delUrl = opts.apiBase.includes('?') ? `${opts.apiBase}&id=${id}` : `${opts.apiBase}?id=${id}`;
      await apiCall(delUrl, 'DELETE');
      showToast('تم الحذف بنجاح', 'success');
      loadGenericSection(opts);
    } catch (err) { showToast(err.message, 'error'); }
  }
});
// ========== فاتورة المبيعات والمشتريات ==========
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
            <select class="select item-select"><option value="">اختر مادة</option>${items.map(i => `<option value="${i.id}" data-price="${type==='sale'?i.selling_price:i.purchase_price}">${i.name}</option>`).join('')}</select>
          </div>
          <div class="form-group"><input type="number" step="any" class="input qty-input" placeholder="الكمية"></div>
          <div class="form-group"><input type="number" step="0.01" class="input price-input" placeholder="السعر"></div>
          <div class="form-group"><input type="number" step="0.01" class="input total-input" placeholder="الإجمالي" readonly style="background:var(--bg);font-weight:700;"></div>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" id="btn-add-line" style="width:auto;margin-bottom:16px;">${ICONS.plus} إضافة بند</button>

      <div class="form-group"><label class="form-label">${type === 'sale' ? 'العميل' : 'المورد'}</label><select class="select" id="inv-entity">${entOpts}</select></div>
      <div class="form-group"><label class="form-label">التاريخ</label><input type="date" class="input" id="inv-date" value="${new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label class="form-label">الرقم المرجعي</label><input type="text" class="input" id="inv-ref" placeholder="رقم الفاتورة أو المرجع"></div>
      <div class="form-group"><label class="form-label">ملاحظات</label><textarea class="textarea" id="inv-notes" placeholder="أي ملاحظات إضافية..."></textarea></div>
      <div style="background:var(--bg);border-radius:12px;padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group" style="margin:0;"><label class="form-label">المبلغ المدفوع</label><input type="number" step="0.01" class="input" id="inv-paid" placeholder="0.00" value="0"></div>
        <div class="form-group" style="margin:0;"><label class="form-label">الإجمالي</label><div id="inv-grand-total" style="font-size:22px;font-weight:900;color:var(--primary);padding:8px 0;">0.00</div></div>
      </div>
    `;

    const modal = openModal({
      title: `فاتورة ${type === 'sale' ? 'مبيعات' : 'مشتريات'}`,
      bodyHTML: body,
      footerHTML: `<button class="btn btn-secondary" id="inv-cancel">إلغاء</button><button class="btn btn-primary" id="inv-save">${ICONS.check} حفظ الفاتورة</button>`
    });

    attachInvoiceEvents(type, modal.element);

    modal.element.querySelector('#inv-cancel').onclick = () => modal.close();
    modal.element.querySelector('#inv-save').onclick = async () => {
      const itype = modal.element.querySelector('#inv-type').value;
      const entity = modal.element.querySelector('#inv-entity').value;
      let cust = null, supp = null;
      if (itype === 'sale') cust = entity === 'cash' ? null : entity;
      else supp = entity === 'cash' ? null : entity;

      const lines = []; const ids = new Set(); let dup = false;
      modal.element.querySelectorAll('.line-row').forEach(row => {
        const id = row.querySelector('.item-select').value || null;
        if (id) { if (ids.has(id)) dup = true; ids.add(id); }
        const qty = parseFloat(row.querySelector('.qty-input').value) || 0;
        const price = parseFloat(row.querySelector('.price-input').value) || 0;
        const total = parseFloat(row.querySelector('.total-input').value) || 0;
        if (id || qty > 0) lines.push({ item_id: id, description: id ? '' : 'بند', quantity: qty, unit_price: price, total });
      });
      if (dup) return showToast('لا يمكن تكرار نفس المادة في الفاتورة', 'error');
      if (!lines.length) return showToast('أضف بنداً واحداً على الأقل', 'error');

      try {
        const btn = modal.element.querySelector('#inv-save');
        btn.disabled = true; btn.innerHTML = `<span class="loader-inline"></span> جاري الحفظ...`;
        await apiCall('/invoices', 'POST', {
          type: itype, customer_id: cust, supplier_id: supp,
          date: modal.element.querySelector('#inv-date').value,
          reference: modal.element.querySelector('#inv-ref').value.trim(),
          notes: modal.element.querySelector('#inv-notes').value.trim(),
          lines,
          paid_amount: parseFloat(modal.element.querySelector('#inv-paid').value) || 0
        });
        modal.close();
        showToast('تم حفظ الفاتورة بنجاح', 'success');
        loadInvoices();
      } catch (e) { showToast(e.message, 'error'); }
    };
  } catch (err) { showToast(err.message, 'error'); }
}

function attachInvoiceEvents(invoiceType, container) {
  const linesContainer = container.querySelector('#inv-lines');
  if (!linesContainer) return;

  function updateGrandTotal() {
    let total = 0;
    container.querySelectorAll('.total-input').forEach(inp => total += parseFloat(inp.value) || 0);
    const el = container.querySelector('#inv-grand-total');
    if (el) el.textContent = formatNumber(total);
  }

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
      updateGrandTotal();
    }
  }
  function calc(row) {
    const qty = parseFloat(row.querySelector('.qty-input')?.value) || 0;
    const pr = parseFloat(row.querySelector('.price-input')?.value) || 0;
    const tot = row.querySelector('.total-input');
    if (tot) { tot.value = Math.round(qty * pr); updateGrandTotal(); }
  }

  container.querySelectorAll('.line-row').forEach(row => {
    const sel = row.querySelector('.item-select');
    const pr = row.querySelector('.price-input');
    if (sel && pr) autoFill(sel, pr);
    sel?.addEventListener('change', function() {
      if (isDup(this.value, this.closest('.line-row'))) { showToast('المادة مضافة مسبقاً', 'warning'); this.value = ''; pr.value = ''; return; }
      autoFill(this, pr);
    });
    row.querySelector('.qty-input')?.addEventListener('input', () => calc(row));
    row.querySelector('.price-input')?.addEventListener('input', () => calc(row));
  });

  container.querySelector('#btn-add-line')?.addEventListener('click', () => {
    const nl = document.createElement('div'); nl.className = 'line-row';
    nl.innerHTML = `
      <div class="form-group" style="grid-column:1/-1"><select class="select item-select"><option value="">اختر مادة</option>${itemsCache.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}</select></div>
      <div class="form-group"><input type="number" step="any" class="input qty-input" placeholder="الكمية"></div>
      <div class="form-group"><input type="number" step="0.01" class="input price-input" placeholder="السعر"></div>
      <div class="form-group"><input type="number" step="0.01" class="input total-input" placeholder="الإجمالي" readonly style="background:var(--bg);font-weight:700;"></div>
      <button class="line-remove" title="حذف البند">${ICONS.trash}</button>
    `;
    linesContainer.appendChild(nl);
    const sel = nl.querySelector('.item-select');
    const pr = nl.querySelector('.price-input');
    sel.addEventListener('change', function() {
      if (isDup(this.value, this.closest('.line-row'))) { showToast('المادة مضافة مسبقاً', 'warning'); this.value = ''; pr.value = ''; return; }
      autoFill(this, pr);
    });
    nl.querySelector('.qty-input').addEventListener('input', () => calc(nl));
    nl.querySelector('.price-input').addEventListener('input', () => calc(nl));
    nl.querySelector('.line-remove').addEventListener('click', () => { if (linesContainer.querySelectorAll('.line-row').length > 1) { nl.remove(); updateGrandTotal(); } });
  });
}

// ========== قائمة الفواتير ==========
async function loadInvoices() {
  try {
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <div class="card-header"><div><h3 class="card-title">الفواتير</h3><span class="card-subtitle">سجل الفواتير والحركات المالية</span></div></div>
        <div class="filter-bar">
          <button class="filter-pill active" data-filter="all">الكل</button>
          <button class="filter-pill" data-filter="sale">مبيعات</button>
          <button class="filter-pill" data-filter="purchase">مشتريات</button>
        </div>
        <div class="form-group" style="margin-bottom:0;"><input type="text" class="input" id="invoice-search" placeholder="البحث في الفواتير..."></div>
      </div>
      <div id="invoices-list"></div>
    `;
    document.querySelectorAll('.filter-pill').forEach(tab => {
      tab.addEventListener('click', function() { document.querySelectorAll('.filter-pill').forEach(t => t.classList.remove('active')); this.classList.add('active'); renderFilteredInvoices(); });
    });
    document.getElementById('invoice-search').addEventListener('input', debounce(renderFilteredInvoices, 200));
    renderFilteredInvoices();
  } catch (err) { showToast(err.message, 'error'); }
}

function renderFilteredInvoices() {
  const filt = document.querySelector('.filter-pill.active')?.dataset.filter || 'all';
  const q = (document.getElementById('invoice-search')?.value || '').trim().toLowerCase();
  let data = invoicesCache;
  if (filt !== 'all') data = data.filter(inv => inv.type === filt);
  if (q) data = data.filter(inv => (inv.reference || '').includes(q) || (inv.customer?.name || '').includes(q) || (inv.supplier?.name || '').includes(q) || String(inv.total).includes(q));
  const container = document.getElementById('invoices-list');
  if (!data.length) { container.innerHTML = emptyState('لا توجد فواتير مطابقة', 'جرب تغيير معايير البحث'); return; }
  
  let html = '';
  data.forEach(inv => {
    const typeLabel = inv.type === 'sale' ? 'بيع' : 'شراء';
    const entity = inv.customer?.name || inv.supplier?.name || 'نقدي';
    const statusColor = (inv.balance || 0) <= 0 ? 'var(--success)' : 'var(--warning)';
    html += `
      <div class="card card-hover">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
          <div style="min-width:0;">
            <div style="font-weight:800;font-size:15px;display:flex;align-items:center;gap:8px;">
              <span style="background:${inv.type==='sale'?'var(--success-light)':'var(--warning-light)'};color:${inv.type==='sale'?'var(--success)':'var(--warning)'};padding:2px 10px;border-radius:20px;font-size:12px;">${typeLabel}</span>
              فاتورة ${inv.reference || ''}
            </div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:4px;">${formatDate(inv.date)} · ${entity}</div>
          </div>
          <div style="font-weight:900;font-size:20px;color:var(--primary);white-space:nowrap;">${formatNumber(inv.total)}</div>
        </div>
        <div style="display:flex;gap:16px;font-size:13px;color:var(--text-secondary);margin-bottom:14px;">
          <span>مدفوع: <strong>${formatNumber(inv.paid || 0)}</strong></span>
          <span style="color:${statusColor};font-weight:700;">باقي: ${formatNumber(inv.balance || 0)}</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm edit-invoice-btn" data-id="${inv.id}">${ICONS.edit} تعديل</button>
          <button class="btn btn-primary btn-sm print-invoice-btn" data-id="${inv.id}">${ICONS.print} طباعة</button>
          <button class="btn btn-primary btn-sm pdf-invoice-btn" data-id="${inv.id}">${ICONS.file} PDF</button>
          <button class="btn btn-danger btn-sm delete-invoice-btn" data-id="${inv.id}">${ICONS.trash} حذف</button>
        </div>
      </div>`;
  });
  container.innerHTML = html;

  container.querySelectorAll('.edit-invoice-btn').forEach(b => b.addEventListener('click', e => {
    const id = parseInt(e.target.closest('button').dataset.id);
    showToast('ميزة تعديل الفاتورة قيد التطوير', 'warning');
  }));
  container.querySelectorAll('.print-invoice-btn').forEach(b => b.addEventListener('click', e => {
    const id = parseInt(e.target.closest('button').dataset.id);
    const inv = invoicesCache.find(i => i.id === id);
    if (inv) printInvoice(inv);
  }));
  container.querySelectorAll('.pdf-invoice-btn').forEach(b => b.addEventListener('click', async e => {
    const btn = e.target.closest('button'); const id = parseInt(btn.dataset.id);
    btn.disabled = true; btn.innerHTML = `<span class="loader-inline"></span>`;
    try { await apiCall('/send-invoice-pdf', 'POST', { invoiceId: id }); showToast('تم إرسال PDF إلى البوت', 'success'); }
    catch (ex) { showToast('فشل الإرسال: ' + ex.message, 'error'); }
    finally { btn.disabled = false; btn.innerHTML = `${ICONS.file} PDF`; }
  }));
  container.querySelectorAll('.delete-invoice-btn').forEach(b => b.addEventListener('click', e => {
    const id = parseInt(e.target.closest('button').dataset.id);
    deleteInvoice(id);
  }));
}

async function deleteInvoice(id) {
  if (!await confirmDialog('هل أنت متأكد من حذف هذه الفاتورة؟ سيتم التراجع عن جميع التأثيرات المالية.')) return;
  try { await apiCall(`/invoices?id=${id}`, 'DELETE'); showToast('تم الحذف بنجاح', 'success'); loadInvoices(); }
  catch (e) { showToast(e.message, 'error'); }
}

function printInvoice(invoice) {
  const rows = invoice.invoice_lines?.map(l => `<tr><td>${l.item?.name || '-'}</td><td>${l.quantity}</td><td>${formatNumber(l.unit_price)}</td><td>${formatNumber(l.total)}</td></tr>`).join('') || '';
  const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>فاتورة</title>
    <style>@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');body{font-family:'Tajawal',sans-serif;padding:24px;max-width:700px;margin:0 auto}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #ddd;padding:10px;text-align:right}th{background:#f8fafc}.total{font-size:20px;font-weight:800;margin-top:16px}button{padding:10px 24px;background:#4f46e5;color:white;border:none;border-radius:8px;cursor:pointer;font-family:inherit}</style></head><body>
    <h2>فاتورة ${invoice.type==='sale'?'بيع':'شراء'}</h2>
    <p>التاريخ: ${invoice.date} | المرجع: ${invoice.reference||'-'}</p>
    <p>${invoice.customer?.name?'العميل: '+invoice.customer.name:''}${invoice.supplier?.name?'المورد: '+invoice.supplier.name:''}</p>
    <table><thead><tr><th>المادة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="total">الإجمالي: ${formatNumber(invoice.total)}</div>
    <p>مدفوع: ${formatNumber(invoice.paid||0)} | باقي: ${formatNumber(invoice.balance||0)}</p>
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
      apiCall('/payments', 'GET'), apiCall('/invoices', 'GET'), apiCall('/customers', 'GET'), apiCall('/suppliers', 'GET')
    ]);
    let html = `
      <div class="card">
        <div class="card-header"><div><h3 class="card-title">الدفعات</h3><span class="card-subtitle">سجل المقبوضات والمدفوعات</span></div><button class="btn btn-primary btn-sm" id="btn-add-pmt">${ICONS.plus} إضافة</button></div>
      </div>`;
    if (!payments.length) html += emptyState('لا توجد دفعات مسجلة', 'سجل أول دفعة باستخدام الزر أعلاه');
    else {
      payments.forEach(p => {
        const isIn = !!p.customer_id;
        html += `
          <div class="card" style="border-right:3px solid ${isIn?'var(--success)':'var(--danger)'};">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-weight:900;font-size:20px;color:${isIn?'var(--success)':'var(--danger)'};">${isIn?'+':'-'} ${formatNumber(p.amount)}</div>
                <div style="font-size:13px;color:var(--text-muted);margin-top:2px;">${formatDate(p.payment_date)}</div>
              </div>
              <button class="btn btn-ghost btn-sm" onclick="deletePayment(${p.id})">${ICONS.trash}</button>
            </div>
            <div style="margin-top:10px;font-size:13px;color:var(--text-secondary);line-height:1.6;">
              ${p.customer?.name ? '<span style="color:var(--success);font-weight:700;">▲ عميل: ' + p.customer.name + '</span>' : ''}
              ${p.supplier?.name ? '<span style="color:var(--danger);font-weight:700;">▼ مورد: ' + p.supplier.name + '</span>' : ''}
              ${p.invoice ? '· فاتورة: ' + (p.invoice.type==='sale'?'بيع':'شراء') + ' ' + (p.invoice.reference||'') : ''}
              ${p.notes ? '<div style="margin-top:4px;color:var(--text-muted);">' + p.notes + '</div>' : ''}
            </div>
          </div>`;
      });
    }
    document.getElementById('tab-content').innerHTML = html;
    document.getElementById('btn-add-pmt')?.addEventListener('click', () => showAddPaymentModal(customers, suppliers, invoices));
  } catch (err) { showToast(err.message, 'error'); }
}

function showAddPaymentModal(customers, suppliers, invoices) {
  const body = `
    <div class="form-group"><label class="form-label">النوع</label><select class="select" id="pmt-type"><option value="customer">مقبوضات من عميل</option><option value="supplier">مدفوعات إلى مورد</option></select></div>
    <div class="form-group" id="pmt-cust-block"><label class="form-label">العميل</label><select class="select" id="pmt-customer"><option value="">اختر عميل</option>${customers.map(c => `<option value="${c.id}">${c.name} (${formatNumber(c.balance)})</option>`).join('')}</select></div>
    <div class="form-group" id="pmt-supp-block" style="display:none"><label class="form-label">المورد</label><select class="select" id="pmt-supplier"><option value="">اختر مورد</option>${suppliers.map(s => `<option value="${s.id}">${s.name} (${formatNumber(s.balance)})</option>`).join('')}</select></div>
    <div class="form-group"><label class="form-label">الفاتورة (اختياري)</label><select class="select" id="pmt-invoice"><option value="">بدون فاتورة</option></select></div>
    <div class="form-group"><label class="form-label">المبلغ</label><input type="number" step="0.01" class="input" id="pmt-amount" placeholder="0.00"></div>
    <div class="form-group"><label class="form-label">التاريخ</label><input type="date" class="input" id="pmt-date" value="${new Date().toISOString().split('T')[0]}"></div>
    <div class="form-group"><label class="form-label">ملاحظات</label><textarea class="textarea" id="pmt-notes" placeholder="وصف الدفعة..."></textarea></div>
  `;
  const modal = openModal({ title: 'تسجيل دفعة جديدة', bodyHTML: body, footerHTML: `<button class="btn btn-secondary" id="pmt-cancel">إلغاء</button><button class="btn btn-primary" id="pmt-save">${ICONS.check} حفظ</button>` });
  
  const tSel = modal.element.querySelector('#pmt-type');
  const cBlock = modal.element.querySelector('#pmt-cust-block');
  const sBlock = modal.element.querySelector('#pmt-supp-block');
  const invSel = modal.element.querySelector('#pmt-invoice');
  const cSel = modal.element.querySelector('#pmt-customer');
  const sSel = modal.element.querySelector('#pmt-supplier');

  const updateInv = (type, eId) => {
    const filt = invoices.filter(inv => type === 'customer' ? inv.type === 'sale' && inv.customer_id == eId : inv.type === 'purchase' && inv.supplier_id == eId);
    invSel.innerHTML = '<option value="">بدون فاتورة</option>' + filt.map(inv => `<option value="${inv.id}">${inv.type==='sale'?'بيع':'شراء'} ${inv.reference||''} (${formatNumber(inv.total)})</option>`).join('');
  };
  tSel.addEventListener('change', () => {
    if (tSel.value === 'customer') { cBlock.style.display = 'block'; sBlock.style.display = 'none'; updateInv('customer', cSel.value); }
    else { cBlock.style.display = 'none'; sBlock.style.display = 'block'; updateInv('supplier', sSel.value); }
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
      await apiCall('/payments', 'POST', { invoice_id: invSel.value || null, customer_id: cust, supplier_id: supp, amount, payment_date: modal.element.querySelector('#pmt-date').value, notes: modal.element.querySelector('#pmt-notes').value.trim() });
      modal.close(); showToast('تم حفظ الدفعة بنجاح', 'success'); loadPayments();
    } catch (e) { showToast(e.message, 'error'); }
  };
}

async function deletePayment(id) {
  if (!await confirmDialog('هل أنت متأكد من حذف هذه الدفعة؟')) return;
  try { await apiCall(`/payments?id=${id}`, 'DELETE'); showToast('تم الحذف بنجاح', 'success'); loadPayments(); }
  catch (e) { showToast(e.message, 'error'); }
}

// ========== المصاريف ==========
async function loadExpenses() {
  try {
    const expenses = await apiCall('/expenses', 'GET');
    let html = `
      <div class="card">
        <div class="card-header"><div><h3 class="card-title">المصاريف</h3><span class="card-subtitle">تتبع المصاريف التشغيلية</span></div><button class="btn btn-primary btn-sm" id="btn-add-expense">${ICONS.plus} إضافة</button></div>
      </div>`;
    if (!expenses.length) html += emptyState('لا توجد مصاريف مسجلة', 'سجل أول مصروف باستخدام الزر أعلاه');
    else {
      expenses.forEach(ex => {
        html += `
          <div class="card" style="border-right:3px solid var(--danger);">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-weight:900;font-size:20px;color:var(--danger);">${formatNumber(ex.amount)}</div>
                <div style="font-size:13px;color:var(--text-muted);margin-top:2px;">${formatDate(ex.expense_date)}</div>
              </div>
              <button class="btn btn-ghost btn-sm" onclick="deleteExpense(${ex.id})">${ICONS.trash}</button>
            </div>
            ${ex.description ? `<div style="margin-top:10px;font-size:14px;color:var(--text-secondary);">${ex.description}</div>` : ''}
          </div>`;
      });
    }
    document.getElementById('tab-content').innerHTML = html;
    document.getElementById('btn-add-expense')?.addEventListener('click', showAddExpenseModal);
  } catch (err) { showToast(err.message, 'error'); }
}

function showAddExpenseModal() {
  showFormModal({
    title: 'إضافة مصروف جديد',
    fields: [
      { id: 'amount', label: 'المبلغ', type: 'number', placeholder: '0.00' },
      { id: 'expense_date', label: 'التاريخ', type: 'date' },
      { id: 'description', label: 'الوصف', type: 'textarea', placeholder: 'وصف المصروف...' }
    ],
    initialValues: { expense_date: new Date().toISOString().split('T')[0] },
    onSave: values => apiCall('/expenses', 'POST', { ...values, amount: parseFloat(values.amount) }),
    onSuccess: () => loadExpenses()
  });
}

async function deleteExpense(id) {
  if (!await confirmDialog('هل أنت متأكد من حذف هذا المصروف؟')) return;
  try { await apiCall(`/expenses?id=${id}`, 'DELETE'); showToast('تم الحذف بنجاح', 'success'); loadExpenses(); }
  catch (e) { showToast(e.message, 'error'); }
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
          <div class="stat-value ${data.net_profit >= 0 ? 'positive' : 'negative'}" style="font-size:24px;">${formatNumber(data.net_profit)}</div>
          ${data.net_profit >= 0 ? '<div class="stat-trend up">↑ ربح</div>' : '<div class="stat-trend down">↓ خسارة</div>'}
        </div>
        <div class="stat-card cash">
          <div class="stat-label">رصيد الصندوق</div>
          <div class="stat-value ${data.cash_balance >= 0 ? 'positive' : 'negative'}">${formatNumber(data.cash_balance)}</div>
        </div>
        <div class="stat-card receivables">
          <div class="stat-label">الذمم المدينة</div>
          <div class="stat-value">${formatNumber(data.receivables)}</div>
        </div>
        <div class="stat-card payables">
          <div class="stat-label">الذمم الدائنة</div>
          <div class="stat-value">${formatNumber(data.payables)}</div>
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
      data: { labels: ['مبيعات', 'مشتريات'], datasets: [{ data: [totalSales, totalPurchases], backgroundColor: ['#10b981', '#f59e0b'], borderWidth: 0, hoverOffset: 4 }] },
      options: { responsive: true, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { font: { family: 'Tajawal' } } } } }
    });

    if (data.monthly) {
      new Chart(document.getElementById('paymentsChart'), {
        type: 'bar',
        data: {
          labels: data.monthly.labels,
          datasets: [
            { label: 'وارد', data: data.monthly.payments_in, backgroundColor: '#4f46e5', borderRadius: 6 },
            { label: 'منصرف', data: data.monthly.payments_out, backgroundColor: '#ef4444', borderRadius: 6 }
          ]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } }, plugins: { legend: { labels: { font: { family: 'Tajawal' } } } } }
      });
    }

    if (data.daily?.dates.length) {
      const last30 = data.daily.dates.slice(-30);
      const profits30 = data.daily.profits.slice(-30);
      new Chart(document.getElementById('profitChart'), {
        type: 'line',
        data: { labels: last30, datasets: [{ label: 'صافي الربح', data: profits30, borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)', tension: 0.3, fill: true, pointRadius: 3, pointHoverRadius: 5 }] },
        options: { responsive: true, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } }, plugins: { legend: { labels: { font: { family: 'Tajawal' } } } } }
      });
    }
  } catch (err) { showToast(err.message, 'error'); }
}
// ========== التقارير ==========
async function loadReports() {
  document.getElementById('tab-content').innerHTML = `
    <div class="card"><h3 class="card-title">التقارير المالية</h3><p class="card-subtitle">اختر التقرير المطلوب لعرض التفاصيل</p></div>
    <div class="report-card" data-report="trial_balance"><div class="report-icon">${ICONS.chart}</div><div class="report-info"><h4>ميزان المراجعة</h4><p>نظرة شاملة على الحسابات</p></div></div>
    <div class="report-card" data-report="income_statement"><div class="report-icon">${ICONS.chart}</div><div class="report-info"><h4>قائمة الدخل</h4><p>الإيرادات والمصروفات والأرباح</p></div></div>
    <div class="report-card" data-report="balance_sheet"><div class="report-icon">${ICONS.chart}</div><div class="report-info"><h4>الميزانية العمومية</h4><p>الأصول والخصوم وحقوق الملكية</p></div></div>
    <div class="report-card" data-report="account_ledger"><div class="report-icon">${ICONS.fileText}</div><div class="report-info"><h4>الأستاذ العام</h4><p>كشف حساب تفصيلي</p></div></div>
    <div class="report-card" data-report="customer_statement"><div class="report-icon">${ICONS.users}</div><div class="report-info"><h4>كشف حساب عميل</h4><p>حركات عميل محدد</p></div></div>
    <div class="report-card" data-report="supplier_statement"><div class="report-icon">${ICONS.factory}</div><div class="report-info"><h4>كشف حساب مورد</h4><p>حركات مورد محدد</p></div></div>
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
    const rows = data.map(r => `<tr><td style="font-weight:700;">${r.name}</td><td>${formatNumber(r.total_debit)}</td><td>${formatNumber(r.total_credit)}</td><td class="${r.balance >= 0 ? 'text-success' : 'text-danger'}" style="font-weight:800;">${formatNumber(r.balance)}</td></tr>`).join('');
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
    const iRows = d.income.map(i => `<tr><td>${i.name}</td><td style="font-weight:700;color:var(--success);">${formatNumber(i.balance)}</td></tr>`).join('');
    const eRows = d.expenses.map(e => `<tr><td>${e.name}</td><td style="font-weight:700;color:var(--danger);">${formatNumber(e.balance)}</td></tr>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn btn-secondary btn-sm" onclick="loadReports()" style="width:auto;margin-bottom:12px;">🔙 رجوع</button>
        <h3 class="card-title">قائمة الدخل</h3>
        <h4 style="margin:16px 0 8px;font-size:14px;color:var(--text-muted);font-weight:800;">الإيرادات</h4>
        <div class="table-wrap"><table class="table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${iRows}</tbody></table></div>
        <p style="font-weight:800;margin:8px 0;font-size:16px;text-align:left;">إجمالي الإيرادات: <span style="color:var(--success);">${formatNumber(d.total_income)}</span></p>
        <h4 style="margin:16px 0 8px;font-size:14px;color:var(--text-muted);font-weight:800;">المصروفات</h4>
        <div class="table-wrap"><table class="table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${eRows}</tbody></table></div>
        <p style="font-weight:800;margin:8px 0;font-size:16px;text-align:left;">إجمالي المصروفات: <span style="color:var(--danger);">${formatNumber(d.total_expenses)}</span></p>
        <hr style="border-color:var(--border);margin:16px 0;">
        <h2 style="color:${d.net_profit >= 0 ? 'var(--success)' : 'var(--danger)'};font-size:24px;font-weight:900;text-align:center;">صافي الربح: ${formatNumber(d.net_profit)}</h2>
      </div>`;
  } catch (e) { showToast(e.message, 'error'); }
}

async function loadBalanceSheet() {
  try {
    const d = await apiCall('/reports?type=balance_sheet', 'GET');
    const aRows = d.assets.map(a => `<tr><td>${a.name}</td><td style="font-weight:700;">${formatNumber(a.balance)}</td></tr>`).join('');
    const lRows = d.liabilities.map(l => `<tr><td>${l.name}</td><td style="font-weight:700;">${formatNumber(l.balance)}</td></tr>`).join('');
    const eRows = d.equity.map(e => `<tr><td>${e.name}</td><td style="font-weight:700;">${formatNumber(e.balance)}</td></tr>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn btn-secondary btn-sm" onclick="loadReports()" style="width:auto;margin-bottom:12px;">🔙 رجوع</button>
        <h3 class="card-title">الميزانية العمومية</h3>
        <h4 style="margin:16px 0 8px;font-size:14px;color:var(--text-muted);font-weight:800;">الأصول</h4>
        <div class="table-wrap"><table class="table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${aRows}</tbody></table></div>
        <p style="font-weight:800;margin:8px 0;text-align:left;">إجمالي الأصول: ${formatNumber(d.total_assets)}</p>
        <h4 style="margin:16px 0 8px;font-size:14px;color:var(--text-muted);font-weight:800;">الخصوم</h4>
        <div class="table-wrap"><table class="table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${lRows}</tbody></table></div>
        <p style="font-weight:800;margin:8px 0;text-align:left;">إجمالي الخصوم: ${formatNumber(d.total_liabilities)}</p>
        <h4 style="margin:16px 0 8px;font-size:14px;color:var(--text-muted);font-weight:800;">حقوق الملكية</h4>
        <div class="table-wrap"><table class="table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${eRows}</tbody></table></div>
        <p style="font-weight:800;margin:8px 0;text-align:left;">إجمالي حقوق الملكية: ${formatNumber(d.total_equity)}</p>
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
        <div class="form-group"><select class="select" id="ledger-account">${opts}</select></div>
        <button class="btn btn-primary" id="btn-ledger" style="width:auto;">عرض الحركات</button>
        <div id="ledger-result" style="margin-top:16px"></div>
      </div>`;
    document.getElementById('btn-ledger').addEventListener('click', async () => {
      const id = document.getElementById('ledger-account').value; if (!id) return;
      try {
        const lines = await apiCall(`/reports?type=account_ledger&account_id=${id}`, 'GET');
        let html = '<div class="table-wrap"><table class="table"><thead><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>';
        lines.forEach(l => html += `<tr><td>${formatDate(l.date)}</td><td>${l.description || ''}</td><td style="color:var(--success);font-weight:700;">${formatNumber(l.debit)}</td><td style="color:var(--danger);font-weight:700;">${formatNumber(l.credit)}</td><td class="${(l.balance || 0) >= 0 ? 'text-success' : 'text-danger'}" style="font-weight:800;">${formatNumber(l.balance)}</td></tr>`);
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
      const id = document.getElementById('stmt-cust').value; if (!id) return;
      try {
        const lines = await apiCall(`/reports?type=customer_statement&customer_id=${id}`, 'GET');
        let html = '<div class="table-wrap"><table class="table"><thead><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>';
        lines.forEach(l => html += `<tr><td>${formatDate(l.date)}</td><td>${l.description || ''}</td><td style="color:var(--success);font-weight:700;">${formatNumber(l.debit)}</td><td style="color:var(--danger);font-weight:700;">${formatNumber(l.credit)}</td><td class="${(l.balance || 0) >= 0 ? 'text-success' : 'text-danger'}" style="font-weight:800;">${formatNumber(l.balance)}</td></tr>`);
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
      const id = document.getElementById('stmt-supp').value; if (!id) return;
      try {
        const lines = await apiCall(`/reports?type=supplier_statement&supplier_id=${id}`, 'GET');
        let html = '<div class="table-wrap"><table class="table"><thead><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>';
        lines.forEach(l => html += `<tr><td>${formatDate(l.date)}</td><td>${l.description || ''}</td><td style="color:var(--success);font-weight:700;">${formatNumber(l.debit)}</td><td style="color:var(--danger);font-weight:700;">${formatNumber(l.credit)}</td><td class="${(l.balance || 0) >= 0 ? 'text-success' : 'text-danger'}" style="font-weight:800;">${formatNumber(l.balance)}</td></tr>`);
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
      <div style="line-height:1.8;">
        <p style="margin-bottom:16px;">مرحباً بك في <strong>نظام الراجحي للمحاسبة</strong>. يمكنك من خلال هذا النظام:</p>
        <ul style="padding-right:20px;margin-bottom:16px;">
          <li>إدارة المواد والعملاء والموردين</li>
          <li>إنشاء فواتير المبيعات والمشتريات</li>
          <li>تسجيل الدفعات والمصاريف</li>
          <li>عرض التقارير المالية المتكاملة</li>
          <li>إرسال الفواتير PDF إلى التلغرام</li>
        </ul>
        <div style="background:var(--bg);border-radius:12px;padding:16px;">
          <div style="font-weight:700;margin-bottom:4px;">💡 نصائح سريعة</div>
          <div style="font-size:13px;color:var(--text-secondary);">استخدم البحث للوصول السريع للفواتير والمواد. يمكنك طباعة أي فاتورة مباشرة من قائمة الفواتير.</div>
        </div>
        <p style="margin-top:16px;color:var(--text-muted);font-size:13px;">للدعم الفني: @bukamal1991</p>
      </div>
    `
  });
}

document.getElementById('btn-help').addEventListener('click', showHelpModal);

// ========== بدء التطبيق ==========
async function verifyUser() {
  try {
    const data = await apiCall('/verify', 'POST');
    if (data.verified) {
      document.getElementById('user-name-sidebar').textContent = user?.first_name || 'مستخدم';
      document.getElementById('user-avatar').textContent = (user?.first_name?.[0] || 'م').toUpperCase();
      initNavigation();
      
      [itemsCache, customersCache, suppliersCache, invoicesCache, categoriesCache, unitsCache] = await Promise.all([
        apiCall('/items', 'GET'), apiCall('/customers', 'GET'), apiCall('/suppliers', 'GET'),
        apiCall('/invoices', 'GET'), apiCall('/definitions?type=category', 'GET'), apiCall('/definitions?type=unit', 'GET')
      ]);
      
      document.getElementById('loading-screen').classList.add('hidden');
      loadDashboard();
    } else {
      document.getElementById('loading-screen').innerHTML = `<div style="color:var(--danger);font-size:18px;text-align:center;padding:20px;">${ICONS.x}<br><br>${data.error || 'غير مصرح'}</div>`;
    }
  } catch (err) {
    document.getElementById('loading-screen').innerHTML = `<div style="color:var(--danger);font-size:18px;text-align:center;padding:20px;">${ICONS.x}<br><br>${err.message}</div>`;
  }
}
verifyUser();
