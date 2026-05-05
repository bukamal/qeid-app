/* ============================================
   الراجحي للمحاسبة - المنطق المحسّن v4 Pro (ربط الوحدات بقاعدة البيانات)
   الجزء 1: الأساسيات - الأيقونات، الدوال المساعدة، المودال، API
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
  file: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  scale: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/></svg>',
  send: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>'
};

// ========== الثيم ==========
function applyTheme() {
  document.body.classList.toggle('dark', tg.colorScheme === 'dark');
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
  return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
function openModal({ title, bodyHTML, footerHTML = '', onClose }) {
  const portal = document.getElementById('modal-portal');
  if (activeModal) activeModal.close();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
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
      footerHTML: `<button class="btn btn-secondary" id="confirm-cancel">إلغاء</button><button class="btn btn-danger" id="confirm-ok">تأكيد</button>`,
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
      if (base === 'definitions') {
        invalidateCache('/definitions');
        unitsCache = await apiCall('/definitions?type=unit', 'GET');
      }
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
  const formId = 'form-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
  let body = '';
  fields.forEach(f => {
    const val = initialValues[f.id] !== undefined ? initialValues[f.id] : '';
    if (f.type === 'select') {
      body += `<div class="form-group"><label class="form-label">${f.label}</label><select class="select" id="${formId}-${f.id}">${f.options}</select></div>`;
    } else if (f.type === 'textarea') {
      body += `<div class="form-group"><label class="form-label">${f.label}</label><textarea class="textarea" id="${formId}-${f.id}" placeholder="${f.placeholder || ''}">${val}</textarea></div>`;
    } else {
      body += `<div class="form-group"><label class="form-label">${f.label}</label><input class="input" id="${formId}-${f.id}" type="${f.type || 'text'}" placeholder="${f.placeholder || ''}" value="${val}"></div>`;
    }
  });

  const modal = openModal({
    title,
    bodyHTML: body,
    footerHTML: `<button class="btn btn-secondary" id="${formId}-cancel">إلغاء</button><button class="btn btn-primary" id="${formId}-save">${ICONS.check} حفظ</button>`
  });

  const cancelBtn = modal.element.querySelector(`#${formId}-cancel`);
  const saveBtn = modal.element.querySelector(`#${formId}-save`);

  cancelBtn.onclick = () => modal.close();
  saveBtn.onclick = async () => {
    if (saveBtn.disabled) return;
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span class="loader-inline"></span> جاري الحفظ...`;

    try {
      const values = {};
      fields.forEach(f => {
        const el = modal.element.querySelector(`#${formId}-${f.id}`);
        if (el) values[f.id] = el.value.trim();
      });
      const result = await onSave(values);
      if (result && result.error) throw new Error(result.error.message || result.error);
      modal.close();
      showToast('تم الحفظ بنجاح', 'success');
      if (onSuccess) onSuccess();
    } catch (e) {
      showToast(e.message, 'error');
      saveBtn.disabled = false;
      saveBtn.innerHTML = `${ICONS.check} حفظ`;
    }
  };
}

/* ============================================
   الراجحي للمحاسبة - المنطق المحسّن v4 Pro (ربط الوحدات بقاعدة البيانات)
   الجزء 2: التنقل، الوحدات، المواد (عرض وإضافة وتفاصيل)
   ============================================ */

// ========== التنقل ==========
const tabsConfig = {
  dashboard: { title: 'لوحة التحكم', subtitle: 'نظرة عامة على أداء عملك', icon: ICONS.home },
  items: { title: 'المواد', subtitle: 'إدارة المخزون والمنتجات', icon: ICONS.box },
  'sale-invoice': { title: 'فاتورة بيع', subtitle: 'إنشاء فاتورة مبيعات جديدة', icon: ICONS.cart },
  'purchase-invoice': { title: 'فاتورة شراء', subtitle: 'إنشاء فاتورة مشتريات جديدة', icon: ICONS.download },
  customers: { title: 'العملاء', subtitle: 'قائمة العملاء والذمم المدينة', icon: ICONS.users },
  suppliers: { title: 'الموردين', subtitle: 'قائمة الموردين والذمم الدائنة', icon: ICONS.factory },
  categories: { title: 'التصنيفات', subtitle: 'تصنيفات المواد', icon: ICONS.tag },
  units: { title: 'الوحدات', subtitle: 'إدارة وحدات القياس', icon: ICONS.scale },
  payments: { title: 'الدفعات', subtitle: 'سجل المقبوضات والمدفوعات', icon: ICONS.wallet },
  expenses: { title: 'المصاريف', subtitle: 'تتبع المصاريف التشغيلية', icon: ICONS.dollar },
  invoices: { title: 'الفواتير', subtitle: 'سجل الفواتير والحركات', icon: ICONS.fileText },
  reports: { title: 'التقارير', subtitle: 'التقارير المالية والإحصائيات', icon: ICONS.chart }
};

