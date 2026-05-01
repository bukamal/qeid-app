// ==================== الإعدادات الأولية ====================
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();
if (tg.colorScheme === 'dark') document.body.classList.add('dark');
tg.onEvent('themeChanged', () => {
  document.body.classList.toggle('dark', tg.colorScheme === 'dark');
});

const initData = tg.initData;
const user = tg.initDataUnsafe?.user;
const apiBase = '/api';
const cache = {};
const CACHE_DURATION = 60000;

function getCached(key) {
  const entry = cache[key];
  if (entry && Date.now() - entry.time < CACHE_DURATION) return entry.data;
  delete cache[key];
  return null;
}

function setCache(key, data) {
  cache[key] = { data, time: Date.now() };
}

function clearCache() {
  for (const key in cache) delete cache[key];
}

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

// ==================== دوال API ====================
async function apiCall(endpoint, method = 'GET', body = {}) {
  let url = apiBase + endpoint;
  if (method === 'GET' || method === 'DELETE') {
    url += (url.includes('?') ? '&' : '?') + 'initData=' + encodeURIComponent(initData);
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
  if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
    // تحديث الكاش بعد التعديل
    const base = endpoint.split('?')[0].split('/')[1];
    for (const k in cache) if (k.includes(`/${base}`)) delete cache[k];
    // إعادة تحميل الكاش للصفحات الرئيسية
    if (base === 'invoices') invoicesCache = await apiCall('/invoices', 'GET');
    else if (base === 'items') itemsCache = await apiCall('/items', 'GET');
    else if (base === 'customers') customersCache = await apiCall('/customers', 'GET');
    else if (base === 'suppliers') suppliersCache = await apiCall('/suppliers', 'GET');
  }
  return json;
}

