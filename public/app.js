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

async function apiCall(endpoint, method = 'GET', body = {}) {
  let url = apiBase + endpoint;
  if (method === 'GET') {
    url += '?initData=' + encodeURIComponent(initData);
    const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `خطأ ${res.status}`);
    return json;
  } else {
    const finalBody = { ...body, initData };
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalBody)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `خطأ ${res.status}`);
    return json;
  }
}

// ========== لوحة التحكم ==========
async function loadDashboard() {
  try {
    const entries = await apiCall('/entries', 'GET');
    const items = await apiCall('/items', 'GET');
    const customers = await apiCall('/customers', 'GET');
    const suppliers = await apiCall('/suppliers', 'GET');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">📊 القيود: ${entries.length}</div>
      <div class="card">📦 المواد: ${items.length}</div>
      <div class="card">👥 العملاء: ${customers.length}</div>
      <div class="card">🏭 الموردين: ${suppliers.length}</div>
    `;
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`;
  }
}

// ========== عرض القيود ==========
async function loadJournal() {
  try {
    const entries = await apiCall('/entries', 'GET');
    let html = '';
    if (entries.length === 0) {
      html = '<div class="card">لا توجد قيود</div>';
    } else {
      entries.forEach(e => {
        html += `<div class="card">
          <strong>${e.reference || 'بدون رقم'}</strong> – ${e.date}<br>
          ${e.description || ''}
          <div style="font-size:0.9em; margin-top:5px;">`;
        e.journal_lines.forEach(line => {
          let detail = `${line.account?.name || 'حساب ' + line.account_id}: ${line.debit > 0 ? 'مدين ' + line.debit : 'دائن ' + line.credit}`;
          if (line.item) detail += ` | ${line.item.name}`;
          if (line.customer) detail += ` | العميل: ${line.customer.name}`;
          if (line.supplier) detail += ` | المورد: ${line.supplier.name}`;
          html += detail + '<br>';
        });
        html += `</div></div>`;
      });
    }
    document.getElementById('tab-content').innerHTML = html;
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`;
  }
}

// ========== العملاء ==========
let customersCache = [];
async function loadCustomers() {
  try {
    const customers = await apiCall('/customers', 'GET');
    customersCache = customers;
    let html = `
      <div class="card">
        <h2>العملاء</h2>
        <button id="btn-add-customer" class="btn-primary">+ إضافة عميل</button>
      </div>
      <div id="customer-form" class="card" style="display:none;">
        <h3>إضافة عميل جديد</h3>
        <input id="customer-name" placeholder="الاسم" class="input-field" />
        <input id="customer-phone" placeholder="الهاتف" class="input-field" />
        <input id="customer-address" placeholder="العنوان" class="input-field" />
        <button id="btn-save-customer" class="btn-primary">حفظ</button>
        <button id="btn-cancel-customer" class="btn-secondary">إلغاء</button>
      </div>
    `;
    if (customers.length === 0) {
      html += '<div class="card">لا يوجد عملاء</div>';
    } else {
      html += customers.map(c => `
        <div class="card">
          <strong>${c.name}</strong>
          <span style="float:left; font-weight:bold; color:${c.balance >= 0 ? 'green' : 'red'};">الرصيد: ${c.balance}</span>
          <br>📞 ${c.phone || '-'} | 🏠 ${c.address || '-'}
        </div>
      `).join('');
    }
    document.getElementById('tab-content').innerHTML = html;
    attachCustomersEvents();
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`;
  }
}
function attachCustomersEvents() {
  document.getElementById('btn-add-customer')?.addEventListener('click', () => {
    document.getElementById('customer-form').style.display = 'block';
  });
  document.getElementById('btn-cancel-customer')?.addEventListener('click', () => {
    document.getElementById('customer-form').style.display = 'none';
  });
  document.getElementById('btn-save-customer')?.addEventListener('click', async () => {
    const name = document.getElementById('customer-name').value.trim();
    if (!name) return alert('الاسم مطلوب');
    const payload = {
      name,
      phone: document.getElementById('customer-phone').value.trim(),
      address: document.getElementById('customer-address').value.trim()
    };
    try {
      await apiCall('/customers', 'POST', payload);
      document.getElementById('customer-form').style.display = 'none';
      loadCustomers();
    } catch (err) { alert('خطأ: ' + err.message); }
  });
}