function setActiveTab(tabName) {
  document.querySelectorAll('.nav-item, .bottom-item').forEach(el => el.classList.toggle('active', el.dataset.tab === tabName));
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
      case 'units': loadUnitsSection(); break;
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

// ========== القائمة الفارغة ==========
function emptyState(title, subtitle) {
  return `<div class="empty-state"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg><h3>${title}</h3><p>${subtitle}</p></div>`;
}

// ========== بناء القوائم ==========
function initNavigation() {
  const sidebarNav = document.getElementById('sidebar-nav');
  const sheetGrid = document.getElementById('sheet-grid');
  const mainTabs = ['dashboard','items','sale-invoice','purchase-invoice','customers','suppliers','categories','units','payments','expenses','invoices','reports'];
  const moreTabs = ['purchase-invoice','customers','suppliers','categories','units','payments','expenses','reports'];

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

// ========== الوحدات (Units) - مربوطة بقاعدة البيانات ==========
async function loadUnitsSection() {
  try {
    const [data, items] = await Promise.all([
      apiCall('/definitions?type=unit', 'GET'),
      itemsCache.length ? Promise.resolve(itemsCache) : apiCall('/items', 'GET')
    ]);
    unitsCache = data;
    if (!itemsCache.length) itemsCache = items;

    let html = `<div class="card"><div class="card-header"><div><h3 class="card-title">وحدات القياس</h3><span class="card-subtitle">إدارة وحدات القياس المستخدمة في المواد</span></div><button class="btn btn-primary btn-sm" id="btn-add-unit">${ICONS.plus} إضافة وحدة</button></div></div>`;
    
    if (!data || !data.length) {
      html += emptyState('لا توجد وحدات مسجلة', 'أضف وحدات القياس المستخدمة في عملك');
    } else {
      html += '<div class="table-wrap"><table class="table"><thead><tr><th>الوحدة</th><th>الاختصار</th><th>الإجراءات</th></tr></thead><tbody>';
      data.forEach(unit => {
        html += `<tr>
          <td style="font-weight:700;">${unit.name}</td>
          <td><span style="background:var(--primary-light);color:var(--primary);padding:2px 10px;border-radius:6px;font-size:12px;">${unit.abbreviation || '-'}</span></td>
          <td>
            <button class="btn btn-secondary btn-sm edit-unit-btn" data-id="${unit.id}">${ICONS.edit}</button>
            <button class="btn btn-danger btn-sm delete-unit-btn" data-id="${unit.id}">${ICONS.trash}</button>
          </td>
        </tr>`;
      });
      html += '</tbody></table></div>';
    }
    
    document.getElementById('tab-content').innerHTML = html;
    
    document.getElementById('btn-add-unit')?.addEventListener('click', showAddUnitModal);
    document.querySelectorAll('.edit-unit-btn').forEach(btn => {
      btn.addEventListener('click', e => showEditUnitModal(e.target.closest('button').dataset.id));
    });
    document.querySelectorAll('.delete-unit-btn').forEach(btn => {
      btn.addEventListener('click', e => deleteUnit(e.target.closest('button').dataset.id));
    });
  } catch (err) { showToast(err.message, 'error'); }
}

function showAddUnitModal() {
  showFormModal({
    title: 'إضافة وحدة قياس جديدة',
    fields: [
      { id: 'name', label: 'اسم الوحدة', placeholder: 'مثال: قطعة، كيلو، لتر' },
      { id: 'abbreviation', label: 'الاختصار', placeholder: 'مثال: pc, kg, L' }
    ],
    onSave: async (values) => {
      if (!values.name?.trim()) throw new Error('اسم الوحدة مطلوب');
      if (unitsCache.some(u => u.name.toLowerCase() === values.name.trim().toLowerCase())) {
        throw new Error('توجد وحدة بنفس الاسم');
      }
      return apiCall('/definitions?type=unit', 'POST', { type: 'unit', name: values.name.trim(), abbreviation: values.abbreviation || null });
    },
    onSuccess: () => loadUnitsSection()
  });
}

function showEditUnitModal(unitId) {
  const unit = unitsCache.find(u => u.id == unitId);
  if (!unit) return;
  showFormModal({
    title: 'تعديل وحدة القياس',
    fields: [
      { id: 'name', label: 'اسم الوحدة' },
      { id: 'abbreviation', label: 'الاختصار' }
    ],
    initialValues: { name: unit.name, abbreviation: unit.abbreviation || '' },
    onSave: async (values) => {
      if (!values.name?.trim()) throw new Error('اسم الوحدة مطلوب');
      return apiCall('/definitions?type=unit', 'PUT', { type: 'unit', id: unitId, name: values.name.trim(), abbreviation: values.abbreviation || null });
    },
    onSuccess: () => loadUnitsSection()
  });
}

async function deleteUnit(unitId) {
  const unit = unitsCache.find(u => u.id == unitId);
  if (!unit) return;
  if (!itemsCache || itemsCache.length === 0) {
    try { itemsCache = await apiCall('/items', 'GET'); } catch(e) {}
  }
  const usedInItems = [];
  (itemsCache || []).forEach(item => {
    if (item.base_unit_id == unitId) {
      usedInItems.push(item.name);
    } else if (item.item_units && Array.isArray(item.item_units)) {
      item.item_units.forEach(iu => {
        if (iu.unit_id == unitId) usedInItems.push(item.name);
      });
    }
  });
  if (usedInItems.length > 0) {
    const uniqueItems = [...new Set(usedInItems)].slice(0, 3);
    const more = usedInItems.length > 3 ? ` و${usedInItems.length - 3} أخرى` : '';
    showToast(`لا يمكن حذف "${unit.name}" لأنها مستخدمة في: ${uniqueItems.join('، ')}${more}`, 'error');
    return;
  }
  if (!await confirmDialog(`هل أنت متأكد من حذف الوحدة <strong>${unit.name}</strong>؟`)) return;
  try {
    await apiCall(`/definitions?type=unit&id=${unitId}`, 'DELETE');
    showToast('تم الحذف بنجاح', 'success');
    loadUnitsSection();
  } catch (e) { showToast(e.message, 'error'); }
}

// ========== المواد (Items) مع وحدات مربوطة بقاعدة البيانات ==========
function renderFilteredItems() {
  const q = (document.getElementById('items-search')?.value || '').trim().toLowerCase();
  const filtered = itemsCache.filter(i => (i.name || '').toLowerCase().includes(q));
  const container = document.getElementById('items-list');
  if (!filtered.length) return container.innerHTML = emptyState('لا توجد مواد مطابقة', 'يمكنك إضافة مواد جديدة من الزر أعلاه');
  let html = '<div class="table-wrap"><table class="table"><thead><tr><th>المادة</th><th>الوحدة الأساسية</th><th>متوفر</th><th>القيمة</th></tr></thead><tbody>';
  filtered.forEach(item => {
    const baseUnitName = item.base_unit?.name || item.base_unit?.abbreviation || 'قطعة';
    html += `<tr onclick="showItemDetail(${item.id})" style="cursor:pointer;">
      <td><div style="font-weight:700;">${item.name}</div><div style="color:var(--text-muted);font-size:12px;">${item.category?.name || 'بدون تصنيف'}</div></td>
      <td><span style="background:var(--primary-light);color:var(--primary);padding:2px 10px;border-radius:6px;font-size:12px;">${baseUnitName}</span></td>
      <td style="font-weight:700;color:${(item.available ?? 0) <= 0 ? 'var(--danger)' : 'var(--success)'}">${item.available ?? 0}</td>
      <td style="font-weight:700;">${formatNumber(item.total_value ?? 0)}</td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

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

function showItemDetail(itemId) {
  const item = itemsCache.find(i => i.id === itemId);
  if (!item) return;

  const baseUnit = item.base_unit || {};
  const baseUnitName = baseUnit.name || baseUnit.abbreviation || 'قطعة';
  const itemUnits = item.item_units || [];

  let unitsHtml = '';
  if (itemUnits.length > 0) {
    unitsHtml = `<div style="margin-bottom:16px;"><div style="font-weight:700;margin-bottom:8px;color:var(--text-secondary);">نظام الوحدات</div><div style="display:flex;flex-direction:column;gap:8px;">
      <div style="background:var(--success-light);border:1px solid var(--success);border-radius:8px;padding:10px 14px;"><span style="color:var(--success);font-weight:800;">الوحدة الأساسية:</span><span style="font-weight:700;"> ${baseUnitName}</span></div>`;
    
    itemUnits.forEach((iu, idx) => {
      const unit = iu.unit || {};
      const unitName = unit.name || unit.abbreviation || `وحدة ${idx + 2}`;
      unitsHtml += `<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px 14px;"><span style="color:var(--primary);font-weight:800;">وحدة فرعية:</span><span style="font-weight:700;"> ${unitName}</span><span style="color:var(--text-muted);"> (1 ${unitName} = ${iu.conversion_factor} ${baseUnitName})</span></div>`;
    });
    unitsHtml += `</div></div>`;
  }

  const modal = openModal({
    title: item.name,
    bodyHTML: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
        <div class="stat-card" style="margin:0;padding:12px;"><div class="stat-label">الكمية المشتراة</div><div class="stat-value" style="font-size:16px;">${item.purchase_qty ?? 0} ${baseUnitName}</div></div>
        <div class="stat-card" style="margin:0;padding:12px;"><div class="stat-label">الكمية المباعة</div><div class="stat-value" style="font-size:16px;">${item.sale_qty ?? 0} ${baseUnitName}</div></div>
        <div class="stat-card" style="margin:0;padding:12px;border-color:var(--primary);"><div class="stat-label">المتوفرة</div><div class="stat-value text-primary" style="font-size:20px;">${item.available ?? 0} ${baseUnitName}</div></div>
        <div class="stat-card" style="margin:0;padding:12px;"><div class="stat-label">القيمة الإجمالية</div><div class="stat-value" style="font-size:16px;">${formatNumber(item.total_value ?? 0)}</div></div>
        <div class="stat-card" style="margin:0;padding:12px;"><div class="stat-label">سعر الشراء</div><div class="stat-value" style="font-size:16px;">${formatNumber(item.purchase_price)} / ${baseUnitName}</div></div>
        <div class="stat-card" style="margin:0;padding:12px;"><div class="stat-label">سعر البيع</div><div class="stat-value" style="font-size:16px;">${formatNumber(item.selling_price)} / ${baseUnitName}</div></div>
      </div>
      ${unitsHtml}
      <div class="form-label">التصنيف</div><p style="margin-bottom:12px;">${item.category?.name || 'بدون تصنيف'}</p>
      <div class="form-label">نوع المادة</div><p style="margin-bottom:12px;">${item.item_type || 'مخزون'}</p>
    `,
    footerHTML: `<button class="btn btn-secondary" id="edit-item-btn">${ICONS.edit} تعديل</button><button class="btn btn-danger" id="delete-item-btn">${ICONS.trash} حذف</button>`
  });

  modal.element.querySelector('#edit-item-btn').onclick = () => { modal.close(); setTimeout(() => showEditItemModal(itemId), 220); };
  modal.element.querySelector('#delete-item-btn').onclick = () => {
    modal.close();
    setTimeout(async () => {
      if (await confirmDialog(`هل أنت متأكد من حذف المادة <strong>${item.name}</strong>؟`)) {
        try { await apiCall(`/items?id=${itemId}`, 'DELETE'); showToast('تم الحذف بنجاح', 'success'); loadItems(); }
        catch (e) { showToast(e.message, 'error'); }
      }
    }, 220);
  };
}

/* ============================================
   الراجحي للمحاسبة - المنطق المحسّن v4 Pro (ربط الوحدات بقاعدة البيانات)
   الجزء 3: إضافة وتعديل المواد، الأقسام العامة (عملاء، موردين، تصنيفات)
   ============================================ */

// ========== إضافة مادة (وحدة أساسية نصية + وحدات فرعية نصية) ==========
function showAddItemModal() {
  const catOpts = categoriesCache.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  const body = `
    <div class="form-group"><label class="form-label">اسم المادة</label><input class="input" id="fm-name" type="text" placeholder="مثال: حبر طابعة"></div>
    <div class="form-group"><label class="form-label">التصنيف</label><select class="select" id="fm-category_id"><option value="">بدون تصنيف</option>${catOpts}</select></div>
    <div class="form-group"><label class="form-label" style="font-size:12px;color:var(--text-muted);">أو أضف تصنيف جديد</label><div style="display:flex;gap:8px;"><input class="input" id="fm-new-category" type="text" placeholder="اسم التصنيف..." style="flex:1;"><button class="btn btn-secondary" id="btn-quick-cat" type="button" style="width:auto;padding:0 14px;">${ICONS.plus}</button></div></div>
    <div class="form-group"><label class="form-label">نوع المادة</label><select class="select" id="fm-item_type"><option value="مخزون">مخزون</option><option value="منتج نهائي">منتج نهائي</option><option value="خدمة">خدمة</option></select></div>

    <!-- الوحدة الأساسية -->
    <div class="form-group">
      <label class="form-label">الوحدة الأساسية</label>
      <div style="display:flex;gap:8px;align-items:center;">
        <input class="input" id="fm-base_unit_name" type="text" placeholder="مثال: قطعة" value="قطعة" style="flex:1;">
        <button class="btn btn-secondary" id="btn-toggle-units" type="button" style="width:auto;padding:8px 14px;" title="إضافة وحدات فرعية">${ICONS.plus}</button>
      </div>
    </div>

    <!-- الوحدات الفرعية (مخفية حتى الضغط على +) -->
    <div id="extra-units" style="display:none;">
      <div class="form-group" style="background:var(--bg);border-radius:12px;padding:12px;border:1px solid var(--border);margin-bottom:12px;">
        <label class="form-label">الوحدة الفرعية 1 <span style="color:var(--text-muted);font-size:12px;">(تستند على الوحدة الأساسية)</span></label>
        <div style="display:flex;gap:8px;align-items:flex-end;">
          <div style="flex:1;"><input class="input" id="fm-unit2-name" type="text" placeholder="اسم الوحدة مثال: كرتونة"></div>
          <div style="width:120px;"><label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:4px;">عامل التحويل</label><input class="input" id="fm-unit2-factor" type="number" step="any" min="1" placeholder="مثال: 12" style="width:100%;"></div>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">1 <span class="sub-unit-name">وحدة فرعية 1</span> = <strong class="factor-display">؟</strong> <span class="base-unit-name">قطعة</span></div>
      </div>

      <div class="form-group" style="background:var(--bg);border-radius:12px;padding:12px;border:1px solid var(--border);">
        <label class="form-label">الوحدة الفرعية 2 <span style="color:var(--text-muted);font-size:12px;">(تستند على الوحدة الأساسية)</span></label>
        <div style="display:flex;gap:8px;align-items:flex-end;">
          <div style="flex:1;"><input class="input" id="fm-unit3-name" type="text" placeholder="اسم الوحدة مثال: طرد"></div>
          <div style="width:120px;"><label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:4px;">عامل التحويل</label><input class="input" id="fm-unit3-factor" type="number" step="any" min="1" placeholder="مثال: 10" style="width:100%;"></div>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">1 <span class="sub-unit-name">وحدة فرعية 2</span> = <strong class="factor-display">؟</strong> <span class="base-unit-name">قطعة</span></div>
      </div>
    </div>

    <!-- الكمية الافتتاحية باختيار الوحدة -->
    <div class="form-group" style="background:var(--bg);border-radius:12px;padding:12px;border:1px solid var(--border);">
      <label class="form-label">الكمية الافتتاحية</label>
      <div style="display:flex;gap:8px;align-items:flex-end;">
        <div style="flex:1;"><input class="input" id="fm-quantity" type="number" step="any" placeholder="0"></div>
        <div style="width:150px;"><select class="select" id="fm-qty-unit"><option value="base">الوحدة الأساسية</option><option value="u2">الوحدة الفرعية 1</option><option value="u3">الوحدة الفرعية 2</option></select></div>
      </div>
      <div id="qty-converted" style="font-size:12px;color:var(--text-muted);margin-top:6px;display:none;">= <strong id="qty-base-val">0</strong> <span class="base-unit-name">قطعة</span></div>
    </div>

    <div class="form-group"><label class="form-label">سعر الشراء <span style="color:var(--text-muted);font-size:12px;">(للوحدة الأساسية)</span></label><input class="input" id="fm-purchase_price" type="number" placeholder="0.00"></div>
    <div class="form-group"><label class="form-label">سعر البيع <span style="color:var(--text-muted);font-size:12px;">(للوحدة الأساسية)</span></label><input class="input" id="fm-selling_price" type="number" placeholder="0.00"></div>
  `;

  const modal = openModal({
    title: 'إضافة مادة جديدة',
    bodyHTML: body,
    footerHTML: `<button class="btn btn-secondary" id="fm-cancel">إلغاء</button><button class="btn btn-primary" id="fm-save">${ICONS.check} حفظ</button>`
  });

  const baseNameInput = modal.element.querySelector('#fm-base_unit_name');
  const extraUnitsDiv = modal.element.querySelector('#extra-units');
  const toggleBtn = modal.element.querySelector('#btn-toggle-units');

  // إظهار/إخفاء الوحدات الفرعية
  toggleBtn.onclick = () => {
    const isHidden = extraUnitsDiv.style.display === 'none';
    extraUnitsDiv.style.display = isHidden ? 'block' : 'none';
    toggleBtn.innerHTML = isHidden ? ICONS.x : ICONS.plus;
    toggleBtn.title = isHidden ? 'إخفاء الوحدات الفرعية' : 'إضافة وحدات فرعية';
  };

  // تحديث أسماء الوحدات في الوصف التوضيحي
  const updateUnitLabels = () => {
    const baseName = baseNameInput.value.trim() || 'الوحدة الأساسية';
    modal.element.querySelectorAll('.base-unit-name').forEach(el => el.textContent = baseName);
    
    const u2Name = modal.element.querySelector('#fm-unit2-name').value.trim();
    const u3Name = modal.element.querySelector('#fm-unit3-name').value.trim();
    const subs = modal.element.querySelectorAll('.sub-unit-name');
    const facts = modal.element.querySelectorAll('.factor-display');
    
    if (subs[0]) subs[0].textContent = u2Name || 'وحدة فرعية 1';
    if (subs[1]) subs[1].textContent = u3Name || 'وحدة فرعية 2';
    
    const f2 = modal.element.querySelector('#fm-unit2-factor').value;
    const f3 = modal.element.querySelector('#fm-unit3-factor').value;
    if (facts[0]) facts[0].textContent = f2 || '؟';
    if (facts[1]) facts[1].textContent = f3 || '؟';
  };

  baseNameInput.addEventListener('input', updateUnitLabels);
  modal.element.querySelector('#fm-unit2-name').addEventListener('input', updateUnitLabels);
  modal.element.querySelector('#fm-unit3-name').addEventListener('input', updateUnitLabels);
  modal.element.querySelector('#fm-unit2-factor').addEventListener('input', updateUnitLabels);
  modal.element.querySelector('#fm-unit3-factor').addEventListener('input', updateUnitLabels);

  // تحويل الكمية الافتتاحية تلقائياً
  const qtyInput = modal.element.querySelector('#fm-quantity');
  const qtyUnitSel = modal.element.querySelector('#fm-qty-unit');
  const qtyConvertedDiv = modal.element.querySelector('#qty-converted');
  const qtyBaseVal = modal.element.querySelector('#qty-base-val');

  const updateQty = () => {
    const qty = parseFloat(qtyInput.value) || 0;
    const unit = qtyUnitSel.value;
    const f2 = parseFloat(modal.element.querySelector('#fm-unit2-factor').value) || 1;
    const f3 = parseFloat(modal.element.querySelector('#fm-unit3-factor').value) || 1;
    let baseQty = qty;
    if (unit === 'u2') baseQty = qty * f2;
    else if (unit === 'u3') baseQty = qty * f3;
    
    if (qty > 0 && unit !== 'base') {
      qtyConvertedDiv.style.display = 'block';
      qtyBaseVal.textContent = baseQty;
    } else {
      qtyConvertedDiv.style.display = 'none';
    }
  };
  qtyInput.addEventListener('input', updateQty);
  qtyUnitSel.addEventListener('change', updateQty);
  modal.element.querySelector('#fm-unit2-factor').addEventListener('input', updateQty);
  modal.element.querySelector('#fm-unit3-factor').addEventListener('input', updateQty);

  // إضافة تصنيف سريع
  modal.element.querySelector('#btn-quick-cat').onclick = async () => {
    const input = modal.element.querySelector('#fm-new-category');
    const select = modal.element.querySelector('#fm-category_id');
    const name = input.value.trim();
    if (!name) return showToast('أدخل اسم التصنيف أولاً', 'warning');
    if (categoriesCache.some(x => x.name.toLowerCase() === name.toLowerCase())) return showToast('التصنيف موجود مسبقاً', 'warning');
    try {
      const res = await apiCall(`/definitions?type=category`, 'POST', { type: 'category', name });
      const newId = res?.id || res?.data?.id;
      if (!newId) throw new Error('خطأ في الاستجابة');
      categoriesCache.push({ id: newId, name });
      const o = document.createElement('option');
      o.value = newId; o.textContent = name;
      select.appendChild(o);
      select.value = newId;
      input.value = '';
      showToast('تم إضافة التصنيف واختياره', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };

  modal.element.querySelector('#fm-cancel').onclick = () => modal.close();

  // دالة مساعدة: الحصول على معرف وحدة أو إنشاؤها
  async function getOrCreateUnit(name) {
    if (!name) return null;
    const existing = unitsCache.find(u => u.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;
    const res = await apiCall('/definitions?type=unit', 'POST', { type: 'unit', name, abbreviation: name });
    const newId = res?.id || res?.data?.id;
    if (newId) unitsCache.push({ id: newId, name, abbreviation: name });
    return newId;
  }

    const saveBtn = modal.element.querySelector('#fm-save');
    saveBtn.onclick = async () => {
    if (saveBtn.disabled) return;
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span class="loader-inline"></span> جاري الحفظ...`;

    try {
      const baseUnitName = baseNameInput.value.trim();
      if (!baseUnitName) throw new Error('اسم الوحدة الأساسية مطلوب');

      // إنشاء/الحصول على الوحدات
      const baseUnitId = await getOrCreateUnit(baseUnitName);
      if (!baseUnitId) throw new Error('فشل إنشاء الوحدة الأساسية');

      const u2Name = modal.element.querySelector('#fm-unit2-name').value.trim();
      const u2Factor = parseFloat(modal.element.querySelector('#fm-unit2-factor').value);
      const u3Name = modal.element.querySelector('#fm-unit3-name').value.trim();
      const u3Factor = parseFloat(modal.element.querySelector('#fm-unit3-factor').value);

      let unit2Id = null, unit3Id = null;
      if (u2Name) {
        unit2Id = await getOrCreateUnit(u2Name);
        if (!unit2Id) throw new Error('فشل إنشاء الوحدة الفرعية 1');
      }
      if (u3Name) {
        unit3Id = await getOrCreateUnit(u3Name);
        if (!unit3Id) throw new Error('فشل إنشاء الوحدة الفرعية 2');
      }

      const itemUnits = [];
      if (unit2Id && u2Factor > 0) itemUnits.push({ unit_id: unit2Id, conversion_factor: u2Factor });
      if (unit3Id && u3Factor > 0) itemUnits.push({ unit_id: unit3Id, conversion_factor: u3Factor });

      // حساب الكمية بالوحدة الأساسية حسب اختيار المستخدم
      const qtyEntered = parseFloat(qtyInput.value) || 0;
      const qtyUnit = qtyUnitSel.value;
      let quantity = qtyEntered;
      if (qtyUnit === 'u2' && u2Factor > 0) quantity = qtyEntered * u2Factor;
      else if (qtyUnit === 'u3' && u3Factor > 0) quantity = qtyEntered * u3Factor;

      const values = {
        name: modal.element.querySelector('#fm-name').value.trim(),
        category_id: modal.element.querySelector('#fm-category_id').value || null,
        item_type: modal.element.querySelector('#fm-item_type').value,
        purchase_price: parseFloat(modal.element.querySelector('#fm-purchase_price').value) || 0,
        selling_price: parseFloat(modal.element.querySelector('#fm-selling_price').value) || 0,
        quantity: quantity,
        base_unit_id: baseUnitId,
        item_units: itemUnits
      };

      if (!values.name) throw new Error('اسم المادة مطلوب');
      if (itemsCache.some(i => i.name.toLowerCase() === values.name.toLowerCase())) throw new Error('توجد مادة بنفس الاسم');

      await apiCall('/items', 'POST', values);
      modal.close();
      showToast('تم الحفظ بنجاح', 'success');
      loadItems();
    } catch (e) {
      showToast(e.message, 'error');
      saveBtn.disabled = false;
      saveBtn.innerHTML = `${ICONS.check} حفظ`;
    }
  };
}

// ========== تعديل مادة (وحدة أساسية نصية + وحدات فرعية نصية) ==========
function showEditItemModal(itemId) {
  const it = itemsCache.find(i => i.id === itemId);
  if (!it) return;

  const catOpts = categoriesCache.map(c => `<option value="${c.id}" ${c.id === it.category_id ? 'selected' : ''}>${c.name}</option>`).join('');
  const baseUnitName = it.base_unit?.name || it.base_unit?.abbreviation || 'قطعة';
  const iu = it.item_units || [];
  const iu1 = iu[0] || {};
  const iu2 = iu[1] || {};
  const u1Name = iu1.unit?.name || '';
  const u1Factor = iu1.conversion_factor || '';
  const u2Name = iu2.unit?.name || '';
  const u2Factor = iu2.conversion_factor || '';
  const hasExtraUnits = !!(u1Name || u2Name);

  const body = `
    <div class="form-group"><label class="form-label">اسم المادة</label><input class="input" id="fm-name" type="text" value="${it.name || ''}"></div>
    <div class="form-group"><label class="form-label">التصنيف</label><select class="select" id="fm-category_id"><option value="">بدون تصنيف</option>${catOpts}</select></div>
    <div class="form-group"><label class="form-label" style="font-size:12px;color:var(--text-muted);">أو أضف تصنيف جديد</label><div style="display:flex;gap:8px;"><input class="input" id="fm-new-category" type="text" placeholder="اسم التصنيف..." style="flex:1;"><button class="btn btn-secondary" id="btn-quick-cat" type="button" style="width:auto;padding:0 14px;">${ICONS.plus}</button></div></div>
    <div class="form-group"><label class="form-label">نوع المادة</label><select class="select" id="fm-item_type"><option value="مخزون" ${it.item_type === 'مخزون' ? 'selected' : ''}>مخزون</option><option value="منتج نهائي" ${it.item_type === 'منتج نهائي' ? 'selected' : ''}>منتج نهائي</option><option value="خدمة" ${it.item_type === 'خدمة' ? 'selected' : ''}>خدمة</option></select></div>

    <div class="form-group">
      <label class="form-label">الوحدة الأساسية</label>
      <div style="display:flex;gap:8px;align-items:center;">
        <input class="input" id="fm-base_unit_name" type="text" value="${baseUnitName}" style="flex:1;">
        <button class="btn btn-secondary" id="btn-toggle-units" type="button" style="width:auto;padding:8px 14px;" title="إضافة وحدات فرعية">${hasExtraUnits ? ICONS.x : ICONS.plus}</button>
      </div>
    </div>

    <div id="extra-units" style="display:${hasExtraUnits ? 'block' : 'none'};">
      <div class="form-group" style="background:var(--bg);border-radius:12px;padding:12px;border:1px solid var(--border);margin-bottom:12px;">
        <label class="form-label">الوحدة الفرعية 1 <span style="color:var(--text-muted);font-size:12px;">(تستند على الوحدة الأساسية)</span></label>
        <div style="display:flex;gap:8px;align-items:flex-end;">
          <div style="flex:1;"><input class="input" id="fm-unit2-name" type="text" placeholder="اسم الوحدة مثال: كرتونة" value="${u1Name}"></div>
          <div style="width:120px;"><label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:4px;">عامل التحويل</label><input class="input" id="fm-unit2-factor" type="number" step="any" min="1" placeholder="مثال: 12" value="${u1Factor}" style="width:100%;"></div>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">1 <span class="sub-unit-name">${u1Name || 'وحدة فرعية 1'}</span> = <strong class="factor-display">${u1Factor || '؟'}</strong> <span class="base-unit-name">${baseUnitName}</span></div>
      </div>

      <div class="form-group" style="background:var(--bg);border-radius:12px;padding:12px;border:1px solid var(--border);">
        <label class="form-label">الوحدة الفرعية 2 <span style="color:var(--text-muted);font-size:12px;">(تستند على الوحدة الأساسية)</span></label>
        <div style="display:flex;gap:8px;align-items:flex-end;">
          <div style="flex:1;"><input class="input" id="fm-unit3-name" type="text" placeholder="اسم الوحدة مثال: طرد" value="${u2Name}"></div>
          <div style="width:120px;"><label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:4px;">عامل التحويل</label><input class="input" id="fm-unit3-factor" type="number" step="any" min="1" placeholder="مثال: 10" value="${u2Factor}" style="width:100%;"></div>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">1 <span class="sub-unit-name">${u2Name || 'وحدة فرعية 2'}</span> = <strong class="factor-display">${u2Factor || '؟'}</strong> <span class="base-unit-name">${baseUnitName}</span></div>
      </div>
    </div>

    <div class="form-group" style="background:var(--bg);border-radius:12px;padding:12px;border:1px solid var(--border);">
      <label class="form-label">الكمية الافتتاحية</label>
      <div style="display:flex;gap:8px;align-items:flex-end;">
        <div style="flex:1;"><input class="input" id="fm-quantity" type="number" step="any" value="${it.quantity || 0}"></div>
        <div style="width:150px;"><select class="select" id="fm-qty-unit"><option value="base">الوحدة الأساسية</option><option value="u2">الوحدة الفرعية 1</option><option value="u3">الوحدة الفرعية 2</option></select></div>
      </div>
      <div id="qty-converted" style="font-size:12px;color:var(--text-muted);margin-top:6px;display:none;">= <strong id="qty-base-val">0</strong> <span class="base-unit-name">${baseUnitName}</span></div>
    </div>

    <div class="form-group"><label class="form-label">سعر الشراء <span style="color:var(--text-muted);font-size:12px;">(للوحدة الأساسية)</span></label><input class="input" id="fm-purchase_price" type="number" value="${it.purchase_price || 0}"></div>
    <div class="form-group"><label class="form-label">سعر البيع <span style="color:var(--text-muted);font-size:12px;">(للوحدة الأساسية)</span></label><input class="input" id="fm-selling_price" type="number" value="${it.selling_price || 0}"></div>
  `;

  const modal = openModal({
    title: 'تعديل المادة',
    bodyHTML: body,
    footerHTML: `<button class="btn btn-secondary" id="fm-cancel">إلغاء</button><button class="btn btn-primary" id="fm-save">${ICONS.check} حفظ</button>`
  });

  const baseNameInput = modal.element.querySelector('#fm-base_unit_name');
  const extraUnitsDiv = modal.element.querySelector('#extra-units');
  const toggleBtn = modal.element.querySelector('#btn-toggle-units');

  toggleBtn.onclick = () => {
    const isHidden = extraUnitsDiv.style.display === 'none';
    extraUnitsDiv.style.display = isHidden ? 'block' : 'none';
    toggleBtn.innerHTML = isHidden ? ICONS.x : ICONS.plus;
    toggleBtn.title = isHidden ? 'إخفاء الوحدات الفرعية' : 'إضافة وحدات فرعية';
  };

  const updateUnitLabels = () => {
    const baseName = baseNameInput.value.trim() || 'الوحدة الأساسية';
    modal.element.querySelectorAll('.base-unit-name').forEach(el => el.textContent = baseName);
    
    const u2Name = modal.element.querySelector('#fm-unit2-name').value.trim();
    const u3Name = modal.element.querySelector('#fm-unit3-name').value.trim();
    const subs = modal.element.querySelectorAll('.sub-unit-name');
    const facts = modal.element.querySelectorAll('.factor-display');
    
    if (subs[0]) subs[0].textContent = u2Name || 'وحدة فرعية 1';
    if (subs[1]) subs[1].textContent = u3Name || 'وحدة فرعية 2';
    
    const f2 = modal.element.querySelector('#fm-unit2-factor').value;
    const f3 = modal.element.querySelector('#fm-unit3-factor').value;
    if (facts[0]) facts[0].textContent = f2 || '؟';
    if (facts[1]) facts[1].textContent = f3 || '؟';
  };

  baseNameInput.addEventListener('input', updateUnitLabels);
  modal.element.querySelector('#fm-unit2-name').addEventListener('input', updateUnitLabels);
  modal.element.querySelector('#fm-unit3-name').addEventListener('input', updateUnitLabels);
  modal.element.querySelector('#fm-unit2-factor').addEventListener('input', updateUnitLabels);
  modal.element.querySelector('#fm-unit3-factor').addEventListener('input', updateUnitLabels);

  const qtyInput = modal.element.querySelector('#fm-quantity');
  const qtyUnitSel = modal.element.querySelector('#fm-qty-unit');
  const qtyConvertedDiv = modal.element.querySelector('#qty-converted');
  const qtyBaseVal = modal.element.querySelector('#qty-base-val');

  const updateQty = () => {
    const qty = parseFloat(qtyInput.value) || 0;
    const unit = qtyUnitSel.value;
    const f2 = parseFloat(modal.element.querySelector('#fm-unit2-factor').value) || 1;
    const f3 = parseFloat(modal.element.querySelector('#fm-unit3-factor').value) || 1;
    let baseQty = qty;
    if (unit === 'u2') baseQty = qty * f2;
    else if (unit === 'u3') baseQty = qty * f3;
    
    if (qty > 0 && unit !== 'base') {
      qtyConvertedDiv.style.display = 'block';
      qtyBaseVal.textContent = baseQty;
    } else {
      qtyConvertedDiv.style.display = 'none';
    }
  };
  qtyInput.addEventListener('input', updateQty);
  qtyUnitSel.addEventListener('change', updateQty);
  modal.element.querySelector('#fm-unit2-factor').addEventListener('input', updateQty);
  modal.element.querySelector('#fm-unit3-factor').addEventListener('input', updateQty);

  modal.element.querySelector('#btn-quick-cat').onclick = async () => {
    const input = modal.element.querySelector('#fm-new-category');
    const select = modal.element.querySelector('#fm-category_id');
    const name = input.value.trim();
    if (!name) return showToast('أدخل اسم التصنيف أولاً', 'warning');
    if (categoriesCache.some(x => x.name.toLowerCase() === name.toLowerCase())) return showToast('التصنيف موجود مسبقاً', 'warning');
    try {
      const res = await apiCall(`/definitions?type=category`, 'POST', { type: 'category', name });
      const newId = res?.id || res?.data?.id;
      if (!newId) throw new Error('خطأ في الاستجابة');
      categoriesCache.push({ id: newId, name });
      const o = document.createElement('option');
      o.value = newId; o.textContent = name;
      select.appendChild(o);
      select.value = newId;
      input.value = '';
      showToast('تم إضافة التصنيف واختياره', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };

  modal.element.querySelector('#fm-cancel').onclick = () => modal.close();

  async function getOrCreateUnit(name) {
    if (!name) return null;
    const existing = unitsCache.find(u => u.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;
    const res = await apiCall('/definitions?type=unit', 'POST', { type: 'unit', name, abbreviation: name });
    const newId = res?.id || res?.data?.id;
    if (newId) unitsCache.push({ id: newId, name, abbreviation: name });
    return newId;
  }

  const saveBtn = modal.element.querySelector('#fm-save');
  saveBtn.onclick = async () => {
    if (saveBtn.disabled) return;
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span class="loader-inline"></span> جاري الحفظ...`;

    try {
      const baseUnitName = baseNameInput.value.trim();
      if (!baseUnitName) throw new Error('اسم الوحدة الأساسية مطلوب');

      const baseUnitId = await getOrCreateUnit(baseUnitName);
      if (!baseUnitId) throw new Error('فشل إنشاء الوحدة الأساسية');

      const u2Name = modal.element.querySelector('#fm-unit2-name').value.trim();
      const u2Factor = parseFloat(modal.element.querySelector('#fm-unit2-factor').value);
      const u3Name = modal.element.querySelector('#fm-unit3-name').value.trim();
      const u3Factor = parseFloat(modal.element.querySelector('#fm-unit3-factor').value);

      let unit2Id = null, unit3Id = null;
      if (u2Name) {
        unit2Id = await getOrCreateUnit(u2Name);
        if (!unit2Id) throw new Error('فشل إنشاء الوحدة الفرعية 1');
      }
      if (u3Name) {
        unit3Id = await getOrCreateUnit(u3Name);
        if (!unit3Id) throw new Error('فشل إنشاء الوحدة الفرعية 2');
      }

      const itemUnits = [];
      if (unit2Id && u2Factor > 0) itemUnits.push({ unit_id: unit2Id, conversion_factor: u2Factor });
      if (unit3Id && u3Factor > 0) itemUnits.push({ unit_id: unit3Id, conversion_factor: u3Factor });

      const qtyEntered = parseFloat(qtyInput.value) || 0;
      const qtyUnit = qtyUnitSel.value;
      let quantity = qtyEntered;
      if (qtyUnit === 'u2' && u2Factor > 0) quantity = qtyEntered * u2Factor;
      else if (qtyUnit === 'u3' && u3Factor > 0) quantity = qtyEntered * u3Factor;

      const values = {
        name: modal.element.querySelector('#fm-name').value.trim(),
        category_id: modal.element.querySelector('#fm-category_id').value || null,
        item_type: modal.element.querySelector('#fm-item_type').value,
        purchase_price: parseFloat(modal.element.querySelector('#fm-purchase_price').value) || 0,
        selling_price: parseFloat(modal.element.querySelector('#fm-selling_price').value) || 0,
        quantity: quantity,
        base_unit_id: baseUnitId,
        item_units: itemUnits
      };

      await apiCall('/items', 'PUT', { id: itemId, ...values });
      modal.close();
      showToast('تم الحفظ بنجاح', 'success');
      loadItems();
    } catch (e) {
      showToast(e.message, 'error');
      saveBtn.disabled = false;
      saveBtn.innerHTML = `${ICONS.check} حفظ`;
    }
  };
}

// ========== الأقسام العامة (عملاء، موردين، تصنيفات) ==========
function buildGenericItemHtml(item, opts) {
  const info = opts.extraFields.map(f => {
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
  try {
    const data = await apiCall(options.apiBase, 'GET');
    if (options.apiBase === '/customers') customersCache = data;
    else if (options.apiBase === '/suppliers') suppliersCache = data;
    else if (options.apiBase === '/definitions?type=category') categoriesCache = data;

    let html = `<div class="card"><div class="card-header"><div><h3 class="card-title">${options.titlePlural || options.title}</h3></div><button class="btn btn-primary btn-sm add-btn" data-type="${options.apiBase}">${ICONS.plus} إضافة</button></div></div>`;
    if (!data || !data.length) html += emptyState(`لا يوجد ${options.titlePlural || options.title}`, 'ابدأ بإضافة أول سجل');
    else data.forEach(item => { html += buildGenericItemHtml(item, options); });
    document.getElementById('tab-content').innerHTML = html;
  } catch (err) { showToast(err.message, 'error'); }
}

function getSectionOptions(key) {
  switch(key) {
    case '/customers':
      return {
        cache: customersCache, title: 'عميل', titlePlural: 'العملاء', apiBase: '/customers', idField: 'id', nameField: 'name',
        extraFields: [{ key: 'balance', prefix: 'الرصيد: ' }, { key: 'phone', prefix: '📞 ' }],
        addFields: [{ id: 'name', label: 'الاسم', placeholder: 'اسم العميل' }, { id: 'phone', label: 'الهاتف', placeholder: 'رقم الهاتف' }, { id: 'address', label: 'العنوان', placeholder: 'العنوان' }],
        editFields: [{ id: 'name', label: 'الاسم' }, { id: 'phone', label: 'الهاتف' }, { id: 'address', label: 'العنوان' }],
        prepareAdd: v => ({ name: v.name, phone: v.phone || null, address: v.address || null }),
        prepareEdit: (id, v) => ({ id, ...v })
      };
    case '/suppliers':
      return {
        cache: suppliersCache, title: 'مورد', titlePlural: 'الموردين', apiBase: '/suppliers', idField: 'id', nameField: 'name',
        extraFields: [{ key: 'balance', prefix: 'الرصيد: ' }, { key: 'phone', prefix: '📞 ' }],
        addFields: [{ id: 'name', label: 'الاسم', placeholder: 'اسم المورد' }, { id: 'phone', label: 'الهاتف', placeholder: 'رقم الهاتف' }, { id: 'address', label: 'العنوان', placeholder: 'العنوان' }],
        editFields: [{ id: 'name', label: 'الاسم' }, { id: 'phone', label: 'الهاتف' }, { id: 'address', label: 'العنوان' }],
        prepareAdd: v => ({ name: v.name, phone: v.phone || null, address: v.address || null }),
        prepareEdit: (id, v) => ({ id, ...v })
      };
    case '/definitions?type=category':
      return {
        cache: categoriesCache, title: 'تصنيف', titlePlural: 'التصنيفات', apiBase: '/definitions?type=category', idField: 'id', nameField: 'name',
        extraFields: [],
        addFields: [{ id: 'name', label: 'اسم التصنيف', placeholder: 'اسم التصنيف' }],
        editFields: [{ id: 'name', label: 'اسم التصنيف' }],
        prepareAdd: v => ({ type: 'category', name: v.name }),
        prepareEdit: (id, v) => ({ type: 'category', id, name: v.name })
      };
    default: return null;
  }
}

// مستمعات النقر على الأزرار العامة (add/edit/delete)
document.addEventListener('click', async (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.classList.contains('add-btn')) {
    const opts = getSectionOptions(t.dataset.type); if (!opts) return;
    showFormModal({
      title: `إضافة ${opts.title} جديد`, fields: opts.addFields,
      onSave: async (values) => {
        if (values.name?.trim() && opts.cache.some(x => x.name?.toLowerCase() === values.name.trim().toLowerCase())) throw new Error(`يوجد ${opts.title} بنفس الاسم`);
        return apiCall(opts.apiBase, 'POST', opts.prepareAdd(values));
      },
      onSuccess: () => loadGenericSection(opts)
    });
  } else if (t.classList.contains('edit-btn')) {
    const opts = getSectionOptions(t.dataset.type); if (!opts) return;
    const id = t.dataset.id; const item = opts.cache.find(x => x[opts.idField] == id); if (!item) return;
    const init = {}; opts.editFields.forEach(f => init[f.id] = item[f.id] ?? '');
    showFormModal({ title: `تعديل ${opts.title}`, fields: opts.editFields, initialValues: init, onSave: v => apiCall(opts.apiBase, 'PUT', opts.prepareEdit(id, v)), onSuccess: () => loadGenericSection(opts) });
  } else if (t.classList.contains('delete-btn')) {
    const opts = getSectionOptions(t.dataset.type); if (!opts) return;
    const id = t.dataset.id; const found = opts.cache.find(x => x[opts.idField] == id);
    if (!await confirmDialog(`هل أنت متأكد من حذف ${opts.title} <strong>${found?.[opts.nameField] || ''}</strong>؟`)) return;
    try {
      const delUrl = opts.apiBase.includes('?') ? `${opts.apiBase}&id=${id}` : `${opts.apiBase}?id=${id}`;
      await apiCall(delUrl, 'DELETE'); showToast('تم الحذف بنجاح', 'success'); loadGenericSection(opts);
    } catch (err) { showToast(err.message, 'error'); }
  }
});

/* ============================================
   الراجحي للمحاسبة - المنطق المحسّن v4 Pro (ربط الوحدات بقاعدة البيانات)
   الجزء 4: فاتورة المبيعات والمشتريات مع وحدات من قاعدة البيانات (معدّل لدعم التعديل)
   ============================================ */

// دالة مساعدة: توليد صف بند (تستخدم في الإنشاء والتعديل)
function generateLineRowHtml(lineData = null, isSale) {
  const selectedItemId = lineData ? lineData.item_id : '';
  const qty = lineData ? lineData.quantity : '';
  const price = lineData ? lineData.unit_price : '';
  const total = lineData ? lineData.total : '';
  const unitId = lineData ? lineData.unit_id : '';
  
  const itemOptions = itemsCache.map(i => `<option value="${i.id}" ${i.id == selectedItemId ? 'selected' : ''}>${i.name}</option>`).join('');
  
  return `
    <div class="line-row">
      <div class="form-group" style="grid-column:1/-1">
        <select class="select item-select"><option value="">اختر مادة</option>${itemOptions}</select>
      </div>
      <div class="form-group">
        <select class="select unit-select" style="${selectedItemId ? '' : 'display:none;'}">
          ${selectedItemId ? getUnitOptionsForItem(selectedItemId, unitId) : '<option value="">الوحدة</option>'}
        </select>
      </div>
      <div class="form-group"><input type="number" step="any" class="input qty-input" placeholder="الكمية" value="${qty}"></div>
      <div class="form-group"><input type="number" step="0.01" class="input price-input" placeholder="السعر" value="${price}"></div>
      <div class="form-group"><input type="number" step="0.01" class="input total-input" placeholder="الإجمالي" readonly style="background:var(--bg);font-weight:700;" value="${total}"></div>
      <button class="line-remove" title="حذف البند">${ICONS.trash}</button>
    </div>`;
}

// دالة مساعدة: خيارات الوحدات لعنصر محدد مع اختيار الوحدة الحالية
function getUnitOptionsForItem(itemId, selectedUnitId = null) {
  const item = itemsCache.find(i => i.id == itemId);
  if (!item) return '<option value="">اختر مادة</option>';
  const baseUnit = item.base_unit || {};
  const baseName = baseUnit.name || baseUnit.abbreviation || 'قطعة';
  let opts = `<option value="" data-factor="1" ${!selectedUnitId ? 'selected' : ''}>${baseName} (أساسية)</option>`;
  (item.item_units || []).forEach(iu => {
    const u = iu.unit || {};
    const name = u.name || u.abbreviation || 'وحدة';
    opts += `<option value="${iu.unit_id}" data-factor="${iu.conversion_factor}" ${iu.unit_id == selectedUnitId ? 'selected' : ''}>${name} (${iu.conversion_factor}x ${baseName})</option>`;
  });
  return opts;
}

// دالة تعديل الفاتورة (جديدة)
async function editInvoice(invoiceId) {
  const invoice = invoicesCache.find(inv => inv.id === invoiceId);
  if (!invoice) {
    showToast('الفاتورة غير موجودة', 'error');
    return;
  }
  showInvoiceModal(invoice.type, { mode: 'edit', invoiceData: invoice });
}

// ===== فاتورة (بيع / شراء) – مع تحديث المخزون والتحقق من الكميات =====
async function showInvoiceModal(type) {
  try {
    customersCache = await apiCall('/customers', 'GET');
    suppliersCache = await apiCall('/suppliers', 'GET');
    itemsCache = await apiCall('/items', 'GET');
    unitsCache = await apiCall('/definitions?type=unit', 'GET');

    const entOpts = type === 'sale'
      ? `<option value="cash">عميل نقدي</option>${customersCache.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}`
      : `<option value="cash">مورد نقدي</option>${suppliersCache.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}`;

    const body = `
      <input type="hidden" id="inv-type" value="${type}">
      <div class="invoice-lines" id="inv-lines">
        <div class="line-row">
          <div class="form-group" style="grid-column:1/-1"><select class="select item-select"><option value="">اختر مادة</option>${itemsCache.map(i => `<option value="${i.id}" data-price="${type === 'sale' ? i.selling_price : i.purchase_price}">${i.name}</option>`).join('')}</select></div>
          <div class="form-group"><select class="select unit-select" style="display:none;"><option value="">الوحدة</option></select></div>
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
      </div>`;

    const modal = openModal({ title: `فاتورة ${type === 'sale' ? 'مبيعات' : 'مشتريات'}`, bodyHTML: body, footerHTML: `<button class="btn btn-secondary" id="inv-cancel">إلغاء</button><button class="btn btn-primary" id="inv-save">${ICONS.check} حفظ الفاتورة</button>` });
    const container = modal.element;

    // === دوال مساعدة للوحدات والحسابات ===
    const updateGrandTotal = () => {
      let total = 0;
      container.querySelectorAll('.total-input').forEach(inp => total += parseFloat(inp.value) || 0);
      container.querySelector('#inv-grand-total').textContent = formatNumber(total);
    };

    function isDup(itemId, currentRow) {
      if (!itemId) return false;
      let found = false;
      container.querySelectorAll('.line-row').forEach(r => {
        if (r !== currentRow && r.querySelector('.item-select')?.value === itemId) found = true;
      });
      return found;
    }

    function getUnitOptions(item) {
      if (!item) return '<option value="">اختر مادة</option>';
      const baseUnit = unitsCache.find(u => u.id == item.base_unit_id) || {};
      const baseName = baseUnit.name || 'قطعة';
      let opts = `<option value="" data-factor="1">${baseName} (أساسية)</option>`;
      (item.item_units || []).forEach(iu => {
        const unit = unitsCache.find(u => u.id == iu.unit_id) || {};
        opts += `<option value="${iu.unit_id}" data-factor="${iu.conversion_factor}">${unit.name || unit.abbreviation || 'وحدة'} (×${iu.conversion_factor})</option>`;
      });
      return opts;
    }

    function autoFill(selectEl, priceEl, unitSelectEl) {
      const itemId = selectEl.value;
      if (!itemId) {
        priceEl.value = '';
        if (unitSelectEl) { unitSelectEl.innerHTML = '<option value="">اختر مادة</option>'; unitSelectEl.style.display = 'none'; }
        return;
      }
      const item = itemsCache.find(i => i.id == itemId);
      if (item) {
        const basePrice = type === 'sale' ? (item.selling_price || 0) : (item.purchase_price || 0);
        priceEl.value = basePrice;
        if (unitSelectEl) {
          unitSelectEl.innerHTML = getUnitOptions(item);
          unitSelectEl.style.display = 'block';
          unitSelectEl.dataset.basePrice = basePrice;
        }
        const row = selectEl.closest('.line-row');
        const qtyInput = row.querySelector('.qty-input');
        const totalInput = row.querySelector('.total-input');
        if (qtyInput && totalInput) {
          totalInput.value = ((parseFloat(qtyInput.value) || 0) * basePrice).toFixed(2);
        }
        updateGrandTotal();
      }
    }

    function calcRow(row) {
      const qty = parseFloat(row.querySelector('.qty-input')?.value) || 0;
      const price = parseFloat(row.querySelector('.price-input')?.value) || 0;
      row.querySelector('.total-input').value = (qty * price).toFixed(2);
      updateGrandTotal();
    }

    function handleUnitChange(row) {
      const sel = row.querySelector('.item-select');
      const unitSel = row.querySelector('.unit-select');
      const priceEl = row.querySelector('.price-input');
      if (!sel || !unitSel || !priceEl) return;
      const item = itemsCache.find(i => i.id == sel.value);
      if (!item) return;
      const factor = parseFloat(unitSel.selectedOptions[0]?.dataset.factor || 1);
      const basePrice = parseFloat(unitSel.dataset.basePrice || 0);
      priceEl.value = (basePrice * factor).toFixed(2);
      calcRow(row);
    }

    // تجهيز الصفوف الأولى
    container.querySelectorAll('.line-row').forEach(row => {
      const sel = row.querySelector('.item-select');
      const price = row.querySelector('.price-input');
      const unitSel = row.querySelector('.unit-select');
      if (sel && price) autoFill(sel, price, unitSel);
      sel?.addEventListener('change', function () {
        if (isDup(this.value, this.closest('.line-row'))) {
          showToast('المادة مضافة مسبقاً', 'warning');
          this.value = '';
          price.value = '';
          if (unitSel) unitSel.style.display = 'none';
          return;
        }
        autoFill(this, price, unitSel);
      });
      row.querySelector('.qty-input')?.addEventListener('input', () => calcRow(row));
      row.querySelector('.price-input')?.addEventListener('input', () => calcRow(row));
      unitSel?.addEventListener('change', () => handleUnitChange(row));
    });

    // إضافة بند جديد
    container.querySelector('#btn-add-line').addEventListener('click', () => {
      const linesContainer = container.querySelector('#inv-lines');
      const nl = document.createElement('div');
      nl.className = 'line-row';
      nl.innerHTML = `
        <div class="form-group" style="grid-column:1/-1"><select class="select item-select"><option value="">اختر مادة</option>${itemsCache.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}</select></div>
        <div class="form-group"><select class="select unit-select" style="display:none;"><option value="">الوحدة</option></select></div>
        <div class="form-group"><input type="number" step="any" class="input qty-input" placeholder="الكمية"></div>
        <div class="form-group"><input type="number" step="0.01" class="input price-input" placeholder="السعر"></div>
        <div class="form-group"><input type="number" step="0.01" class="input total-input" placeholder="الإجمالي" readonly style="background:var(--bg);font-weight:700;"></div>
        <button class="line-remove">${ICONS.trash}</button>`;
      linesContainer.appendChild(nl);

      const newSel = nl.querySelector('.item-select');
      const newPrice = nl.querySelector('.price-input');
      const newUnit = nl.querySelector('.unit-select');
      newSel.addEventListener('change', function () {
        if (isDup(this.value, this.closest('.line-row'))) {
          showToast('المادة مضافة مسبقاً', 'warning');
          this.value = '';
          newPrice.value = '';
          if (newUnit) newUnit.style.display = 'none';
          return;
        }
        autoFill(this, newPrice, newUnit);
      });
      nl.querySelector('.qty-input').addEventListener('input', () => calcRow(nl));
      nl.querySelector('.price-input').addEventListener('input', () => calcRow(nl));
      newUnit?.addEventListener('change', () => handleUnitChange(nl));
      nl.querySelector('.line-remove').addEventListener('click', () => {
        if (linesContainer.querySelectorAll('.line-row').length > 1) {
          nl.remove();
          updateGrandTotal();
        }
      });
    });

    modal.element.querySelector('#inv-cancel').onclick = () => modal.close();

// === حفظ الفاتورة مع التحقق من المخزون الديناميكي (available) ===
modal.element.querySelector('#inv-save').onclick = async () => {
  const btn = container.querySelector('#inv-save');
  
  // ✅ حماية من النقر المتكرر أثناء بطء الشبكة
  if (btn.disabled) return;
  
  // تجميع بيانات البنود
  const lines = [];
  const rows = container.querySelectorAll('.line-row');
  let dupCheck = new Set();
  for (const row of rows) {
    const itemId = row.querySelector('.item-select')?.value || null;
    if (itemId) {
      if (dupCheck.has(itemId)) return showToast('لا يمكن تكرار نفس المادة', 'error');
      dupCheck.add(itemId);
    }
    const unitSel = row.querySelector('.unit-select');
    const unitId = unitSel?.value || null;
    const factor = parseFloat(unitSel?.selectedOptions[0]?.dataset.factor || 1);
    const qty = parseFloat(row.querySelector('.qty-input')?.value) || 0;
    const price = parseFloat(row.querySelector('.price-input')?.value) || 0;
    const total = parseFloat(row.querySelector('.total-input')?.value) || 0;
    const basePrice = factor !== 0 ? price / factor : price;
    if (itemId || qty > 0) {
      lines.push({
        item_id: itemId,
        unit_id: unitId || null,
        quantity: qty,
        unit_price: parseFloat(basePrice.toFixed(2)),
        conversion_factor: factor,
        total: total
      });
    }
  }
  if (!lines.length) return showToast('أضف بنداً واحداً على الأقل', 'error');

  // تعطيل الزر وإظهار التحميل
  btn.disabled = true;
  btn.innerHTML = '<span class="loader-inline"></span> جاري الحفظ...';

  // التحقق من المخزون (للبيع) باستخدام الكمية المتاحة ديناميكياً
  if (type === 'sale') {
    for (const line of lines) {
      const item = itemsCache.find(i => i.id == line.item_id);
      if (item) {
        const deductedQty = line.quantity * (line.conversion_factor || 1);
        if ((item.available || 0) < deductedQty) {
          showToast(`المادة "${item.name}" غير متوفرة بالكمية المطلوبة`, 'error');
          btn.disabled = false;
          btn.innerHTML = `${ICONS.check} حفظ الفاتورة`;
          return;
        }
      }
    }
  }

  try {
    await apiCall('/invoices', 'POST', {
      type,
      customer_id: type === 'sale' && container.querySelector('#inv-entity').value !== 'cash' ? container.querySelector('#inv-entity').value : null,
      supplier_id: type === 'purchase' && container.querySelector('#inv-entity').value !== 'cash' ? container.querySelector('#inv-entity').value : null,
      date: container.querySelector('#inv-date').value,
      reference: container.querySelector('#inv-ref').value.trim(),
      notes: container.querySelector('#inv-notes').value.trim(),
      lines,
      total: lines.reduce((s, l) => s + l.total, 0),
      paid_amount: parseFloat(container.querySelector('#inv-paid').value) || 0
    });

    itemsCache = await apiCall('/items', 'GET');
    modal.close();
    showToast('تم حفظ الفاتورة بنجاح', 'success');
    loadInvoices();
  } catch (e) {
    showToast(e.message, 'error');
    btn.disabled = false;
    btn.innerHTML = `${ICONS.check} حفظ الفاتورة`;
  }
};
}

// ========== أحداث الفاتورة (مُعدَّلة) ==========
function attachInvoiceEvents(invoiceType, container, mode = 'create', editData = null) {
  const linesContainer = container.querySelector('#inv-lines');
  if (!linesContainer) return;

  function updateGrandTotal() {
    let total = 0;
    container.querySelectorAll('.total-input').forEach(inp => total += parseFloat(inp.value) || 0);
    const el = container.querySelector('#inv-grand-total'); if (el) el.textContent = formatNumber(total);
  }

  function isDup(id, cur) {
    if (!id) return false;
    let found = false;
    container.querySelectorAll('.line-row').forEach(r => { if (r !== cur && r.querySelector('.item-select')?.value === id) found = true; });
    return found;
  }

  function getUnitOptions(item) {
    if (!item) return '<option value="">اختر مادة</option>';
    const baseUnit = item.base_unit || {};
    const baseUnitName = baseUnit.name || baseUnit.abbreviation || 'قطعة';
    let opts = `<option value="" data-factor="1">${baseUnitName} (أساسية)</option>`;
    const itemUnits = item.item_units || [];
    itemUnits.forEach(iu => {
      const unit = iu.unit || {};
      const unitName = unit.name || unit.abbreviation || 'وحدة';
      opts += `<option value="${iu.unit_id}" data-factor="${iu.conversion_factor}">${unitName} (${iu.conversion_factor}x ${baseUnitName})</option>`;
    });
    return opts;
  }

  function autoFill(sel, pr, unitSel) {
    const id = sel.value;
    if (!id) { pr.value = ''; if (unitSel) { unitSel.innerHTML = '<option value="">اختر مادة</option>'; unitSel.style.display = 'none'; } return; }
    const item = itemsCache.find(i => i.id == id);
    if (item) {
      const basePrice = invoiceType === 'sale' ? (item.selling_price || 0) : (item.purchase_price || 0);
      pr.value = basePrice;
      if (unitSel) { 
        unitSel.innerHTML = getUnitOptions(item); 
        unitSel.style.display = 'block'; 
        unitSel.dataset.basePrice = basePrice; 
      }
      const row = sel.closest('.line-row');
      const qty = row.querySelector('.qty-input'), tot = row.querySelector('.total-input');
      if (qty && tot) tot.value = (parseFloat(qty.value) || 0) * basePrice;
      updateGrandTotal();
    }
  }

  function calc(row) {
    const qty = parseFloat(row.querySelector('.qty-input')?.value) || 0;
    const pr = parseFloat(row.querySelector('.price-input')?.value) || 0;
    const tot = row.querySelector('.total-input');
    if (tot) { tot.value = (qty * pr).toFixed(2); updateGrandTotal(); }
  }

  function handleUnitChange(row) {
    const sel = row.querySelector('.item-select'), unitSel = row.querySelector('.unit-select'), pr = row.querySelector('.price-input');
    const item = itemsCache.find(i => i.id == sel.value);
    if (!item || !unitSel) return;
    const factor = parseFloat(unitSel.selectedOptions[0]?.dataset.factor || 1);
    const basePrice = parseFloat(unitSel.dataset.basePrice || 0);
    pr.value = (basePrice * factor).toFixed(2);
    calc(row);
  }

  container.querySelectorAll('.line-row').forEach(row => {
    const sel = row.querySelector('.item-select'), pr = row.querySelector('.price-input'), unitSel = row.querySelector('.unit-select');
    if (sel && pr) autoFill(sel, pr, unitSel);
    sel?.addEventListener('change', function() {
      if (isDup(this.value, this.closest('.line-row'))) { showToast('المادة مضافة مسبقاً', 'warning'); this.value = ''; pr.value = ''; if (unitSel) unitSel.style.display = 'none'; return; }
      autoFill(this, pr, unitSel);
    });
    row.querySelector('.qty-input')?.addEventListener('input', () => calc(row));
    row.querySelector('.price-input')?.addEventListener('input', () => calc(row));
    unitSel?.addEventListener('change', () => handleUnitChange(row));
  });

  container.querySelector('#btn-add-line')?.addEventListener('click', () => {
    const nl = document.createElement('div'); nl.className = 'line-row';
    nl.innerHTML = generateLineRowHtml(null, invoiceType === 'sale');
    linesContainer.appendChild(nl);
    const sel = nl.querySelector('.item-select'), pr = nl.querySelector('.price-input'), unitSel = nl.querySelector('.unit-select');
    sel.addEventListener('change', function() {
      if (isDup(this.value, this.closest('.line-row'))) { showToast('المادة مضافة مسبقاً', 'warning'); this.value = ''; pr.value = ''; if (unitSel) unitSel.style.display = 'none'; return; }
      autoFill(this, pr, unitSel);
    });
    nl.querySelector('.qty-input').addEventListener('input', () => calc(nl));
    nl.querySelector('.price-input').addEventListener('input', () => calc(nl));
    unitSel?.addEventListener('change', () => handleUnitChange(nl));
    nl.querySelector('.line-remove').addEventListener('click', () => {
      if (linesContainer.querySelectorAll('.line-row').length > 1) { nl.remove(); updateGrandTotal(); }
    });
  });
}

/* ============================================
   الراجحي للمحاسبة - المنطق المحسّن v4 Pro (ربط الوحدات بقاعدة البيانات)
   الجزء 5: قائمة الفواتير، المدفوعات، المصاريف، لوحة التحكم، التقارير، بدء التطبيق
   ============================================ */

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
      <div id="invoices-list"></div>`;
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
  if (!data.length) return container.innerHTML = emptyState('لا توجد فواتير مطابقة', 'جرب تغيير معايير البحث');

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
          <button class="btn btn-secondary btn-sm view-invoice-btn" data-id="${inv.id}">${ICONS.fileText} عرض</button>
          <button class="btn btn-primary btn-sm print-invoice-btn" data-id="${inv.id}">${ICONS.print} طباعة</button>
          <button class="btn btn-success btn-sm send-invoice-btn" data-id="${inv.id}">${ICONS.file} إرسال</button>
          <button class="btn btn-warning btn-sm edit-invoice-btn" data-id="${inv.id}">${ICONS.edit} تعديل</button>
          <button class="btn btn-danger btn-sm delete-invoice-btn" data-id="${inv.id}">${ICONS.trash} حذف</button>
        </div>
      </div>`;
  });
  container.innerHTML = html;

  // ========== زر عرض التفاصيل ==========
  container.querySelectorAll('.view-invoice-btn').forEach(b => b.addEventListener('click', e => {
    const id = parseInt(e.target.closest('button').dataset.id);
    const inv = invoicesCache.find(i => i.id === id);
    if (inv) showInvoiceDetail(inv);
  }));

  // ========== زر الطباعة (مُصلح - تصميم واضح) ==========
  container.querySelectorAll('.print-invoice-btn').forEach(b => b.addEventListener('click', e => {
    const id = parseInt(e.target.closest('button').dataset.id);
    const inv = invoicesCache.find(i => i.id === id);
    if (!inv) {
      showToast('الفاتورة غير موجودة', 'error');
      return;
    }

    const formatModal = openModal({
      title: 'اختيار تنسيق الطباعة',
      bodyHTML: `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 8px 0;">
          <!-- A4 Option -->
          <div class="format-option" data-format="a4" style="
            border: 2px solid #e2e8f0; 
            border-radius: 12px; 
            padding: 20px 12px; 
            text-align: center; 
            cursor: pointer; 
            transition: all 0.2s;
            background: #ffffff;
          ">
            <div style="font-size: 40px; margin-bottom: 8px;">📄</div>
            <div style="font-weight: 800; font-size: 15px; margin-bottom: 4px; color: #1e293b;">A4 رسمية</div>
            <div style="font-size: 12px; color: #64748b; line-height: 1.4;">فاتورة كاملة<br>للطباعة على A4</div>
          </div>
          
          <!-- Thermal Option -->
          <div class="format-option" data-format="thermal" style="
            border: 2px solid #e2e8f0; 
            border-radius: 12px; 
            padding: 20px 12px; 
            text-align: center; 
            cursor: pointer; 
            transition: all 0.2s;
            background: #ffffff;
          ">
            <div style="font-size: 40px; margin-bottom: 8px;">🧾</div>
            <div style="font-weight: 800; font-size: 15px; margin-bottom: 4px; color: #1e293b;">حرارية 80mm</div>
            <div style="font-size: 12px; color: #64748b; line-height: 1.4;">للطابعة الحرارية<br>الصغيرة</div>
          </div>
        </div>
        
        <!-- Preview Checkbox -->
        <div style="margin-top: 16px; padding: 14px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0;">
          <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
            <input type="checkbox" id="preview-check" checked style="width: 18px; height: 18px; accent-color: #4f46e5;">
            <span style="font-size: 14px; color: #1e293b; font-weight: 600;">عرض معاينة قبل الطباعة</span>
          </label>
        </div>
      `,
      footerHTML: `
        <button class="btn btn-secondary" id="format-cancel" style="flex: 1; padding: 12px;">إلغاء</button>
        <button class="btn btn-primary" id="format-confirm" style="flex: 1; padding: 12px; font-weight: 700;">
          🖨️ متابعة
        </button>
      `
    });

    // Selection logic - DARK background when selected
    const selectOption = (selected) => {
      formatModal.element.querySelectorAll('.format-option').forEach(o => {
        o.style.borderColor = '#e2e8f0';
        o.style.background = '#ffffff';
        o.style.boxShadow = 'none';
        // Reset text to dark
        const title = o.querySelector('div:nth-child(2)');
        const desc = o.querySelector('div:nth-child(3)');
        if (title) title.style.color = '#1e293b';
        if (desc) desc.style.color = '#64748b';
      });
      
      // Selected state - DARK BLUE background with WHITE text
      selected.style.borderColor = '#4f46e5';
      selected.style.background = '#4f46e5';
      selected.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)';
      
      // Change text to WHITE for contrast
      const selectedTitle = selected.querySelector('div:nth-child(2)');
      const selectedDesc = selected.querySelector('div:nth-child(3)');
      if (selectedTitle) selectedTitle.style.color = '#ffffff';
      if (selectedDesc) selectedDesc.style.color = 'rgba(255,255,255,0.85)';
    };

    formatModal.element.querySelectorAll('.format-option').forEach(opt => {
      opt.addEventListener('click', () => selectOption(opt));
    });

    // Default: select thermal
    const defaultOption = formatModal.element.querySelector('[data-format="thermal"]');
    if (defaultOption) selectOption(defaultOption);

    // Cancel
    formatModal.element.querySelector('#format-cancel').onclick = () => formatModal.close();

    // Confirm
    formatModal.element.querySelector('#format-confirm').onclick = () => {
      const selected = formatModal.element.querySelector('.format-option[style*="background: rgb(79, 70, 229)"]') 
                    || formatModal.element.querySelector('[data-format="thermal"]');
      const selectedFormat = selected?.dataset.format || 'thermal';
      const withPreview = formatModal.element.querySelector('#preview-check').checked;
      
      formatModal.close();
      setTimeout(() => {
        window.printInvoice(inv, { preview: withPreview, format: selectedFormat });
      }, 300);
    };
  }));

  // ========== زر إرسال عبر Telegram ==========
  container.querySelectorAll('.send-invoice-btn').forEach(b => b.addEventListener('click', e => {
    const id = parseInt(e.target.closest('button').dataset.id);
    sendInvoiceViaTelegram(id);
  }));

  // ========== زر تعديل الفاتورة ==========
  container.querySelectorAll('.edit-invoice-btn').forEach(b => b.addEventListener('click', e => {
    const id = parseInt(e.target.closest('button').dataset.id);
    editInvoice(id);
  }));

  // ========== زر حذف الفاتورة ==========
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

// ========== إرسال الفاتورة عبر Telegram ==========
async function sendInvoiceViaTelegram(invoiceId) {
  const id = parseInt(invoiceId);
  if (!id || isNaN(id)) {
    showToast('معرف الفاتورة غير صالح', 'error');
    return;
  }

  // إغلاق أي مودال مفتوح أولاً
  if (activeModal) {
    activeModal.querySelector('.modal-close')?.click();
  }

  const btn = document.querySelector(`button[data-id="${id}"].send-invoice-btn`) || 
              document.querySelector(`.send-invoice-btn[data-id="${id}"]`);
  const originalHTML = btn ? btn.innerHTML : null;
  
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="loader-inline"></span> جاري الإرسال...`;
  }
  
  try {
    const res = await apiCall('/invoices-send', 'POST', { invoiceId: id });
    
    if (res && res.success) {
      showToast('تم إرسال الفاتورة إلى Telegram بنجاح', 'success');
      return res;
    } else {
      throw new Error(res?.error || 'فشل في الإرسال');
    }
  } catch (err) {
    showToast(err.message || 'فشل في إرسال الفاتورة', 'error');
    console.error('Send invoice error:', err);
  } finally {
    if (btn && originalHTML) {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
  }
}

function showInvoiceDetail(invoice) {
  const lines = invoice.invoice_lines?.map(l => {
    const item = itemsCache.find(i => i.id === l.item_id);
    const unitName = l.unit?.name || l.unit?.abbreviation || (item?.base_unit?.name || 'قطعة');
    const factor = l.conversion_factor || 1;
    const baseQty = l.quantity * factor;
    const baseUnit = item?.base_unit?.name || 'قطعة';
    let qtyDisplay = `${l.quantity} ${unitName}`;
    if (factor > 1) qtyDisplay += ` <span style="color:var(--text-muted);font-size:12px;">(= ${baseQty} ${baseUnit})</span>`;
    return `<tr><td style="font-weight:700;">${l.item?.name || '-'}</td><td>${qtyDisplay}</td><td>${formatNumber(l.unit_price)}</td><td style="font-weight:800;">${formatNumber(l.total)}</td></tr>`;
  }).join('') || '';

  const typeLabel = invoice.type === 'sale' ? 'مبيعات' : 'مشتريات';
  const entity = invoice.customer?.name || invoice.supplier?.name || 'نقدي';
  const statusColor = (invoice.balance || 0) <= 0 ? 'var(--success)' : 'var(--warning)';

  const modal = openModal({
    title: `فاتورة ${typeLabel} ${invoice.reference || ''}`,
    bodyHTML: `
      <div style="margin-bottom:16px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
          <div style="background:var(--bg);border-radius:8px;padding:12px;"><div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">التاريخ</div><div style="font-weight:700;">${formatDate(invoice.date)}</div></div>
          <div style="background:var(--bg);border-radius:8px;padding:12px;"><div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">${invoice.type === 'sale' ? 'العميل' : 'المورد'}</div><div style="font-weight:700;">${entity}</div></div>
        </div>
        <div class="table-wrap"><table class="table"><thead><tr><th>المادة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${lines}</tbody></table></div>
        <div style="background:var(--bg);border-radius:12px;padding:16px;margin-top:16px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:var(--text-muted);">الإجمالي</span><span style="font-weight:800;font-size:18px;">${formatNumber(invoice.total)}</span></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:var(--text-muted);">المدفوع</span><span style="font-weight:700;color:var(--success);">${formatNumber(invoice.paid || 0)}</span></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-muted);">المتبقي</span><span style="font-weight:800;color:${statusColor};">${formatNumber(invoice.balance || 0)}</span></div>
        </div>
        ${invoice.notes ? `<div style="margin-top:12px;padding:12px;background:var(--warning-light);border-radius:8px;color:var(--warning);font-size:13px;"><strong>ملاحظات:</strong> ${invoice.notes}</div>` : ''}
      </div>`,
    footerHTML: `
      <button class="btn btn-secondary" id="detail-close">إغلاق</button>
      <button class="btn btn-success" id="detail-send">${ICONS.file} إرسال</button>
      <button class="btn btn-primary" id="detail-print">${ICONS.print} طباعة</button>
    `
  });

  // زر الإغلاق
  modal.element.querySelector('#detail-close').onclick = () => modal.close();

  // زر الطباعة (مُحدّث)
  modal.element.querySelector('#detail-print').onclick = () => {
    modal.close();
    setTimeout(() => {
      // فتح نفس مودال اختيار التنسيق
      const formatModal = openModal({
        title: 'اختيار تنسيق الطباعة',
        bodyHTML: `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 12px 0;">
            <div class="format-option" data-format="thermal" style="border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.2s;">
              <div style="font-size: 40px; margin-bottom: 12px;">🧾</div>
              <div style="font-weight: 700; font-size: 16px; margin-bottom: 4px;">حرارية 80mm</div>
              <div style="font-size: 13px; color: #64748b;">للطابعة الحرارية الصغيرة</div>
            </div>
            <div class="format-option" data-format="a4" style="border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.2s;">
              <div style="font-size: 40px; margin-bottom: 12px;">📄</div>
              <div style="font-weight: 700; font-size: 16px; margin-bottom: 4px;">A4 رسمية</div>
              <div style="font-size: 13px; color: #64748b;">فاتورة رسمية كاملة</div>
            </div>
          </div>
          <div style="margin-top: 16px; padding: 12px; background: #f8fafc; border-radius: 8px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" id="preview-check" checked style="width: 18px; height: 18px;">
              <span style="font-size: 14px;">عرض معاينة قبل الطباعة</span>
            </label>
          </div>
        `,
        footerHTML: `
          <button class="btn btn-secondary" id="format-cancel">إلغاء</button>
          <button class="btn btn-primary" id="format-confirm">🖨️ متابعة</button>
        `
      });

      const selectOption = (selected) => {
        formatModal.element.querySelectorAll('.format-option').forEach(o => {
          o.style.borderColor = '#e2e8f0';
          o.style.background = 'white';
        });
        selected.style.borderColor = '#4f46e5';
        selected.style.background = '#eef2ff';
      };

      formatModal.element.querySelectorAll('.format-option').forEach(opt => {
        opt.addEventListener('click', () => selectOption(opt));
      });

      const defaultOption = formatModal.element.querySelector('[data-format="thermal"]');
      if (defaultOption) selectOption(defaultOption);

      formatModal.element.querySelector('#format-cancel').onclick = () => formatModal.close();

      formatModal.element.querySelector('#format-confirm').onclick = () => {
        const selected = formatModal.element.querySelector('.format-option[style*="border-color: rgb(79, 70, 229)"]') 
                      || formatModal.element.querySelector('[data-format="thermal"]');
        const selectedFormat = selected?.dataset.format || 'thermal';
        const withPreview = formatModal.element.querySelector('#preview-check').checked;
        
        formatModal.close();
        setTimeout(() => {
          window.printInvoice(invoice, { preview: withPreview, format: selectedFormat });
        }, 300);
      };
    }, 300);
  };

  // زر الإرسال
  modal.element.querySelector('#detail-send').onclick = () => {
    modal.close();
    setTimeout(() => {
      sendInvoiceViaTelegram(invoice.id);
    }, 300);
  };
}

// ========== طباعة الفاتورة (متاحة عالمياً) ==========
window.printInvoice = function(invoice, options = {}) {
  if (!invoice) {
    showToast('لا توجد بيانات للطباعة', 'error');
    return;
  }

  const { preview = false, format = 'thermal' } = options; // format: 'thermal' | 'a4'

  // إعدادات العملة والتنسيق
  const CURRENCY = { symbol: 'ل.س', decimals: 2 };
  
  function formatCurrency(amount) {
    return Number(amount || 0).toLocaleString('en-US', { 
      minimumFractionDigits: CURRENCY.decimals, 
      maximumFractionDigits: CURRENCY.decimals 
    }) + ' ' + CURRENCY.symbol;
  }

  function formatDateEn(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function formatTimeEn() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  const items = invoice.invoice_lines || [];
  const paid = invoice.paid || 0;
  const balance = (invoice.total || 0) - paid;
  const now = new Date();
  const timeStr = formatTimeEn();
  const dateStr = formatDateEn(invoice.date);
  const entity = invoice.customer || invoice.supplier;
  const entityLabel = invoice.type === 'sale' ? 'العميل' : 'المورد';

  // ========== تنسيق حراري 80mm ==========
  const thermalHTML = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=80mm, initial-scale=1">
<title>فاتورة ${invoice.type === 'sale' ? 'بيع' : 'شراء'} - ${invoice.reference || ''}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 80mm; font-family: 'Segoe UI', system-ui, sans-serif; font-size: 12px; line-height: 1.4; padding: 4mm; color: #000; background: #fff; }
  .center { text-align: center; }
  .bold { font-weight: 900; }
  .shop { font-size: 20px; margin-bottom: 2px; color: #2563eb; }
  .type { font-size: 14px; color: #555; margin-bottom: 4px; }
  .line { border-top: 2px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; margin: 3px 0; }
  .label { color: #555; font-size: 11px; }
  .value { font-weight: 700; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0; }
  th { text-align: right; font-size: 10px; color: #666; border-bottom: 1px solid #999; padding: 3px 0; }
  td { padding: 4px 0; vertical-align: top; }
  .name { font-weight: 700; max-width: 100px; word-wrap: break-word; font-size: 11px; }
  .num { text-align: left; font-family: 'Courier New', monospace; font-size: 11px; }
  .total-row { font-size: 15px; font-weight: 900; margin: 6px 0; padding: 4px 0; border-top: 2px solid #000; }
  .grand-total { color: #2563eb; font-size: 18px; }
  .footer { text-align: center; font-size: 10px; color: #666; margin-top: 12px; padding-top: 8px; border-top: 1px dashed #999; }
  .cut-here { border-top: 3px dotted #000; margin: 8px 0; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; }
  .paid { background: #dcfce7; color: #166534; }
  .unpaid { background: #fef3c7; color: #92400e; }
  @media print { body { width: 80mm; padding: 2mm; } .no-print { display: none; } }
</style>
</head>
<body>
  <div class="center">
    <div class="shop bold">الراجحي للمحاسبة</div>
    <div style="font-size: 9px; color: #888; margin-bottom: 4px;">ALRAJEHI ACCOUNTING</div>
    <div class="type">فاتورة ${invoice.type === 'sale' ? 'بيع' : 'شراء'}</div>
    <span class="badge ${balance <= 0 ? 'paid' : 'unpaid'}">${balance <= 0 ? '✓ مدفوعة' : '⏳ غير مدفوعة'}</span>
  </div>
  <div class="line"></div>
  <div class="row"><span class="label">التاريخ / Date:</span><span class="value">${dateStr} ${timeStr}</span></div>
  <div class="row"><span class="label">المرجع / Ref:</span><span class="value">${invoice.reference || '-'}</span></div>
  ${entity ? `<div class="row"><span class="label">${entityLabel}:</span><span class="value">${entity.name}</span></div>` : ''}
  <div class="line"></div>
  <table>
    <tr><th style="width:40%">الصنف</th><th style="width:15%">Qty</th><th style="width:22%">Price</th><th style="width:23%">Total</th></tr>
    ${items.map(l => `
      <tr>
        <td class="name">${(l.item?.name || '-').substring(0, 15)}</td>
        <td class="num">${l.quantity} <span style="font-size:8px;color:#666">${l.unit?.abbreviation || l.unit?.name || ''}</span></td>
        <td class="num">${parseFloat(l.unit_price || 0).toFixed(2)}</td>
        <td class="num bold">${parseFloat(l.total || 0).toFixed(2)}</td>
      </tr>
    `).join('')}
  </table>
  <div class="line"></div>
  <div class="row total-row"><span>الإجمالي Total:</span><span class="grand-total">${formatCurrency(invoice.total || 0)}</span></div>
  <div class="row"><span>المدفوع Paid:</span><span>${formatCurrency(paid)}</span></div>
  <div class="row bold" style="font-size:14px; color: ${balance > 0 ? '#dc2626' : '#059669'}"><span>الباقي Balance:</span><span>${formatCurrency(balance)}</span></div>
  <div class="cut-here"></div>
  <div class="footer">
    <div>شكراً لتعاملكم / Thank you</div>
    <div style="margin-top:4px; font-size: 9px;">للدعم: @bukamal1991</div>
  </div>
  <div class="no-print" style="margin-top: 20px; text-align: center;">
    <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">🖨️ طباعة / Print</button>
  </div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };<\/script>
</body>
</html>`;

  // ========== تنسيق A4 رسمي ==========
  const a4HTML = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>فاتورة ${invoice.type === 'sale' ? 'بيع' : 'شراء'} - ${invoice.reference || ''}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 14px; line-height: 1.6; color: #1a1a2e; background: #fff; padding: 20px; }
  .a4-container { max-width: 210mm; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
  .a4-header { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 30px; display: flex; justify-content: space-between; align-items: center; }
  .a4-logo { font-size: 28px; font-weight: 900; }
  .a4-logo-sub { font-size: 12px; opacity: 0.8; letter-spacing: 2px; }
  .a4-type { background: rgba(255,255,255,0.2); padding: 8px 20px; border-radius: 20px; font-size: 16px; font-weight: 800; }
  .a4-body { padding: 30px; }
  .a4-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
  .a4-info-box { background: #f8fafc; border-radius: 10px; padding: 16px; border: 1px solid #e2e8f0; }
  .a4-info-title { font-size: 12px; color: #64748b; font-weight: 600; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; }
  .a4-info-value { font-size: 16px; font-weight: 700; color: #1e293b; }
  .a4-table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 20px 0; }
  .a4-table th { background: #4f46e5; color: white; padding: 12px; text-align: right; font-weight: 700; font-size: 13px; }
  .a4-table th:first-child { border-radius: 0 8px 0 0; }
  .a4-table th:last-child { border-radius: 8px 0 0 0; text-align: left; }
  .a4-table td { padding: 14px 12px; border-bottom: 1px solid #e2e8f0; }
  .a4-table tr:nth-child(even) { background: #f8fafc; }
  .a4-table .num { text-align: left; font-family: 'Courier New', monospace; font-weight: 700; }
  .a4-totals { background: #f1f5f9; border-radius: 12px; padding: 24px; margin-top: 24px; }
  .a4-total-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px dashed #cbd5e1; }
  .a4-total-row:last-child { border-bottom: none; }
  .a4-grand-total { font-size: 24px; color: #4f46e5; font-weight: 900; }
  .a4-footer { padding: 20px 30px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px; }
  .a4-stamp { position: absolute; bottom: 40px; left: 40px; width: 120px; height: 120px; border: 3px solid #4f46e5; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #4f46e5; font-weight: 900; font-size: 14px; transform: rotate(-15deg); opacity: 0.3; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
  .paid { background: #dcfce7; color: #166534; }
  .unpaid { background: #fef3c7; color: #92400e; }
  @media print { body { padding: 0; } .no-print { display: none; } .a4-container { border: none; } }
</style>
</head>
<body>
  <div class="a4-container" style="position: relative;">
    <div class="a4-header">
      <div>
        <div class="a4-logo">الراجحي للمحاسبة</div>
        <div class="a4-logo-sub">ALRAJEHI ACCOUNTING SYSTEM</div>
      </div>
      <div style="text-align: center;">
        <div class="a4-type">${invoice.type === 'sale' ? 'فاتورة بيع' : 'فاتورة شراء'}</div>
        <div style="margin-top: 8px; font-size: 14px;">#${invoice.reference || invoice.id}</div>
      </div>
    </div>
    
    <div class="a4-body">
      <div class="a4-info-grid">
        <div class="a4-info-box">
          <div class="a4-info-title">تاريخ الفاتورة</div>
          <div class="a4-info-value">${dateStr}</div>
          <div style="font-size: 13px; color: #64748b; margin-top: 4px;">${timeStr}</div>
        </div>
        <div class="a4-info-box">
          <div class="a4-info-title">الحالة</div>
          <div><span class="badge ${balance <= 0 ? 'paid' : 'unpaid'}">${balance <= 0 ? '✓ مدفوعة بالكامل' : '⏳ غير مدفوعة'}</span></div>
        </div>
        ${entity ? `
        <div class="a4-info-box" style="background: #e0e7ff; border-color: #c7d2fe;">
          <div class="a4-info-title" style="color: #4f46e5;">${entityLabel}</div>
          <div class="a4-info-value" style="color: #4f46e5;">${entity.name}</div>
          ${entity.phone ? `<div style="font-size: 13px; color: #64748b; margin-top: 4px;">📞 ${entity.phone}</div>` : ''}
        </div>
        ` : ''}
        <div class="a4-info-box">
          <div class="a4-info-title">الرصيد الحالي</div>
          <div class="a4-info-value" style="color: ${balance > 0 ? '#dc2626' : '#059669'};">${formatCurrency(balance)}</div>
        </div>
      </div>

      <table class="a4-table">
        <thead>
          <tr>
            <th style="width: 5%;">#</th>
            <th style="width: 35%;">الصنف / Description</th>
            <th style="width: 15%;">الوحدة</th>
            <th style="width: 15%;">الكمية</th>
            <th style="width: 15%;">السعر</th>
            <th style="width: 15%;">المجموع</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((l, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>
              <div style="font-weight: 700;">${l.item?.name || '-'}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 2px;">${l.description || ''}</div>
            </td>
            <td>${l.unit?.name || l.unit?.abbreviation || 'قطعة'}</td>
            <td class="num">${l.quantity}</td>
            <td class="num">${parseFloat(l.unit_price || 0).toFixed(2)}</td>
            <td class="num" style="font-weight: 900; color: #4f46e5;">${parseFloat(l.total || 0).toFixed(2)}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="a4-totals">
        <div class="a4-total-row"><span style="font-size: 16px; color: #475569;">إجمالي البنود / Subtotal</span><span style="font-size: 18px; font-weight: 700;">${formatCurrency(invoice.total || 0)}</span></div>
        ${paid > 0 ? `<div class="a4-total-row"><span style="color: #059669;">المدفوع / Paid</span><span style="font-weight: 700; color: #059669;">${formatCurrency(paid)}</span></div>` : ''}
        ${balance > 0 ? `<div class="a4-total-row"><span style="color: #dc2626;">المتبقي / Balance Due</span><span style="font-weight: 800; color: #dc2626; font-size: 18px;">${formatCurrency(balance)}</span></div>` : ''}
        <div class="a4-total-row" style="margin-top: 12px; padding-top: 16px; border-top: 2px solid #4f46e5;">
          <span style="font-size: 18px; font-weight: 800;">الإجمالي النهائي / Grand Total</span>
          <span class="a4-grand-total">${formatCurrency(invoice.total || 0)}</span>
        </div>
      </div>
    </div>

    <div class="a4-footer">
      <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 8px;">شكراً لتعاملكم معنا / Thank you for your business</div>
      <div>الراجحي للمحاسبة · للدعم: @bukamal1991</div>
      <div style="margin-top: 8px; font-size: 11px;">هذه الفاتورة صادرة إلكترونياً ولا تحتاج توقيع</div>
    </div>

    <div class="a4-stamp">PAID</div>
  </div>

  <div class="no-print" style="position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; gap: 12px; z-index: 1000;">
    <button onclick="window.print()" style="padding: 14px 28px; background: #4f46e5; color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 16px; font-weight: 700; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
      🖨️ طباعة / Print
    </button>
    <button onclick="window.close()" style="padding: 14px 28px; background: #ef4444; color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 16px; font-weight: 700;">
      ✕ إغلاق / Close
    </button>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        // لا طباعة تلقائية في A4، ننتظر المستخدم
      }, 100);
    };
  <\/script>
</body>
</html>`;

  const htmlContent = format === 'a4' ? a4HTML : thermalHTML;

  // ========== وضع المعاينة ==========
  if (preview) {
    const previewModal = openModal({
      title: `معاينة الفاتورة - ${format === 'a4' ? 'A4' : 'حرارية 80mm'}`,
      bodyHTML: `<div style="background: #f1f5f9; padding: 20px; border-radius: 12px; overflow: auto; max-height: 70vh;">
        <iframe srcdoc="${htmlContent.replace(/"/g, '&quot;')}" style="width: 100%; height: 500px; border: none; border-radius: 8px; background: white;"></iframe>
      </div>`,
      footerHTML: `
        <button class="btn btn-secondary" id="preview-close">إغلاق</button>
        <button class="btn btn-primary" id="preview-print">🖨️ طباعة</button>
        <button class="btn btn-success" id="preview-send">📤 إرسال للبوت</button>
      `
    });

    previewModal.element.querySelector('#preview-close').onclick = () => previewModal.close();
    
    previewModal.element.querySelector('#preview-print').onclick = () => {
      previewModal.close();
      setTimeout(() => executePrint(htmlContent), 300);
    };
    
    previewModal.element.querySelector('#preview-send').onclick = () => {
      previewModal.close();
      sendInvoiceViaTelegram(invoice.id);
    };
    
    return;
  }

  // ========== تنفيذ الطباعة مباشرة ==========
  executePrint(htmlContent);
};

// ========== دالة مساعدة لتنفيذ الطباعة ==========
function executePrint(htmlContent) {
  let printWindow = null;
  try {
    printWindow = window.open('', '_blank', 'width=800,height=900,scrollbars=yes,resizable=yes,top=20,left=20');
  } catch (e) {
    console.error('فشل فتح النافذة:', e);
  }

  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    showToast('✅ تم فتح نافذة الطباعة', 'success');
    return;
  }

  // fallback للجوال
  showToast('📄 جاري تحضير الطباعة...', 'info');
  let iframe = document.getElementById('print-iframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.bottom = '-10000px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
  }

  const iframeDoc = iframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      showToast('⚠️ الطباعة غير متاحة. جاري إرسال الملف...', 'warning');
      sendInvoiceViaTelegram(invoice.id);
    }
  }, 800);
}

// ========== المدفوعات ==========
async function loadPayments() {
  try {
    const [payments, invoices, customers, suppliers] = await Promise.all([apiCall('/payments', 'GET'), apiCall('/invoices', 'GET'), apiCall('/customers', 'GET'), apiCall('/suppliers', 'GET')]);
    let html = `<div class="card"><div class="card-header"><div><h3 class="card-title">الدفعات</h3><span class="card-subtitle">سجل المقبوضات والمدفوعات</span></div><button class="btn btn-primary btn-sm" id="btn-add-pmt">${ICONS.plus} إضافة</button></div></div>`;
    if (!payments.length) html += emptyState('لا توجد دفعات مسجلة', 'سجل أول دفعة باستخدام الزر أعلاه');
    else {
      payments.forEach(p => {
        const isIn = !!p.customer_id;
        html += `<div class="card" style="border-right:3px solid ${isIn?'var(--success)':'var(--danger)'};"><div style="display:flex;justify-content:space-between;align-items:center;"><div><div style="font-weight:900;font-size:20px;color:${isIn?'var(--success)':'var(--danger)'};">${isIn?'+':'-'} ${formatNumber(p.amount)}</div><div style="font-size:13px;color:var(--text-muted);margin-top:2px;">${formatDate(p.payment_date)}</div></div><button class="btn btn-ghost btn-sm" onclick="deletePayment(${p.id})">${ICONS.trash}</button></div><div style="margin-top:10px;font-size:13px;color:var(--text-secondary);line-height:1.6;">${p.customer?.name ? '<span style="color:var(--success);font-weight:700;">▲ عميل: ' + p.customer.name + '</span>' : ''}${p.supplier?.name ? '<span style="color:var(--danger);font-weight:700;">▼ مورد: ' + p.supplier.name + '</span>' : ''}${p.invoice ? '· فاتورة: ' + (p.invoice.type==='sale'?'بيع':'شراء') + ' ' + (p.invoice.reference||'') : ''}${p.notes ? '<div style="margin-top:4px;color:var(--text-muted);">' + p.notes + '</div>' : ''}</div></div>`;
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
    <div class="form-group"><label class="form-label">ملاحظات</label><textarea class="textarea" id="pmt-notes" placeholder="وصف الدفعة..."></textarea></div>`;
  const modal = openModal({ title: 'تسجيل دفعة جديدة', bodyHTML: body, footerHTML: `<button class="btn btn-secondary" id="pmt-cancel">إلغاء</button><button class="btn btn-primary" id="pmt-save">${ICONS.check} حفظ</button>` });
  const tSel = modal.element.querySelector('#pmt-type'), cBlock = modal.element.querySelector('#pmt-cust-block'), sBlock = modal.element.querySelector('#pmt-supp-block'), invSel = modal.element.querySelector('#pmt-invoice'), cSel = modal.element.querySelector('#pmt-customer'), sSel = modal.element.querySelector('#pmt-supplier');
  const updateInv = (type, eId) => {
    const filt = invoices.filter(inv => type === 'customer' ? inv.type === 'sale' && inv.customer_id == eId : inv.type === 'purchase' && inv.supplier_id == eId);
    invSel.innerHTML = '<option value="">بدون فاتورة</option>' + filt.map(inv => `<option value="${inv.id}">${inv.type==='sale'?'بيع':'شراء'} ${inv.reference||''} (${formatNumber(inv.total)})</option>`).join('');
  };
  tSel.addEventListener('change', () => { if (tSel.value === 'customer') { cBlock.style.display = 'block'; sBlock.style.display = 'none'; updateInv('customer', cSel.value); } else { cBlock.style.display = 'none'; sBlock.style.display = 'block'; updateInv('supplier', sSel.value); } });
  cSel.addEventListener('change', () => updateInv('customer', cSel.value));
  sSel.addEventListener('change', () => updateInv('supplier', sSel.value));
  modal.element.querySelector('#pmt-cancel').onclick = () => modal.close();
  modal.element.querySelector('#pmt-save').onclick = async () => {
    const type = tSel.value, cust = type === 'customer' ? (cSel.value || null) : null, supp = type === 'supplier' ? (sSel.value || null) : null;
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
    let html = `<div class="card"><div class="card-header"><div><h3 class="card-title">المصاريف</h3><span class="card-subtitle">تتبع المصاريف التشغيلية</span></div><button class="btn btn-primary btn-sm" id="btn-add-expense">${ICONS.plus} إضافة</button></div></div>`;
    if (!expenses.length) html += emptyState('لا توجد مصاريف مسجلة', 'سجل أول مصروف باستخدام الزر أعلاه');
    else expenses.forEach(ex => { html += `<div class="card" style="border-right:3px solid var(--danger);"><div style="display:flex;justify-content:space-between;align-items:center;"><div><div style="font-weight:900;font-size:20px;color:var(--danger);">${formatNumber(ex.amount)}</div><div style="font-size:13px;color:var(--text-muted);margin-top:2px;">${formatDate(ex.expense_date)}</div></div><button class="btn btn-ghost btn-sm" onclick="deleteExpense(${ex.id})">${ICONS.trash}</button></div>${ex.description ? `<div style="margin-top:10px;font-size:14px;color:var(--text-secondary);">${ex.description}</div>` : ''}</div>`; });
    document.getElementById('tab-content').innerHTML = html;
    document.getElementById('btn-add-expense')?.addEventListener('click', showAddExpenseModal);
  } catch (err) { showToast(err.message, 'error'); }
}

function showAddExpenseModal() {
  showFormModal({
    title: 'إضافة مصروف جديد',
    fields: [{ id: 'amount', label: 'المبلغ', type: 'number', placeholder: '0.00' }, { id: 'expense_date', label: 'التاريخ', type: 'date' }, { id: 'description', label: 'الوصف', type: 'textarea', placeholder: 'وصف المصروف...' }],
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
    let html = `<div class="stats-grid">
      <div class="stat-card profit"><div class="stat-label">صافي الربح</div><div class="stat-value ${data.net_profit>=0?'positive':'negative'}" style="font-size:24px;">${formatNumber(data.net_profit)}</div>${data.net_profit>=0?'<div class="stat-trend up">↑ ربح</div>':'<div class="stat-trend down">↓ خسارة</div>'}</div>
      <div class="stat-card cash"><div class="stat-label">رصيد الصندوق</div><div class="stat-value ${data.cash_balance>=0?'positive':'negative'}">${formatNumber(data.cash_balance)}</div></div>
      <div class="stat-card receivables"><div class="stat-label">الذمم المدينة</div><div class="stat-value">${formatNumber(data.receivables)}</div></div>
      <div class="stat-card payables"><div class="stat-label">الذمم الدائنة</div><div class="stat-value">${formatNumber(data.payables)}</div></div>
    </div><div class="chart-card"><div class="chart-title">المبيعات vs المشتريات</div><canvas id="incomeChart"></canvas></div>`;
    if (data.monthly) html += `<div class="chart-card"><div class="chart-title">الحركات المالية الشهرية</div><canvas id="paymentsChart"></canvas></div>`;
    if (data.daily?.dates.length) html += `<div class="chart-card"><div class="chart-title">الربح اليومي (آخر 30 يوم)</div><canvas id="profitChart"></canvas></div>`;
    document.getElementById('tab-content').innerHTML = html;

    new Chart(document.getElementById('incomeChart'), { type: 'doughnut', data: { labels: ['مبيعات', 'مشتريات'], datasets: [{ data: [data.total_sales, data.total_purchases], backgroundColor: ['#10b981', '#f59e0b'], borderWidth: 0, hoverOffset: 4 }] }, options: { responsive: true, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { font: { family: 'Tajawal' } } } } } });
    if (data.monthly) new Chart(document.getElementById('paymentsChart'), { type: 'bar', data: { labels: data.monthly.labels, datasets: [{ label: 'وارد', data: data.monthly.payments_in, backgroundColor: '#4f46e5', borderRadius: 6 }, { label: 'منصرف', data: data.monthly.payments_out, backgroundColor: '#ef4444', borderRadius: 6 }] }, options: { responsive: true, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } }, plugins: { legend: { labels: { font: { family: 'Tajawal' } } } } } });
    if (data.daily?.dates.length) new Chart(document.getElementById('profitChart'), { type: 'line', data: { labels: data.daily.dates.slice(-30), datasets: [{ label: 'صافي الربح', data: data.daily.profits.slice(-30), borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)', tension: 0.3, fill: true, pointRadius: 3, pointHoverRadius: 5 }] }, options: { responsive: true, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } }, plugins: { legend: { labels: { font: { family: 'Tajawal' } } } } } });
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
    <div class="report-card" data-report="supplier_statement"><div class="report-icon">${ICONS.factory}</div><div class="report-info"><h4>كشف حساب مورد</h4><p>حركات مورد محدد</p></div></div>`;
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
    const rows = data.map(r => `<tr><td style="font-weight:700;">${r.name}</td><td>${formatNumber(r.total_debit)}</td><td>${formatNumber(r.total_credit)}</td><td class="${r.balance>=0?'text-success':'text-danger'}" style="font-weight:800;">${formatNumber(r.balance)}</td></tr>`).join('');
    document.getElementById('tab-content').innerHTML = `<div class="card"><button class="btn btn-secondary btn-sm" onclick="loadReports()" style="width:auto;margin-bottom:12px;">🔙 رجوع</button><h3 class="card-title">ميزان المراجعة</h3><div class="table-wrap"><table class="table"><thead><tr><th>الحساب</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  } catch (e) { showToast(e.message, 'error'); }
}

async function loadIncomeStatement() {
  try {
    const d = await apiCall('/reports?type=income_statement', 'GET');
    const iRows = d.income.map(i => `<tr><td>${i.name}</td><td style="font-weight:700;color:var(--success);">${formatNumber(i.balance)}</td></tr>`).join('');
    const eRows = d.expenses.map(e => `<tr><td>${e.name}</td><td style="font-weight:700;color:var(--danger);">${formatNumber(e.balance)}</td></tr>`).join('');
    document.getElementById('tab-content').innerHTML = `<div class="card"><button class="btn btn-secondary btn-sm" onclick="loadReports()" style="width:auto;margin-bottom:12px;">🔙 رجوع</button><h3 class="card-title">قائمة الدخل</h3><h4>الإيرادات</h4><div class="table-wrap"><table class="table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${iRows}</tbody></table></div><p style="font-weight:800;text-align:left;">إجمالي الإيرادات: <span style="color:var(--success);">${formatNumber(d.total_income)}</span></p><h4>المصروفات</h4><div class="table-wrap"><table class="table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${eRows}</tbody></table></div><p style="font-weight:800;text-align:left;">إجمالي المصروفات: <span style="color:var(--danger);">${formatNumber(d.total_expenses)}</span></p><hr><h2 style="color:${d.net_profit>=0?'var(--success)':'var(--danger)'};font-size:24px;font-weight:900;text-align:center;">صافي الربح: ${formatNumber(d.net_profit)}</h2></div>`;
  } catch (e) { showToast(e.message, 'error'); }
}

async function loadBalanceSheet() {
  try {
    const d = await apiCall('/reports?type=balance_sheet', 'GET');
    const aRows = d.assets.map(a => `<tr><td>${a.name}</td><td style="font-weight:700;">${formatNumber(a.balance)}</td></tr>`).join('');
    const lRows = d.liabilities.map(l => `<tr><td>${l.name}</td><td style="font-weight:700;">${formatNumber(l.balance)}</td></tr>`).join('');
    const eRows = d.equity.map(e => `<tr><td>${e.name}</td><td style="font-weight:700;">${formatNumber(e.balance)}</td></tr>`).join('');
    document.getElementById('tab-content').innerHTML = `<div class="card"><button class="btn btn-secondary btn-sm" onclick="loadReports()" style="width:auto;margin-bottom:12px;">🔙 رجوع</button><h3 class="card-title">الميزانية العمومية</h3><h4>الأصول</h4><div class="table-wrap"><table class="table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${aRows}</tbody></table></div><p style="font-weight:800;text-align:left;">إجمالي الأصول: ${formatNumber(d.total_assets)}</p><h4>الخصوم</h4><div class="table-wrap"><table class="table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${lRows}</tbody></table></div><p style="font-weight:800;text-align:left;">إجمالي الخصوم: ${formatNumber(d.total_liabilities)}</p><h4>حقوق الملكية</h4><div class="table-wrap"><table class="table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${eRows}</tbody></table></div><p style="font-weight:800;text-align:left;">إجمالي حقوق الملكية: ${formatNumber(d.total_equity)}</p></div>`;
  } catch (e) { showToast(e.message, 'error'); }
}

async function loadAccountLedgerForm() {
  try {
    const accounts = await apiCall('/accounts', 'GET');
    const opts = accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    document.getElementById('tab-content').innerHTML = `<div class="card"><button class="btn btn-secondary btn-sm" onclick="loadReports()" style="width:auto;margin-bottom:12px;">🔙 رجوع</button><h3 class="card-title">الأستاذ العام</h3><div class="form-group"><select class="select" id="ledger-account">${opts}</select></div><button class="btn btn-primary" id="btn-ledger" style="width:auto;">عرض الحركات</button><div id="ledger-result" style="margin-top:16px"></div></div>`;
    document.getElementById('btn-ledger').addEventListener('click', async () => {
      const id = document.getElementById('ledger-account').value; if (!id) return;
      try {
        const lines = await apiCall(`/reports?type=account_ledger&account_id=${id}`, 'GET');
        let html = '<div class="table-wrap"><table class="table"><thead><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>';
        lines.forEach(l => html += `<tr><td>${formatDate(l.date)}</td><td>${l.description||''}</td><td style="color:var(--success);font-weight:700;">${formatNumber(l.debit)}</td><td style="color:var(--danger);font-weight:700;">${formatNumber(l.credit)}</td><td class="${(l.balance||0)>=0?'text-success':'text-danger'}" style="font-weight:800;">${formatNumber(l.balance)}</td></tr>`);
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
    document.getElementById('tab-content').innerHTML = `<div class="card"><button class="btn btn-secondary btn-sm" onclick="loadReports()" style="width:auto;margin-bottom:12px;">🔙 رجوع</button><h3 class="card-title">كشف حساب عميل</h3><div class="form-group"><select class="select" id="stmt-cust">${opts}</select></div><button class="btn btn-primary" id="btn-stmt-cust" style="width:auto;">عرض الكشف</button><div id="stmt-result" style="margin-top:16px"></div></div>`;
    document.getElementById('btn-stmt-cust').addEventListener('click', async () => {
      const id = document.getElementById('stmt-cust').value; if (!id) return;
      try {
        const lines = await apiCall(`/reports?type=customer_statement&customer_id=${id}`, 'GET');
        let html = '<div class="table-wrap"><table class="table"><thead><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>';
        lines.forEach(l => html += `<tr><td>${formatDate(l.date)}</td><td>${l.description||''}</td><td style="color:var(--success);font-weight:700;">${formatNumber(l.debit)}</td><td style="color:var(--danger);font-weight:700;">${formatNumber(l.credit)}</td><td class="${(l.balance||0)>=0?'text-success':'text-danger'}" style="font-weight:800;">${formatNumber(l.balance)}</td></tr>`);
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
    document.getElementById('tab-content').innerHTML = `<div class="card"><button class="btn btn-secondary btn-sm" onclick="loadReports()" style="width:auto;margin-bottom:12px;">🔙 رجوع</button><h3 class="card-title">كشف حساب مورد</h3><div class="form-group"><select class="select" id="stmt-supp">${opts}</select></div><button class="btn btn-primary" id="btn-stmt-supp" style="width:auto;">عرض الكشف</button><div id="stmt-result" style="margin-top:16px"></div></div>`;
    document.getElementById('btn-stmt-supp').addEventListener('click', async () => {
      const id = document.getElementById('stmt-supp').value; if (!id) return;
      try {
        const lines = await apiCall(`/reports?type=supplier_statement&supplier_id=${id}`, 'GET');
        let html = '<div class="table-wrap"><table class="table"><thead><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>';
        lines.forEach(l => html += `<tr><td>${formatDate(l.date)}</td><td>${l.description||''}</td><td style="color:var(--success);font-weight:700;">${formatNumber(l.debit)}</td><td style="color:var(--danger);font-weight:700;">${formatNumber(l.credit)}</td><td class="${(l.balance||0)>=0?'text-success':'text-danger'}" style="font-weight:800;">${formatNumber(l.balance)}</td></tr>`);
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
    bodyHTML: `<div style="line-height:1.8;"><p>مرحباً بك في <strong>نظام الراجحي للمحاسبة</strong>. يمكنك من خلال هذا النظام:</p><ul style="padding-right:20px;margin-bottom:16px;"><li>إدارة المواد والعملاء والموردين</li><li>إنشاء فواتير المبيعات والمشتريات</li><li>تسجيل الدفعات والمصاريف</li><li>عرض التقارير المالية المتكاملة</li><li>إرسال الفواتير PDF إلى التلغرام</li></ul><div style="background:var(--bg);border-radius:12px;padding:16px;"><div style="font-weight:700;margin-bottom:4px;">💡 نصائح سريعة</div><div style="font-size:13px;color:var(--text-secondary);">استخدم البحث للوصول السريع للفواتير والمواد. يمكنك طباعة أي فاتورة مباشرة من قائمة الفواتير.</div></div><p style="margin-top:16px;color:var(--text-muted);font-size:13px;">للدعم الفني: @bukamal1991</p></div>`
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