// ==================== كاش البيانات ====================
let customersCache = [], suppliersCache = [], itemsCache = [];
let categoriesCache = [], invoicesCache = [], unitsCache = [];
// ==================== لوحة التحكم ====================
async function loadDashboard() {
  try {
    const data = await apiCall('/summary', 'GET');
    const totalSales = data.total_sales || 0;
    const totalPurchases = data.total_purchases || 0;
    document.getElementById('tab-content').innerHTML = `
      <div class="summary-strip">
        <div class="summary-item profit"><div class="summary-icon">💰</div><div class="summary-label">صافي الربح</div><div class="summary-value ${data.net_profit>=0?'positive':'negative'}">${data.net_profit.toFixed(2)}</div></div>
        <div class="summary-item cash"><div class="summary-icon">🏦</div><div class="summary-label">رصيد الصندوق</div><div class="summary-value ${data.cash_balance>=0?'positive':'negative'}">${data.cash_balance.toFixed(2)}</div></div>
        <div class="summary-item daily-cash"><div class="summary-icon">📅</div><div class="summary-label">رصيد الصندوق اليومي</div><div class="summary-value ${data.daily_cash_balance>=0?'positive':'negative'}">${data.daily_cash_balance.toFixed(2)}</div></div>
        <div class="summary-item receivables"><div class="summary-icon">📥</div><div class="summary-label">الذمم المدينة</div><div class="summary-value">${data.receivables.toFixed(2)}</div></div>
        <div class="summary-item payables"><div class="summary-icon">📤</div><div class="summary-label">الذمم الدائنة</div><div class="summary-value">${data.payables.toFixed(2)}</div></div>
      </div>
      <div class="dashboard-grid">
        <div class="dash-card items"><span class="dash-icon">📦</span><div class="dash-label">المواد</div><div class="dash-value">${itemsCache.length}</div></div>
        <div class="dash-card customers"><span class="dash-icon">👥</span><div class="dash-label">العملاء</div><div class="dash-value">${customersCache.length}</div></div>
        <div class="dash-card suppliers"><span class="dash-icon">🏭</span><div class="dash-label">الموردين</div><div class="dash-value">${suppliersCache.length}</div></div>
        <div class="dash-card invoices"><span class="dash-icon">🧾</span><div class="dash-label">الفواتير</div><div class="dash-value">${invoicesCache.length}</div></div>
      </div>
      <div class="charts-row">
        <div class="chart-container"><h4>المبيعات والمشتريات</h4><canvas id="incomeChart"></canvas></div>
        <div class="chart-container"><h4>المدفوعات الشهرية</h4><canvas id="paymentsChart"></canvas></div>
        <div class="chart-container"><h4>صافي الربح اليومي</h4><canvas id="profitChart"></canvas></div>
      </div>`;
    setTimeout(() => {
      const ctx1 = document.getElementById('incomeChart');
      if (ctx1) new Chart(ctx1, { type: 'doughnut', data: { labels: ['مبيعات','مشتريات'], datasets: [{ data: [totalSales, totalPurchases], backgroundColor: ['#10b981','#f59e0b'], borderColor: '#fff', borderWidth: 2 }] }, options: { responsive: true, plugins: { legend: { position: 'bottom' } } } });
      const ctx2 = document.getElementById('paymentsChart');
      if (ctx2 && data.monthly) new Chart(ctx2, { type: 'bar', data: { labels: data.monthly.labels, datasets: [{ label: 'وارد', data: data.monthly.payments_in, backgroundColor: '#10b981' }, { label: 'منصرف', data: data.monthly.payments_out, backgroundColor: '#ef4444' }] }, options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } } });
      const ctx3 = document.getElementById('profitChart');
      if (ctx3 && data.daily) {
        const pts = data.daily.dates.map((ds, i) => ({ x: new Date(ds + 'T00:00:00'), y: data.daily.profits[i] }));
        new Chart(ctx3, { type: 'line', data: { datasets: [{ label: 'صافي الربح اليومي', data: pts, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, pointRadius: 3 }] }, options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { x: { type: 'time', time: { unit: 'day', displayFormats: { day: 'yyyy-MM-dd' } }, title: { display: true, text: 'التاريخ' } }, y: { beginAtZero: true, title: { display: true, text: 'الربح' } } } } });
      }
    }, 100);
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`;
  }
}
// ==================== النماذج المنبثقة العامة ====================
function showFormModal({ title, fields, initialValues = {}, onSave, onSuccess, confirmMode = false }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const fieldsHTML = fields.map(field => {
    let inputHTML = '';
    if (field.type === 'select' && field.options) {
      inputHTML = `<select id="${field.id}" class="input-field">${field.options}</select>`;
    } else {
      const inputType = field.type || 'text';
      const placeholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';
      const value = initialValues[field.id] !== undefined ? `value="${initialValues[field.id]}"` : '';
      inputHTML = `<input id="${field.id}" type="${inputType}" class="input-field" ${placeholder} ${value} />`;
    }
    return `<label class="form-label">${field.label}</label>${inputHTML}`;
  }).join('');
  const buttonsHTML = confirmMode
    ? `<button class="btn-danger" id="modal-confirm">نعم، احذف</button><button class="btn-secondary" id="modal-cancel">إلغاء</button>`
    : `<button class="btn-primary" id="modal-save">حفظ</button><button class="btn-secondary" id="modal-cancel">إلغاء</button>`;
  overlay.innerHTML = `<div class="modal-box"><h3>${title}</h3>${fieldsHTML}<div class="modal-actions">${buttonsHTML}</div></div>`;
  document.body.appendChild(overlay);
  const closeModal = () => { if (document.body.contains(overlay)) document.body.removeChild(overlay); };
  document.getElementById('modal-cancel').onclick = closeModal;
  const confirmBtn = document.getElementById(confirmMode ? 'modal-confirm' : 'modal-save');
  confirmBtn.onclick = async () => {
    if (confirmMode) { closeModal(); if (onSuccess) onSuccess(true); return; }
    const values = {};
    for (const field of fields) { const el = document.getElementById(field.id); if (el) values[field.id] = el.value.trim(); }
    try {
      const result = await onSave(values);
      if (result && result.error) { alert('خطأ: ' + result.error.message); }
      else { closeModal(); if (onSuccess) onSuccess(); }
    } catch (e) { alert('خطأ: ' + e.message); }
  };
}
function confirmDialog(msg) {
  return new Promise(resolve => {
    showFormModal({ title: msg, fields: [], confirmMode: true, onSuccess: (confirmed) => resolve(confirmed) });
  });
}
// ==================== العملاء ====================
function showAddCustomerModal() { /* ... الكود الكامل كما في app.js الأصلي ... */ }
function showEditCustomerModal(custId) { /* ... */ }
async function loadCustomers() { /* ... */ }
async function deleteCustomer(id) { /* ... */ }

// ==================== الموردين ====================
function showAddSupplierModal() { /* ... */ }
function showEditSupplierModal(supId) { /* ... */ }
async function loadSuppliers() { /* ... */ }
async function deleteSupplier(id) { /* ... */ }

// ==================== المواد ====================
function showAddItemModal() { /* ... */ }
function showEditItemModal(itemId) { /* ... */ }
async function loadItems() { /* ... */ }
function renderFilteredItems() { /* ... */ }
function showItemDetailModal(itemId) { /* ... */ }
async function deleteItem(id) { /* ... */ }

// ==================== التصنيفات ====================
function showAddCategoryModal() { /* ... */ }
function showEditCategoryModal(id) { /* ... */ }
async function loadCategories() { /* ... */ }
async function deleteCategory(id) { /* ... */ }

// ==================== الوحدات ====================
function showAddUnitModal() { /* ... */ }
function showEditUnitModal(id) { /* ... */ }
async function loadUnits() { /* ... */ }
async function deleteUnit(id) { /* ... */ }

// ==================== المصاريف ====================
function showAddExpenseModal() { /* ... */ }
async function loadExpenses() { /* ... */ }
async function deleteExpense(id) { /* ... */ }
// ==================== الفواتير ====================
async function loadSaleInvoiceForm() { showInvoiceModal('sale'); }
async function loadPurchaseInvoiceForm() { showInvoiceModal('purchase'); }
async function showInvoiceModal(type) { /* ... الكود الكامل ... */ }
function attachInvoiceEvents(invoiceType) { /* ... */ }
function updateInvoiceRemoveButtons() { /* ... */ }
async function loadInvoices() { /* ... */ }
function renderFilteredInvoices() { /* ... */ }
function printInvoice(invoice) { /* ... */ }
async function deleteInvoice(id) { /* ... */ }

// ==================== الدفعات ====================
async function loadPayments() { /* ... */ }
function showAddPaymentModal(customers, suppliers, invoices) { /* ... */ }
async function deletePayment(id) { /* ... */ }
// ==================== التقارير ====================
async function loadReports() { /* ... */ }
async function loadTrialBalance() { /* ... */ }
async function loadIncomeStatement() { /* ... */ }
async function loadBalanceSheet() { /* ... */ }
async function loadAccountLedgerForm() { /* ... */ }
async function loadCustomerStatementForm() { /* ... */ }
async function loadSupplierStatementForm() { /* ... */ }

// ==================== مساعدة ومستخدم ====================
function showHelpModal() { /* ... */ }
async function verifyUser() { /* ... الكود الأصلي ... */ }

// ==================== التمرير وضبط الهامش (جديد) ====================
(function(){
  const header = document.querySelector('header');
  const main = document.getElementById('main');
  if (header && main) {
    main.style.marginTop = header.offsetHeight + 'px';
    main.style.marginRight = ''; // إزالة أي هامش يمين
    window.addEventListener('resize', () => {
      main.style.marginTop = header.offsetHeight + 'px';
    });
  }
})();

// ==================== أحداث النقر على التبويبات ====================
document.addEventListener('click', e => {
  if (e.target.classList.contains('tab') || e.target.closest('.tab')) {
    const tab = e.target.closest('.tab');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const tabName = tab.dataset.tab;
    if (tabName === 'dashboard') loadDashboard();
    else if (tabName === 'items') loadItems();
    else if (tabName === 'sale-invoice') loadSaleInvoiceForm();
    else if (tabName === 'purchase-invoice') loadPurchaseInvoiceForm();
    else if (tabName === 'customers') loadCustomers();
    else if (tabName === 'suppliers') loadSuppliers();
    else if (tabName === 'categories') loadCategories();
    else if (tabName === 'units') loadUnits();
    else if (tabName === 'payments') loadPayments();
    else if (tabName === 'expenses') loadExpenses();
    else if (tabName === 'invoices') loadInvoices();
    else if (tabName === 'reports') loadReports();
  }
});
verifyUser();