// ========== الموردين ==========
let suppliersCache = [];
async function loadSuppliers() {
  try {
    const suppliers = await apiCall('/suppliers', 'GET');
    suppliersCache = suppliers;
    let html = `
      <div class="card">
        <h2>الموردين</h2>
        <button id="btn-add-supplier" class="btn-primary">+ إضافة مورد</button>
      </div>
      <div id="supplier-form" class="card" style="display:none;">
        <h3>إضافة مورد جديد</h3>
        <input id="supplier-name" placeholder="الاسم" class="input-field" />
        <input id="supplier-phone" placeholder="الهاتف" class="input-field" />
        <input id="supplier-address" placeholder="العنوان" class="input-field" />
        <button id="btn-save-supplier" class="btn-primary">حفظ</button>
        <button id="btn-cancel-supplier" class="btn-secondary">إلغاء</button>
      </div>
    `;
    if (suppliers.length === 0) {
      html += '<div class="card">لا يوجد موردين</div>';
    } else {
      html += suppliers.map(s => `
        <div class="card">
          <strong>${s.name}</strong>
          <span style="float:left; font-weight:bold; color:${s.balance <= 0 ? 'green' : 'red'};">الرصيد: ${s.balance}</span>
          <br>📞 ${s.phone || '-'} | 🏠 ${s.address || '-'}
        </div>
      `).join('');
    }
    document.getElementById('tab-content').innerHTML = html;
    attachSuppliersEvents();
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`;
  }
}
function attachSuppliersEvents() {
  document.getElementById('btn-add-supplier')?.addEventListener('click', () => {
    document.getElementById('supplier-form').style.display = 'block';
  });
  document.getElementById('btn-cancel-supplier')?.addEventListener('click', () => {
    document.getElementById('supplier-form').style.display = 'none';
  });
  document.getElementById('btn-save-supplier')?.addEventListener('click', async () => {
    const name = document.getElementById('supplier-name').value.trim();
    if (!name) return alert('الاسم مطلوب');
    const payload = {
      name,
      phone: document.getElementById('supplier-phone').value.trim(),
      address: document.getElementById('supplier-address').value.trim()
    };
    try {
      await apiCall('/suppliers', 'POST', payload);
      document.getElementById('supplier-form').style.display = 'none';
      loadSuppliers();
    } catch (err) { alert('خطأ: ' + err.message); }
  });
}

// ========== المواد ==========
let itemsCache = [];
async function loadItems() {
  try {
    const [items, categories] = await Promise.all([
      apiCall('/items', 'GET'),
      apiCall('/categories', 'GET')
    ]);
    itemsCache = items;
    let html = `
      <div class="card" style="margin-bottom:20px;">
        <h2>المواد</h2>
        <button id="btn-add-item" class="btn-primary">+ إضافة مادة</button>
      </div>
      <div id="item-form" class="card" style="display:none;">
        <h3>إضافة مادة جديدة</h3>
        <input id="item-name" placeholder="اسم المادة" class="input-field" />
        <select id="item-category" class="input-field">
          <option value="">بدون تصنيف</option>
          ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
        <div style="display:flex; gap:8px; margin:5px 0;">
          <input id="item-add-category" placeholder="تصنيف جديد" class="input-field" style="flex:2;" />
          <button id="btn-add-category" class="btn-secondary" style="flex:1;">أضف تصنيف</button>
        </div>
        <select id="item-type" class="input-field">
          <option value="مخزون">مخزون</option>
          <option value="منتج نهائي">منتج نهائي</option>
          <option value="خدمة">خدمة</option>
        </select>
        <input id="item-purchase" placeholder="سعر الشراء" type="number" step="0.01" class="input-field" />
        <input id="item-selling" placeholder="سعر البيع" type="number" step="0.01" class="input-field" />
        <input id="item-qty" placeholder="الكمية" type="number" step="any" class="input-field" />
        <button id="btn-save-item" class="btn-primary">حفظ</button>
        <button id="btn-cancel-item" class="btn-secondary">إلغاء</button>
      </div>
    `;
    if (items.length === 0) {
      html += '<div class="card">لا توجد مواد مضافة بعد</div>';
    } else {
      html += items.map(item => `
        <div class="card item-row">
          <strong>${item.name}</strong> 
          <span style="float:left; font-size:0.9em;">${item.item_type || 'مخزون'}</span>
          <br>
          📂 ${item.category ? item.category.name : 'بدون تصنيف'} |
          🛒 شراء: ${item.purchase_price} | 💰 بيع: ${item.selling_price} | 📦 الكمية: ${item.quantity}
        </div>
      `).join('');
    }
    document.getElementById('tab-content').innerHTML = html;
    attachItemsEvents();
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`;
  }
}
function attachItemsEvents() {
  document.getElementById('btn-add-item')?.addEventListener('click', () => {
    document.getElementById('item-form').style.display = 'block';
  });
  document.getElementById('btn-cancel-item')?.addEventListener('click', () => {
    document.getElementById('item-form').style.display = 'none';
  });
  document.getElementById('btn-add-category')?.addEventListener('click', async () => {
    const name = document.getElementById('item-add-category').value.trim();
    if (!name) return alert('أدخل اسم التصنيف');
    try {
      const newCat = await apiCall('/categories', 'POST', { name });
      const select = document.getElementById('item-category');
      const opt = document.createElement('option');
      opt.value = newCat.id;
      opt.textContent = newCat.name;
      select.appendChild(opt);
      select.value = newCat.id;
      document.getElementById('item-add-category').value = '';
    } catch (err) { alert('خطأ: ' + err.message); }
  });
  document.getElementById('btn-save-item')?.addEventListener('click', async () => {
    const name = document.getElementById('item-name').value.trim();
    if (!name) return alert('اسم المادة مطلوب');
    const payload = {
      name,
      category_id: document.getElementById('item-category').value || null,
      item_type: document.getElementById('item-type').value,
      purchase_price: parseFloat(document.getElementById('item-purchase').value) || 0,
      selling_price: parseFloat(document.getElementById('item-selling').value) || 0,
      quantity: parseFloat(document.getElementById('item-qty').value) || 0
    };
    try {
      await apiCall('/items', 'POST', payload);
      document.getElementById('item-form').style.display = 'none';
      loadItems();
    } catch (err) { alert('خطأ: ' + err.message); }
  });
}

