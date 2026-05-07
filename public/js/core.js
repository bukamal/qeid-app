// ========== الأساسيات ==========
export const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

export const ICONS = {
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

export function applyTheme() {
  document.body.classList.toggle('dark', tg.colorScheme === 'dark');
  tg.setHeaderColor(tg.colorScheme === 'dark' ? '#0b1120' : '#f1f5f9');
}
applyTheme();
tg.onEvent('themeChanged', applyTheme);

export const initData = tg.initData;
export const user = tg.initDataUnsafe?.user;
export const apiBase = '/api';

export function formatNumber(num) {
  if (num === undefined || num === null) return '0.00';
  return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function debounce(fn, ms = 300) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// نظام التخزين المؤقت
const cache = {};
const CACHE_DURATION = 60000;
export function getCached(key) {
  const e = cache[key]; if (e && Date.now() - e.time < CACHE_DURATION) return e.data;
  delete cache[key]; return null;
}
export function setCache(key, data) { cache[key] = { data, time: Date.now() }; }
export function invalidateCache(pattern) {
  Object.keys(cache).forEach(k => { if (k.includes(pattern)) delete cache[k]; });
}

// المتغيرات العامة للمخابئ
export let customersCache = [];
export let suppliersCache = [];
export let itemsCache = [];
export let categoriesCache = [];
export let invoicesCache = [];
export let unitsCache = [];

export function setCustomersCache(data) { customersCache = data; }
export function setSuppliersCache(data) { suppliersCache = data; }
export function setItemsCache(data) { itemsCache = data; }
export function setCategoriesCache(data) { categoriesCache = data; }
export function setInvoicesCache(data) { invoicesCache = data; }
export function setUnitsCache(data) { unitsCache = data; }

// دالة apiCall
export async function apiCall(endpoint, method = 'GET', body = {}, retries = 1) {
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
        const freshUnits = await apiCall('/definitions?type=unit', 'GET');
        setUnitsCache(freshUnits);
      }
      if (base === 'invoices') {
        const freshInvoices = await apiCall('/invoices', 'GET');
        setInvoicesCache(freshInvoices);
      }
      if (base === 'items') {
        const freshItems = await apiCall('/items', 'GET');
        setItemsCache(freshItems);
      }
      if (base === 'customers') {
        const freshCustomers = await apiCall('/customers', 'GET');
        setCustomersCache(freshCustomers);
      }
      if (base === 'suppliers') {
        const freshSuppliers = await apiCall('/suppliers', 'GET');
        setSuppliersCache(freshSuppliers);
      }
    }
    return json;
  } catch (err) {
    if (retries > 0 && err.name !== 'AbortError') return apiCall(endpoint, method, body, retries - 1);
    throw err;
  }
}

// دوال scroll lock
let scrollLockPos = 0;
export function lockScroll() {
  scrollLockPos = window.scrollY || document.documentElement.scrollTop;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollLockPos}px`;
  document.body.style.width = '100%';
  document.body.classList.add('scroll-locked');
}
export function unlockScroll() {
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  document.body.classList.remove('scroll-locked');
  window.scrollTo(0, scrollLockPos);
}

// دوال مساعدة للفواتير (مشتركة)
export function generateLineRowHtml(lineData = null, isSale) {
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

export function getUnitOptionsForItem(itemId, selectedUnitId = null) {
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