// ========== نموذج إضافة قيد ==========
let accountsCache = [];
async function loadAddEntryForm() {
  try {
    const [accounts, items, customers, suppliers] = await Promise.all([
      apiCall('/accounts', 'GET'),
      apiCall('/items', 'GET'),
      apiCall('/customers', 'GET'),
      apiCall('/suppliers', 'GET')
    ]);
    accountsCache = accounts;
    itemsCache = items;
    customersCache = customers;
    suppliersCache = suppliers;

    let accountOptions = accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    let itemOptions = '<option value="">بدون مادة</option>' + items.map(i => `<option value="${i.id}">${i.name} (${i.quantity})</option>`).join('');
    let customerOptions = '<option value="">بدون عميل</option>' + customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    let supplierOptions = '<option value="">بدون مورد</option>' + suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

    const html = `
      <div class="card">
        <h3>إضافة قيد جديد</h3>
        <input id="entry-date" type="date" class="input-field" value="${new Date().toISOString().split('T')[0]}" />
        <input id="entry-ref" placeholder="الرقم المرجعي (اختياري)" class="input-field" />
        <input id="entry-desc" placeholder="الوصف" class="input-field" />
        <div id="lines-container">
          <div class="line-row" data-index="0">
            <select class="input-field account-select">${accountOptions}</select>
            <input type="number" step="0.01" placeholder="مدين" class="input-field debit-input" />
            <input type="number" step="0.01" placeholder="دائن" class="input-field credit-input" />
            <select class="input-field item-select">${itemOptions}</select>
            <input type="number" step="any" placeholder="الكمية" class="input-field qty-input" />
            <select class="input-field customer-select">${customerOptions}</select>
            <select class="input-field supplier-select">${supplierOptions}</select>
            <button class="btn-remove-line btn-secondary" style="display:none;">✕</button>
          </div>
        </div>
        <button id="btn-add-line" class="btn-secondary">+ إضافة سطر</button>
        <button id="btn-save-entry" class="btn-primary">حفظ القيد</button>
      </div>
    `;
    document.getElementById('tab-content').innerHTML = html;
    attachEntryEvents();
    updateRemoveButtons();
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`;
  }
}
let lineIndex = 1;
function attachEntryEvents() {
  document.getElementById('btn-add-line')?.addEventListener('click', () => {
    const container = document.getElementById('lines-container');
    const accountOptions = accountsCache.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    const itemOptions = '<option value="">بدون مادة</option>' + itemsCache.map(i => `<option value="${i.id}">${i.name} (${i.quantity})</option>`).join('');
    const customerOptions = '<option value="">بدون عميل</option>' + customersCache.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const supplierOptions = '<option value="">بدون مورد</option>' + suppliersCache.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

    const newLine = document.createElement('div');
    newLine.className = 'line-row';
    newLine.dataset.index = lineIndex++;
    newLine.innerHTML = `
      <select class="input-field account-select">${accountOptions}</select>
      <input type="number" step="0.01" placeholder="مدين" class="input-field debit-input" />
      <input type="number" step="0.01" placeholder="دائن" class="input-field credit-input" />
      <select class="input-field item-select">${itemOptions}</select>
      <input type="number" step="any" placeholder="الكمية" class="input-field qty-input" />
      <select class="input-field customer-select">${customerOptions}</select>
      <select class="input-field supplier-select">${supplierOptions}</select>
      <button class="btn-remove-line btn-secondary">✕</button>
    `;
    container.appendChild(newLine);
    updateRemoveButtons();
  });

  document.getElementById('lines-container')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-remove-line')) {
      const lineRow = e.target.closest('.line-row');
      if (document.querySelectorAll('.line-row').length > 1) {
        lineRow.remove();
        updateRemoveButtons();
      }
    }
  });

  document.getElementById('btn-save-entry')?.addEventListener('click', async () => {
    const date = document.getElementById('entry-date').value;
    const reference = document.getElementById('entry-ref').value.trim();
    const description = document.getElementById('entry-desc').value.trim();
    if (!date || !description) return alert('التاريخ والوصف مطلوبان');

    const lines = [];
    let totalDebit = 0, totalCredit = 0;
    document.querySelectorAll('.line-row').forEach(row => {
      const accountId = row.querySelector('.account-select').value;
      const debit = parseFloat(row.querySelector('.debit-input').value) || 0;
      const credit = parseFloat(row.querySelector('.credit-input').value) || 0;
      const itemId = row.querySelector('.item-select').value || null;
      const qtyChange = parseFloat(row.querySelector('.qty-input').value) || 0;
      const customerId = row.querySelector('.customer-select').value || null;
      const supplierId = row.querySelector('.supplier-select').value || null;

      if (!accountId) return;
      lines.push({
        account_id: accountId,
        debit,
        credit,
        item_id: itemId,
        quantity_change: qtyChange,
        customer_id: customerId,
        supplier_id: supplierId
      });
      totalDebit += debit;
      totalCredit += credit;
    });

    if (lines.length < 2) return alert('أضف سطرين على الأقل');
    if (Math.abs(totalDebit - totalCredit) > 0.01) return alert('المبلغ المدين يجب أن يساوي المبلغ الدائن');

    try {
      await apiCall('/entries', 'POST', { date, description, reference, lines });
      alert('تم حفظ القيد بنجاح');
      itemsCache = await apiCall('/items', 'GET');
      customersCache = await apiCall('/customers', 'GET');
      suppliersCache = await apiCall('/suppliers', 'GET');
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelector('.tab[data-tab="journal"]').classList.add('active');
      loadJournal();
    } catch (err) {
      alert('خطأ: ' + err.message);
    }
  });
}
function updateRemoveButtons() {
  const rows = document.querySelectorAll('.line-row');
  rows.forEach(row => {
    const btn = row.querySelector('.btn-remove-line');
    if (btn) btn.style.display = rows.length > 1 ? 'inline-block' : 'none';
  });
}

// ========== التقارير ==========
async function loadReports() {
  let html = `
    <div class="card"><h2>التقارير</h2></div>
    <div class="card report-link" data-report="trial_balance">📊 ميزان المراجعة</div>
    <div class="card report-link" data-report="income_statement">📈 قائمة الدخل</div>
    <div class="card report-link" data-report="balance_sheet">⚖️ الميزانية العمومية</div>
    <div class="card report-link" data-report="account_ledger">📒 الأستاذ العام (حركة حساب)</div>
    <div class="card report-link" data-report="customer_statement">👤 كشف حساب عميل</div>
    <div class="card report-link" data-report="supplier_statement">🏭 كشف حساب مورد</div>
  `;
  document.getElementById('tab-content').innerHTML = html;
  document.querySelectorAll('.report-link').forEach(el => {
    el.addEventListener('click', () => {
      const report = el.dataset.report;
      if (report === 'trial_balance') loadTrialBalance();
      else if (report === 'income_statement') loadIncomeStatement();
      else if (report === 'balance_sheet') loadBalanceSheet();
      else if (report === 'account_ledger') loadAccountLedgerForm();
      else if (report === 'customer_statement') loadCustomerStatementForm();
      else if (report === 'supplier_statement') loadSupplierStatementForm();
    });
  });
}

async function loadTrialBalance() {
  try {
    const data = await apiCall('/reports?type=trial_balance', 'GET');
    let rows = data.map(r => `
      <tr>
        <td>${r.name}</td>
        <td>${r.total_debit.toFixed(2)}</td>
        <td>${r.total_credit.toFixed(2)}</td>
        <td style="color:${r.balance >= 0 ? 'green' : 'red'}">${r.balance.toFixed(2)}</td>
      </tr>
    `).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn-secondary" onclick="loadReports()">🔙 رجوع</button>
        <h3>ميزان المراجعة</h3>
        <table class="report-table">
          <tr><th>الحساب</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr>
          ${rows}
        </table>
      </div>
    `;
  } catch (e) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${e.message}</div>`; }
}

async function loadIncomeStatement() {
  try {
    const data = await apiCall('/reports?type=income_statement', 'GET');
    let incomeRows = data.income.map(i => `<tr><td>${i.name}</td><td>${i.balance.toFixed(2)}</td></tr>`).join('');
    let expenseRows = data.expenses.map(e => `<tr><td>${e.name}</td><td>${e.balance.toFixed(2)}</td></tr>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn-secondary" onclick="loadReports()">🔙 رجوع</button>
        <h3>قائمة الدخل</h3>
        <h4>الإيرادات</h4>
        <table class="report-table">${incomeRows}</table>
        <strong>إجمالي الإيرادات: ${data.total_income.toFixed(2)}</strong>
        <h4>المصروفات</h4>
        <table class="report-table">${expenseRows}</table>
        <strong>إجمالي المصروفات: ${data.total_expenses.toFixed(2)}</strong>
        <hr>
        <h2>صافي الربح: ${data.net_profit.toFixed(2)}</h2>
      </div>
    `;
  } catch (e) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${e.message}</div>`; }
}

async function loadBalanceSheet() {
  try {
    const data = await apiCall('/reports?type=balance_sheet', 'GET');
    let assetRows = data.assets.map(a => `<tr><td>${a.name}</td><td>${a.balance.toFixed(2)}</td></tr>`).join('');
    let liabRows = data.liabilities.map(l => `<tr><td>${l.name}</td><td>${l.balance.toFixed(2)}</td></tr>`).join('');
    let equityRows = data.equity.map(e => `<tr><td>${e.name}</td><td>${e.balance.toFixed(2)}</td></tr>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn-secondary" onclick="loadReports()">🔙 رجوع</button>
        <h3>الميزانية العمومية</h3>
        <h4>الأصول</h4>
        <table class="report-table">${assetRows}</table>
        <strong>إجمالي الأصول: ${data.total_assets.toFixed(2)}</strong>
        <h4>الخصوم</h4>
        <table class="report-table">${liabRows}</table>
        <strong>إجمالي الخصوم: ${data.total_liabilities.toFixed(2)}</strong>
        <h4>حقوق الملكية</h4>
        <table class="report-table">${equityRows}</table>
        <strong>إجمالي حقوق الملكية: ${data.total_equity.toFixed(2)}</strong>
      </div>
    `;
  } catch (e) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${e.message}</div>`; }
}

async function loadAccountLedgerForm() {
  try {
    const accounts = await apiCall('/accounts', 'GET');
    let options = accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn-secondary" onclick="loadReports()">🔙 رجوع</button>
        <h3>الأستاذ العام</h3>
        <select id="ledger-account" class="input-field">${options}</select>
        <button id="btn-ledger" class="btn-primary">عرض الحركات</button>
        <div id="ledger-result"></div>
      </div>
    `;
    document.getElementById('btn-ledger').addEventListener('click', async () => {
      const accountId = document.getElementById('ledger-account').value;
      if (!accountId) return;
      try {
        const lines = await apiCall(`/reports?type=account_ledger&account_id=${accountId}`, 'GET');
        let html = '<table class="report-table"><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th></tr>';
        lines.forEach(l => {
          html += `<tr>
            <td>${l.entry?.date || ''}</td>
            <td>${l.entry?.description || ''}</td>
            <td>${l.debit || ''}</td>
            <td>${l.credit || ''}</td>
          </tr>`;
        });
        html += '</table>';
        document.getElementById('ledger-result').innerHTML = html;
      } catch (e) { document.getElementById('ledger-result').innerHTML = `<div style="color:red;">⚠️ ${e.message}</div>`; }
    });
  } catch (e) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${e.message}</div>`; }
}

async function loadCustomerStatementForm() {
  try {
    const customers = await apiCall('/customers', 'GET');
    let options = customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn-secondary" onclick="loadReports()">🔙 رجوع</button>
        <h3>كشف حساب عميل</h3>
        <select id="statement-customer" class="input-field">${options}</select>
        <button id="btn-customer-statement" class="btn-primary">عرض الكشف</button>
        <div id="statement-result"></div>
      </div>
    `;
    document.getElementById('btn-customer-statement').addEventListener('click', async () => {
      const customerId = document.getElementById('statement-customer').value;
      if (!customerId) return;
      try {
        const lines = await apiCall(`/reports?type=customer_statement&customer_id=${customerId}`, 'GET');
        let html = '<table class="report-table"><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th></tr>';
        lines.forEach(l => {
          html += `<tr>
            <td>${l.entry?.date || ''}</td>
            <td>${l.entry?.description || ''}</td>
            <td>${l.debit || ''}</td>
            <td>${l.credit || ''}</td>
          </tr>`;
        });
        html += '</table>';
        document.getElementById('statement-result').innerHTML = html;
      } catch (e) { document.getElementById('statement-result').innerHTML = `<div style="color:red;">⚠️ ${e.message}</div>`; }
    });
  } catch (e) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${e.message}</div>`; }
}

async function loadSupplierStatementForm() {
  try {
    const suppliers = await apiCall('/suppliers', 'GET');
    let options = suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn-secondary" onclick="loadReports()">🔙 رجوع</button>
        <h3>كشف حساب مورد</h3>
        <select id="statement-supplier" class="input-field">${options}</select>
        <button id="btn-supplier-statement" class="btn-primary">عرض الكشف</button>
        <div id="statement-result"></div>
      </div>
    `;
    document.getElementById('btn-supplier-statement').addEventListener('click', async () => {
      const supplierId = document.getElementById('statement-supplier').value;
      if (!supplierId) return;
      try {
        const lines = await apiCall(`/reports?type=supplier_statement&supplier_id=${supplierId}`, 'GET');
        let html = '<table class="report-table"><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th></tr>';
        lines.forEach(l => {
          html += `<tr>
            <td>${l.entry?.date || ''}</td>
            <td>${l.entry?.description || ''}</td>
            <td>${l.debit || ''}</td>
            <td>${l.credit || ''}</td>
          </tr>`;
        });
        html += '</table>';
        document.getElementById('statement-result').innerHTML = html;
      } catch (e) { document.getElementById('statement-result').innerHTML = `<div style="color:red;">⚠️ ${e.message}</div>`; }
    });
  } catch (e) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${e.message}</div>`; }
}

// ========== توجيه التبويبات ==========
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('tab')) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    const tab = e.target.dataset.tab;
    if (tab === 'dashboard') loadDashboard();
    else if (tab === 'journal') loadJournal();
    else if (tab === 'add-entry') loadAddEntryForm();
    else if (tab === 'items') loadItems();
    else if (tab === 'customers') loadCustomers();
    else if (tab === 'suppliers') loadSuppliers();
    else if (tab === 'reports') loadReports();
  }
});

// ========== بدء التطبيق ==========
async function verifyUser() {
  try {
    const data = await apiCall('/verify', 'POST');
    if (data.verified) {
      document.getElementById('user-name').textContent = user.first_name;
      document.getElementById('loading').style.display = 'none';
      document.getElementById('main').style.display = 'block';
      loadDashboard();
    } else {
      throw new Error('فشل التحقق من الهوية');
    }
  } catch (err) {
    showError(err.message);
  }
}
verifyUser();
