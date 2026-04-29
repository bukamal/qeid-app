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
  if (method === 'GET' || method === 'DELETE') {
    const separator = url.includes('?') ? '&' : '?';
    url += separator + 'initData=' + encodeURIComponent(initData);
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' } });
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
// ==================== لوحة التحكم ====================
async function loadDashboard() {
  try {
    const items = await apiCall('/items', 'GET');
    const customers = await apiCall('/customers', 'GET');
    const suppliers = await apiCall('/suppliers', 'GET');
    const invoices = await apiCall('/invoices', 'GET');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">📦 المواد: ${items.length}</div>
      <div class="card">👥 العملاء: ${customers.length}</div>
      <div class="card">🏭 الموردين: ${suppliers.length}</div>
      <div class="card">🧾 الفواتير: ${invoices.length}</div>
    `;
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`;
  }
}
// ==================== العملاء ====================
let customersCache = [];
async function loadCustomers() {
  try {
    const customers = await apiCall('/customers', 'GET');
    customersCache = customers;
    let html = `
      <div class="card"><h2>العملاء</h2><button id="btn-add-customer" class="btn-primary">+ إضافة عميل</button></div>
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
          <div class="card-actions">
            <button class="btn-secondary" onclick="showEditCustomerModal(${c.id})">✏️ تعديل</button>
            <button class="btn-danger" onclick="deleteCustomer(${c.id})">🗑️ حذف</button>
          </div>
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
// نموذج تعديل عميل
function showEditCustomerModal(custId) {
  const customer = customersCache.find(c => c.id === custId);
  if (!customer) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <h3>تعديل العميل</h3>
      <input id="edit-cust-name" class="input-field" value="${customer.name}" />
      <input id="edit-cust-phone" class="input-field" value="${customer.phone || ''}" />
      <input id="edit-cust-address" class="input-field" value="${customer.address || ''}" />
      <div class="modal-actions">
        <button class="btn-primary" id="save-cust-edit">حفظ</button>
        <button class="btn-secondary" id="cancel-cust-edit">إلغاء</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('save-cust-edit').onclick = async () => {
    const name = document.getElementById('edit-cust-name').value.trim();
    if (!name) return alert('الاسم مطلوب');
    const phone = document.getElementById('edit-cust-phone').value.trim();
    const address = document.getElementById('edit-cust-address').value.trim();
    try {
      await apiCall('/customers', 'PUT', { id: custId, name, phone, address });
      document.body.removeChild(overlay);
      loadCustomers();
    } catch (e) { alert('خطأ: ' + e.message); }
  };
  document.getElementById('cancel-cust-edit').onclick = () => {
    document.body.removeChild(overlay);
  };
}
// ==================== الموردين ====================
let suppliersCache = [];
async function loadSuppliers() {
  try {
    const suppliers = await apiCall('/suppliers', 'GET');
    suppliersCache = suppliers;
    let html = `
      <div class="card"><h2>الموردين</h2><button id="btn-add-supplier" class="btn-primary">+ إضافة مورد</button></div>
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
          <div class="card-actions">
            <button class="btn-secondary" onclick="showEditSupplierModal(${s.id})">✏️ تعديل</button>
            <button class="btn-danger" onclick="deleteSupplier(${s.id})">🗑️ حذف</button>
          </div>
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
// نموذج تعديل مورد
function showEditSupplierModal(supId) {
  const supplier = suppliersCache.find(s => s.id === supId);
  if (!supplier) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <h3>تعديل المورد</h3>
      <input id="edit-sup-name" class="input-field" value="${supplier.name}" />
      <input id="edit-sup-phone" class="input-field" value="${supplier.phone || ''}" />
      <input id="edit-sup-address" class="input-field" value="${supplier.address || ''}" />
      <div class="modal-actions">
        <button class="btn-primary" id="save-sup-edit">حفظ</button>
        <button class="btn-secondary" id="cancel-sup-edit">إلغاء</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('save-sup-edit').onclick = async () => {
    const name = document.getElementById('edit-sup-name').value.trim();
    if (!name) return alert('الاسم مطلوب');
    const phone = document.getElementById('edit-sup-phone').value.trim();
    const address = document.getElementById('edit-sup-address').value.trim();
    try {
      await apiCall('/suppliers', 'PUT', { id: supId, name, phone, address });
      document.body.removeChild(overlay);
      loadSuppliers();
    } catch (e) { alert('خطأ: ' + e.message); }
  };
  document.getElementById('cancel-sup-edit').onclick = () => {
    document.body.removeChild(overlay);
  };
}
// ==================== المواد ====================
let itemsCache = [];
let categoriesCache = [];
async function loadItems() {
  try {
    const [items, categories] = await Promise.all([
      apiCall('/items', 'GET'),
      apiCall('/categories', 'GET')
    ]);
    itemsCache = items;
    categoriesCache = categories;
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
          <div class="card-actions">
            <button class="btn-secondary" onclick="showEditItemModal(${item.id})">✏️ تعديل</button>
            <button class="btn-danger" onclick="deleteItem(${item.id})">🗑️ حذف</button>
          </div>
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
// نموذج تعديل مادة (جميع الحقول)
function showEditItemModal(itemId) {
  const item = itemsCache.find(i => i.id === itemId);
  if (!item) return;
  const catOptions = categoriesCache.map(c => `<option value="${c.id}" ${c.id === item.category_id ? 'selected' : ''}>${c.name}</option>`).join('');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <h3>تعديل المادة</h3>
      <input id="edit-item-name" class="input-field" value="${item.name}" />
      <select id="edit-item-category" class="input-field">
        <option value="">بدون تصنيف</option>
        ${catOptions}
      </select>
      <select id="edit-item-type" class="input-field">
        <option value="مخزون" ${item.item_type === 'مخزون' ? 'selected' : ''}>مخزون</option>
        <option value="منتج نهائي" ${item.item_type === 'منتج نهائي' ? 'selected' : ''}>منتج نهائي</option>
        <option value="خدمة" ${item.item_type === 'خدمة' ? 'selected' : ''}>خدمة</option>
      </select>
      <input id="edit-item-purchase" type="number" step="0.01" class="input-field" value="${item.purchase_price}" />
      <input id="edit-item-selling" type="number" step="0.01" class="input-field" value="${item.selling_price}" />
      <input id="edit-item-qty" type="number" step="any" class="input-field" value="${item.quantity}" />
      <div class="modal-actions">
        <button class="btn-primary" id="save-item-edit">حفظ</button>
        <button class="btn-secondary" id="cancel-item-edit">إلغاء</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('save-item-edit').onclick = async () => {
    const name = document.getElementById('edit-item-name').value.trim();
    if (!name) return alert('الاسم مطلوب');
    const payload = {
      id: itemId,
      name,
      category_id: document.getElementById('edit-item-category').value || null,
      item_type: document.getElementById('edit-item-type').value,
      purchase_price: parseFloat(document.getElementById('edit-item-purchase').value) || 0,
      selling_price: parseFloat(document.getElementById('edit-item-selling').value) || 0,
      quantity: parseFloat(document.getElementById('edit-item-qty').value) || 0
    };
    try {
      await apiCall('/items', 'PUT', payload);
      document.body.removeChild(overlay);
      loadItems();
    } catch (e) { alert('خطأ: ' + e.message); }
  };
  document.getElementById('cancel-item-edit').onclick = () => {
    document.body.removeChild(overlay);
  };
}
// ==================== فاتورة مبيعات سريعة ====================
async function loadSaleInvoiceForm() {
  await loadInvoiceFormByType('sale');
}

// ==================== فاتورة مشتريات سريعة ====================
async function loadPurchaseInvoiceForm() {
  await loadInvoiceFormByType('purchase');
}

// دالة مشتركة لإنشاء فاتورة بنوع محدد
async function loadInvoiceFormByType(type) {
  try {
    const [customers, suppliers, items] = await Promise.all([
      apiCall('/customers', 'GET'),
      apiCall('/suppliers', 'GET'),
      apiCall('/items', 'GET')
    ]);
    itemsCache = items;
    customersCache = customers;
    suppliersCache = suppliers;

    let html = `
      <div class="card">
        <h3>فاتورة ${type === 'sale' ? 'مبيعات' : 'مشتريات'} جديدة</h3>
        <input type="hidden" id="inv-type" value="${type}" />
        ${type === 'sale' ? `
          <select id="inv-customer" class="input-field">
            <option value="">اختر عميل</option>
            ${customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        ` : `
          <select id="inv-supplier" class="input-field">
            <option value="">اختر مورد</option>
            ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        `}
        <input id="inv-date" type="date" class="input-field" value="${new Date().toISOString().split('T')[0]}" />
        <input id="inv-ref" placeholder="الرقم المرجعي" class="input-field" />
        <textarea id="inv-notes" placeholder="ملاحظات" class="input-field"></textarea>
        <h4>البنود</h4>
        <div id="inv-lines-container">
          <div class="line-row">
            <select class="input-field item-select">
              <option value="">اختر مادة</option>
              ${items.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}
            </select>
            <input type="number" step="any" placeholder="الكمية" class="input-field qty-input" />
            <input type="number" step="0.01" placeholder="السعر" class="input-field price-input" />
            <input type="number" step="0.01" placeholder="الإجمالي" class="input-field total-input" readonly />
            <button class="btn-remove-line btn-secondary" style="display:none;">✕</button>
          </div>
        </div>
        <button id="btn-add-inv-line" class="btn-secondary">+ بند</button>
        <h4>المدفوعات</h4>
        <input id="inv-paid" type="number" step="0.01" placeholder="المبلغ المدفوع" class="input-field" value="0" />
        <button id="btn-save-invoice" class="btn-primary">حفظ الفاتورة</button>
      </div>
    `;
    document.getElementById('tab-content').innerHTML = html;
    attachInvoiceEvents();
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`;
  }
}

// دوال مساعدة للفواتير
function updateInvoiceRemoveButtons() {
  const rows = document.querySelectorAll('#inv-lines-container .line-row');
  rows.forEach(row => {
    const btn = row.querySelector('.btn-remove-line');
    if (btn) btn.style.display = rows.length > 1 ? 'inline-block' : 'none';
  });
}
// ==================== عرض جميع الفواتير مع التعديل والطباعة والحذف ====================
let invoicesCache = [];
async function loadInvoices() {
  try {
    const [invoices, customers, suppliers, items] = await Promise.all([
      apiCall('/invoices', 'GET'),
      apiCall('/customers', 'GET'),
      apiCall('/suppliers', 'GET'),
      apiCall('/items', 'GET')
    ]);
    invoicesCache = invoices;
    customersCache = customers;
    suppliersCache = suppliers;
    itemsCache = items;

    let html = `<div class="card"><h2>جميع الفواتير</h2></div>`;
    if (invoices.length === 0) {
      html += '<div class="card">لا توجد فواتير</div>';
    } else {
      html += invoices.map(inv => `
        <div class="card">
          <strong>${inv.type === 'sale' ? 'بيع' : 'شراء'} ${inv.reference || ''}</strong> – ${inv.date}<br>
          ${inv.customer?.name ? 'العميل: ' + inv.customer.name : ''} ${inv.supplier?.name ? 'المورد: ' + inv.supplier.name : ''}<br>
          الإجمالي: ${inv.total}
          <div style="font-size:0.8em;">${inv.invoice_lines?.map(l => `${l.item?.name || '-'} x${l.quantity} @${l.unit_price}`).join('<br>')}</div>
          <div class="card-actions">
            <button class="btn-secondary edit-invoice-btn" data-invoice-id="${inv.id}">✏️ تعديل</button>
            <button class="btn-primary print-invoice-btn" data-invoice-id="${inv.id}">🖨️ طباعة / PDF</button>
            <button class="btn-danger delete-invoice-btn" data-invoice-id="${inv.id}">🗑️ حذف</button>
          </div>
        </div>
      `).join('');
    }
    document.getElementById('tab-content').innerHTML = html;
    // ربط أزرار التعديل
    document.querySelectorAll('.edit-invoice-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.invoiceId);
        const invoice = invoicesCache.find(inv => inv.id === id);
        if (invoice) showEditInvoiceModal(invoice);
      });
    });
    // ربط أزرار الطباعة
    document.querySelectorAll('.print-invoice-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.invoiceId);
        const invoice = invoicesCache.find(inv => inv.id === id);
        if (invoice) printInvoice(invoice);
      });
    });
    // ربط أزرار الحذف
    document.querySelectorAll('.delete-invoice-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.invoiceId);
        deleteInvoice(id);
      });
    });
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`;
  }
}
// دالة attachInvoiceEvents كاملة
function attachInvoiceEvents() {
  const typeSelect = document.getElementById('inv-type');
  const customerBlock = document.getElementById('inv-customer-block');
  const supplierBlock = document.getElementById('inv-supplier-block');
  if (typeSelect) {
    if (customerBlock && supplierBlock) {
      typeSelect.addEventListener('change', () => {
        if (typeSelect.value === 'sale') {
          customerBlock.style.display = 'block';
          supplierBlock.style.display = 'none';
        } else {
          customerBlock.style.display = 'none';
          supplierBlock.style.display = 'block';
        }
      });
    }
  }

  document.getElementById('btn-add-inv-line')?.addEventListener('click', () => {
    const container = document.getElementById('inv-lines-container');
    const newLine = document.createElement('div');
    newLine.className = 'line-row';
    newLine.innerHTML = `
      <select class="input-field item-select">
        <option value="">اختر مادة</option>
        ${itemsCache.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}
      </select>
      <input type="number" step="any" placeholder="الكمية" class="input-field qty-input" />
      <input type="number" step="0.01" placeholder="السعر" class="input-field price-input" />
      <input type="number" step="0.01" placeholder="الإجمالي" class="input-field total-input" readonly />
      <button class="btn-remove-line btn-secondary">✕</button>
    `;
    container.appendChild(newLine);
    updateInvoiceRemoveButtons();
    attachLineEvents(newLine);
  });

  document.getElementById('inv-lines-container')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-remove-line')) {
      const row = e.target.closest('.line-row');
      if (document.querySelectorAll('#inv-lines-container .line-row').length > 1) {
        row.remove();
        updateInvoiceRemoveButtons();
      }
    }
  });

  function attachLineEvents(row) {
    const qty = row.querySelector('.qty-input');
    const price = row.querySelector('.price-input');
    const total = row.querySelector('.total-input');
    const calculate = () => {
      const q = parseFloat(qty.value) || 0;
      const p = parseFloat(price.value) || 0;
      total.value = (q * p).toFixed(2);
    };
    qty?.addEventListener('input', calculate);
    price?.addEventListener('input', calculate);
  }

  document.querySelectorAll('#inv-lines-container .line-row').forEach(row => attachLineEvents(row));

  document.getElementById('btn-save-invoice')?.addEventListener('click', async () => {
    const type = document.getElementById('inv-type').value;
    const customerId = document.getElementById('inv-customer')?.value || null;
    const supplierId = document.getElementById('inv-supplier')?.value || null;
    const date = document.getElementById('inv-date').value;
    const reference = document.getElementById('inv-ref').value.trim();
    const notes = document.getElementById('inv-notes').value.trim();
    const paidAmount = parseFloat(document.getElementById('inv-paid')?.value) || 0;

    const lines = [];
    document.querySelectorAll('#inv-lines-container .line-row').forEach(row => {
      const itemId = row.querySelector('.item-select').value || null;
      const quantity = parseFloat(row.querySelector('.qty-input').value) || 0;
      const unitPrice = parseFloat(row.querySelector('.price-input').value) || 0;
      const total = parseFloat(row.querySelector('.total-input').value) || 0;
      if (itemId || quantity > 0) {
        lines.push({
          item_id: itemId,
          description: itemId ? '' : 'بند',
          quantity,
          unit_price: unitPrice,
          total
        });
      }
    });

    if (lines.length === 0) return alert('أضف بنداً واحداً على الأقل');
    if ((type === 'sale' && !customerId) || (type === 'purchase' && !supplierId))
      return alert('يجب اختيار العميل (للبيع) أو المورد (للشراء)');

    try {
      await apiCall('/invoices', 'POST', {
        type,
        customer_id: customerId,
        supplier_id: supplierId,
        date,
        reference,
        notes,
        lines,
        paid_amount: paidAmount
      });
      alert('تم حفظ الفاتورة بنجاح');
      loadInvoices();
    } catch (err) {
      alert('خطأ: ' + err.message);
    }
  });

  updateInvoiceRemoveButtons();
}
// نموذج تعديل فاتورة (Modal)
function showEditInvoiceModal(invoice) {
  const type = invoice.type;
  const itemsOpt = itemsCache.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
  const customersOpt = customersCache.map(c => `<option value="${c.id}" ${c.id === invoice.customer_id ? 'selected' : ''}>${c.name}</option>`).join('');
  const suppliersOpt = suppliersCache.map(s => `<option value="${s.id}" ${s.id === invoice.supplier_id ? 'selected' : ''}>${s.name}</option>`).join('');

  let linesHtml = '';
  invoice.invoice_lines.forEach(line => {
    linesHtml += `
      <div class="line-row">
        <select class="input-field item-select">
          <option value="">اختر مادة</option>
          ${itemsCache.map(i => `<option value="${i.id}" ${i.id === line.item_id ? 'selected' : ''}>${i.name}</option>`).join('')}
        </select>
        <input type="number" step="any" class="input-field qty-input" value="${line.quantity}" />
        <input type="number" step="0.01" class="input-field price-input" value="${line.unit_price}" />
        <input type="number" step="0.01" class="input-field total-input" value="${line.total}" readonly />
        <button class="btn-remove-line btn-secondary">✕</button>
      </div>`;
  });

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:600px; max-height:90vh; overflow-y:auto;">
      <h3>تعديل الفاتورة</h3>
      <input type="hidden" id="edit-inv-id" value="${invoice.id}" />
      <select id="edit-inv-type" class="input-field">
        <option value="sale" ${type === 'sale' ? 'selected' : ''}>بيع</option>
        <option value="purchase" ${type === 'purchase' ? 'selected' : ''}>شراء</option>
      </select>
      <div id="edit-customer-block" style="display:${type==='sale'?'block':'none'}">
        <select id="edit-inv-customer" class="input-field">
          <option value="">اختر عميل</option>
          ${customersOpt}
        </select>
      </div>
      <div id="edit-supplier-block" style="display:${type==='purchase'?'block':'none'}">
        <select id="edit-inv-supplier" class="input-field">
          <option value="">اختر مورد</option>
          ${suppliersOpt}
        </select>
      </div>
      <input id="edit-inv-date" type="date" class="input-field" value="${invoice.date}" />
      <input id="edit-inv-ref" class="input-field" value="${invoice.reference || ''}" />
      <textarea id="edit-inv-notes" class="input-field">${invoice.notes || ''}</textarea>
      <h4>البنود</h4>
      <div id="edit-inv-lines">${linesHtml}</div>
      <button id="btn-add-edit-line" class="btn-secondary">+ بند</button>
      <div class="modal-actions">
        <button class="btn-primary" id="save-invoice-edit">حفظ التعديلات</button>
        <button class="btn-secondary" id="cancel-invoice-edit">إلغاء</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // أحداث التبديل بين عميل ومورد
  document.getElementById('edit-inv-type').addEventListener('change', function() {
    document.getElementById('edit-customer-block').style.display = this.value === 'sale' ? 'block' : 'none';
    document.getElementById('edit-supplier-block').style.display = this.value === 'purchase' ? 'block' : 'none';
  });

  // إضافة بند جديد
  document.getElementById('btn-add-edit-line').addEventListener('click', () => {
    const newLine = document.createElement('div');
    newLine.className = 'line-row';
    newLine.innerHTML = `
      <select class="input-field item-select">
        <option value="">اختر مادة</option>
        ${itemsOpt}
      </select>
      <input type="number" step="any" class="input-field qty-input" placeholder="الكمية" />
      <input type="number" step="0.01" class="input-field price-input" placeholder="السعر" />
      <input type="number" step="0.01" class="input-field total-input" placeholder="الإجمالي" readonly />
      <button class="btn-remove-line btn-secondary">✕</button>
    `;
    document.getElementById('edit-inv-lines').appendChild(newLine);
    attachLineEvents(newLine);
  });

  // حذف بند
  document.getElementById('edit-inv-lines').addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-remove-line')) {
      const row = e.target.closest('.line-row');
      if (document.querySelectorAll('#edit-inv-lines .line-row').length > 1) {
        row.remove();
      }
    }
  });

  // حساب الإجمالي لكل بند
  document.querySelectorAll('#edit-inv-lines .line-row').forEach(row => attachLineEvents(row));

  function attachLineEvents(row) {
    const qty = row.querySelector('.qty-input');
    const price = row.querySelector('.price-input');
    const total = row.querySelector('.total-input');
    const calc = () => { total.value = ((parseFloat(qty.value)||0) * (parseFloat(price.value)||0)).toFixed(2); };
    qty?.addEventListener('input', calc);
    price?.addEventListener('input', calc);
  }

  // حفظ التعديلات
  document.getElementById('save-invoice-edit').onclick = async () => {
    const id = parseInt(document.getElementById('edit-inv-id').value);
    const type = document.getElementById('edit-inv-type').value;
    const customerId = document.getElementById('edit-inv-customer')?.value || null;
    const supplierId = document.getElementById('edit-inv-supplier')?.value || null;
    const date = document.getElementById('edit-inv-date').value;
    const reference = document.getElementById('edit-inv-ref').value.trim();
    const notes = document.getElementById('edit-inv-notes').value.trim();

    const lines = [];
    document.querySelectorAll('#edit-inv-lines .line-row').forEach(row => {
      const itemId = row.querySelector('.item-select').value || null;
      const quantity = parseFloat(row.querySelector('.qty-input').value) || 0;
      const unitPrice = parseFloat(row.querySelector('.price-input').value) || 0;
      const total = parseFloat(row.querySelector('.total-input').value) || 0;
      if (itemId || quantity > 0) {
        lines.push({ item_id: itemId, description: '', quantity, unit_price: unitPrice, total });
      }
    });
    if (lines.length === 0) return alert('أضف بنداً على الأقل');
    if ((type === 'sale' && !customerId) || (type === 'purchase' && !supplierId)) {
      return alert('يجب اختيار العميل أو المورد');
    }
    try {
      await apiCall('/invoices', 'PUT', { id, type, customer_id: customerId, supplier_id: supplierId, date, reference, notes, lines });
      document.body.removeChild(overlay);
      alert('تم تعديل الفاتورة بنجاح');
      loadInvoices();
    } catch (e) { alert('خطأ: ' + e.message); }
  };

  document.getElementById('cancel-invoice-edit').onclick = () => document.body.removeChild(overlay);
}
// دالة الطباعة
function printInvoice(invoice) {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) { alert('الرجاء السماح بفتح النوافذ المنبثقة'); return; }
  const content = `
    <html dir="rtl">
    <head><title>فاتورة ${invoice.reference || ''}</title>
    <style>
      body { font-family: 'Tajawal', sans-serif; padding: 20px; color: #000; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
      th { background: #f0f0f0; }
      .print-btn { background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 20px; }
      @media print { .print-btn { display: none; } }
    </style></head>
    <body>
      <h2>فاتورة ${invoice.type === 'sale' ? 'بيع' : 'شراء'}</h2>
      <p>التاريخ: ${invoice.date} | المرجع: ${invoice.reference || '-'}</p>
      <p>${invoice.customer ? 'العميل: ' + invoice.customer.name : ''} ${invoice.supplier ? 'المورد: ' + invoice.supplier.name : ''}</p>
      <table><tr><th>المادة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
      ${invoice.invoice_lines?.map(l => `<tr><td>${l.item?.name || '-'}</td><td>${l.quantity}</td><td>${l.unit_price}</td><td>${l.total}</td></tr>`).join('')}
      </table>
      <h3>الإجمالي: ${invoice.total}</h3>
      <p>${invoice.notes || ''}</p>
      <button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
    </body></html>
  `;
  printWindow.document.write(content);
  printWindow.document.close();
}

// ==================== مربع حوار تأكيدي ====================
function confirmDialog(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box">
        <p>${message}</p>
        <div class="modal-actions">
          <button class="btn-danger" id="modal-confirm">نعم، احذف</button>
          <button class="btn-secondary" id="modal-cancel">إلغاء</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('modal-confirm').onclick = () => { document.body.removeChild(overlay); resolve(true); };
    document.getElementById('modal-cancel').onclick = () => { document.body.removeChild(overlay); resolve(false); };
  });
}
// ==================== دوال الحذف العامة ====================
async function deleteItem(itemId) {
  if (!await confirmDialog('هل أنت متأكد من حذف هذه المادة؟')) return;
  try {
    await apiCall(`/items?id=${itemId}`, 'DELETE');
    alert('تم الحذف بنجاح');
    loadItems();
  } catch (e) { alert('خطأ: ' + e.message); }
}

async function deleteCustomer(custId) {
  if (!await confirmDialog('هل أنت متأكد من حذف هذا العميل؟')) return;
  try {
    await apiCall(`/customers?id=${custId}`, 'DELETE');
    alert('تم الحذف بنجاح');
    loadCustomers();
  } catch (e) { alert('خطأ: ' + e.message); }
}

async function deleteSupplier(supId) {
  if (!await confirmDialog('هل أنت متأكد من حذف هذا المورد؟')) return;
  try {
    await apiCall(`/suppliers?id=${supId}`, 'DELETE');
    alert('تم الحذف بنجاح');
    loadSuppliers();
  } catch (e) { alert('خطأ: ' + e.message); }
}

// حذف فاتورة
async function deleteInvoice(invId) {
  if (!await confirmDialog('هل أنت متأكد من حذف هذه الفاتورة؟')) return;
  try {
    await apiCall(`/invoices?id=${invId}`, 'DELETE');
    alert('تم حذف الفاتورة بنجاح');
    loadInvoices();
  } catch (e) { alert('خطأ: ' + e.message); }
}
// ==================== الدفعات ====================
async function loadPayments() {
  try {
    const [payments, invoices, customers, suppliers] = await Promise.all([
      apiCall('/payments', 'GET'),
      apiCall('/invoices', 'GET'),
      apiCall('/customers', 'GET'),
      apiCall('/suppliers', 'GET')
    ]);
    let html = `
      <div class="card">
        <h2>الدفعات</h2>
        <button id="btn-add-payment" class="btn-primary">+ إضافة دفعة</button>
      </div>
      <div id="payment-form" class="card" style="display:none;">
        <h3>إضافة دفعة جديدة</h3>
        <select id="payment-type" class="input-field">
          <option value="customer">من عميل</option>
          <option value="supplier">إلى مورد</option>
        </select>
        <div id="payment-customer-block">
          <select id="payment-customer" class="input-field">
            <option value="">اختر عميل</option>
            ${customers.map(c => `<option value="${c.id}">${c.name} (الرصيد: ${c.balance})</option>`).join('')}
          </select>
        </div>
        <div id="payment-supplier-block" style="display:none;">
          <select id="payment-supplier" class="input-field">
            <option value="">اختر مورد</option>
            ${suppliers.map(s => `<option value="${s.id}">${s.name} (الرصيد: ${s.balance})</option>`).join('')}
          </select>
        </div>
        <select id="payment-invoice" class="input-field">
          <option value="">بدون فاتورة</option>
        </select>
        <input id="payment-amount" type="number" step="0.01" placeholder="المبلغ" class="input-field" />
        <input id="payment-date" type="date" class="input-field" value="${new Date().toISOString().split('T')[0]}" />
        <textarea id="payment-notes" placeholder="ملاحظات" class="input-field"></textarea>
        <button id="btn-save-payment" class="btn-primary">حفظ الدفعة</button>
        <button id="btn-cancel-payment" class="btn-secondary">إلغاء</button>
      </div>
    `;
    if (payments.length === 0) {
      html += '<div class="card">لا توجد دفعات</div>';
    } else {
      html += payments.map(p => `
        <div class="card">
          <strong>${p.amount}</strong> – ${p.payment_date}<br>
          ${p.customer ? 'العميل: ' + p.customer.name : ''} ${p.supplier ? 'المورد: ' + p.supplier.name : ''}
          ${p.invoice ? ' | فاتورة: ' + (p.invoice.type === 'sale' ? 'بيع ' : 'شراء ') + (p.invoice.reference || '') : ''}
          ${p.notes ? '<br>' + p.notes : ''}
          <div class="card-actions">
            <button class="btn-danger" onclick="deletePayment(${p.id})">🗑️ حذف</button>
          </div>
        </div>
      `).join('');
    }
    document.getElementById('tab-content').innerHTML = html;
    attachPaymentEvents(customers, suppliers, invoices);
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`;
  }
}

function attachPaymentEvents(customers, suppliers, invoices) {
  const typeSelect = document.getElementById('payment-type');
  const customerBlock = document.getElementById('payment-customer-block');
  const supplierBlock = document.getElementById('payment-supplier-block');
  const invoiceSelect = document.getElementById('payment-invoice');
  const customerSelect = document.getElementById('payment-customer');
  const supplierSelect = document.getElementById('payment-supplier');

  typeSelect?.addEventListener('change', () => {
    if (typeSelect.value === 'customer') {
      customerBlock.style.display = 'block';
      supplierBlock.style.display = 'none';
      updateInvoiceList(invoices, 'customer', customerSelect.value);
    } else {
      customerBlock.style.display = 'none';
      supplierBlock.style.display = 'block';
      updateInvoiceList(invoices, 'supplier', supplierSelect.value);
    }
  });

  customerSelect?.addEventListener('change', () => {
    updateInvoiceList(invoices, 'customer', customerSelect.value);
  });
  supplierSelect?.addEventListener('change', () => {
    updateInvoiceList(invoices, 'supplier', supplierSelect.value);
  });

  function updateInvoiceList(invoices, type, entityId) {
    const filtered = invoices.filter(inv => {
      if (type === 'customer') return inv.type === 'sale' && inv.customer_id == entityId;
      else return inv.type === 'purchase' && inv.supplier_id == entityId;
    });
    invoiceSelect.innerHTML = '<option value="">بدون فاتورة</option>' +
      filtered.map(inv => `<option value="${inv.id}">${inv.type === 'sale' ? 'بيع' : 'شراء'} ${inv.reference || ''} (${inv.total})</option>`).join('');
  }

  document.getElementById('btn-add-payment')?.addEventListener('click', () => {
    document.getElementById('payment-form').style.display = 'block';
  });
  document.getElementById('btn-cancel-payment')?.addEventListener('click', () => {
    document.getElementById('payment-form').style.display = 'none';
  });

  document.getElementById('btn-save-payment')?.addEventListener('click', async () => {
    const type = document.getElementById('payment-type').value;
    const customerId = type === 'customer' ? (document.getElementById('payment-customer').value || null) : null;
    const supplierId = type === 'supplier' ? (document.getElementById('payment-supplier').value || null) : null;
    const invoiceId = document.getElementById('payment-invoice').value || null;
    const amount = parseFloat(document.getElementById('payment-amount').value);
    const date = document.getElementById('payment-date').value;
    const notes = document.getElementById('payment-notes').value.trim();

    if (!amount || amount <= 0) return alert('المبلغ مطلوب');
    if (!customerId && !supplierId) return alert('اختر عميلاً أو مورداً');

    try {
      await apiCall('/payments', 'POST', {
        invoice_id: invoiceId,
        customer_id: customerId,
        supplier_id: supplierId,
        amount,
        payment_date: date,
        notes
      });
      alert('تم حفظ الدفعة بنجاح');
      loadPayments();
    } catch (e) { alert('خطأ: ' + e.message); }
  });
}

async function deletePayment(paymentId) {
  if (!await confirmDialog('هل أنت متأكد من حذف هذه الدفعة؟ سيتم عكس تأثيرها على الأرصدة.')) return;
  try {
    await apiCall(`/payments?id=${paymentId}`, 'DELETE');
    alert('تم حذف الدفعة بنجاح');
    loadPayments();
  } catch (e) { alert('خطأ: ' + e.message); }
}
// ==================== التقارير ====================
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

// ميزان المراجعة
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

// قائمة الدخل
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

// الميزانية العمومية
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
// نموذج الأستاذ العام
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
        <div id="ledger-result" style="margin-top:15px;"></div>
      </div>
    `;
    document.getElementById('btn-ledger').addEventListener('click', async () => {
      const accountId = document.getElementById('ledger-account').value;
      if (!accountId) return;
      try {
        const lines = await apiCall(`/reports?type=account_ledger&account_id=${accountId}`, 'GET');
        let html = '<table class="report-table"><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr>';
        lines.forEach(l => {
          html += `<tr>
            <td>${l.date || ''}</td>
            <td>${l.description || ''}</td>
            <td>${(l.debit || 0).toFixed(2)}</td>
            <td>${(l.credit || 0).toFixed(2)}</td>
            <td style="font-weight:bold; color:${l.balance >= 0 ? 'green' : 'red'}">${(l.balance || 0).toFixed(2)}</td>
          </tr>`;
        });
        html += '</table>';
        document.getElementById('ledger-result').innerHTML = html;
      } catch (e) { document.getElementById('ledger-result').innerHTML = `<div style="color:red;">⚠️ ${e.message}</div>`; }
    });
  } catch (e) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${e.message}</div>`; }
}

// كشف حساب عميل
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
      const id = document.getElementById('statement-customer').value;
      if (!id) return;
      try {
        const lines = await apiCall(`/reports?type=customer_statement&customer_id=${id}`, 'GET');
        let html = '<table class="report-table"><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr>';
        lines.forEach(l => {
          html += `<tr><td>${l.date || ''}</td><td>${l.description || ''}</td><td>${(l.debit || 0).toFixed(2)}</td><td>${(l.credit || 0).toFixed(2)}</td><td style="font-weight:bold; color:${l.balance >= 0 ? 'green' : 'red'}">${(l.balance || 0).toFixed(2)}</td></tr>`;
        });
        html += '</table>';
        document.getElementById('statement-result').innerHTML = html;
      } catch (e) { document.getElementById('statement-result').innerHTML = `<div style="color:red;">⚠️ ${e.message}</div>`; }
    });
  } catch (e) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${e.message}</div>`; }
}

// كشف حساب مورد
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
      const id = document.getElementById('statement-supplier').value;
      if (!id) return;
      try {
        const lines = await apiCall(`/reports?type=supplier_statement&supplier_id=${id}`, 'GET');
        let html = '<table class="report-table"><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr>';
        lines.forEach(l => {
          html += `<tr><td>${l.date || ''}</td><td>${l.description || ''}</td><td>${(l.debit || 0).toFixed(2)}</td><td>${(l.credit || 0).toFixed(2)}</td><td style="font-weight:bold; color:${l.balance >= 0 ? 'green' : 'red'}">${(l.balance || 0).toFixed(2)}</td></tr>`;
        });
        html += '</table>';
        document.getElementById('statement-result').innerHTML = html;
      } catch (e) { document.getElementById('statement-result').innerHTML = `<div style="color:red;">⚠️ ${e.message}</div>`; }
    });
  } catch (e) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${e.message}</div>`; }
}

// ==================== التصنيفات ====================
async function loadCategories() {
  try {
    const categories = await apiCall('/categories', 'GET');
    let html = `
      <div class="card"><h2>التصنيفات</h2><button id="btn-add-category-tab" class="btn-primary">+ إضافة تصنيف</button></div>
      <div id="category-form" class="card" style="display:none;">
        <h3>إضافة تصنيف جديد</h3>
        <input id="category-name" placeholder="اسم التصنيف" class="input-field" />
        <button id="btn-save-category" class="btn-primary">حفظ</button>
        <button id="btn-cancel-category" class="btn-secondary">إلغاء</button>
      </div>
    `;
    if (categories.length === 0) {
      html += '<div class="card">لا توجد تصنيفات</div>';
    } else {
      html += categories.map(cat => `
        <div class="card">
          <strong>${cat.name}</strong>
          <div class="card-actions">
            <button class="btn-secondary" onclick="showEditCategoryModal(${cat.id})">✏️ تعديل</button>
            <button class="btn-danger" onclick="deleteCategory(${cat.id})">🗑️ حذف</button>
          </div>
        </div>
      `).join('');
    }
    document.getElementById('tab-content').innerHTML = html;
    attachCategoryEvents();
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`;
  }
}

function attachCategoryEvents() {
  document.getElementById('btn-add-category-tab')?.addEventListener('click', () => {
    document.getElementById('category-form').style.display = 'block';
  });
  document.getElementById('btn-cancel-category')?.addEventListener('click', () => {
    document.getElementById('category-form').style.display = 'none';
  });
  document.getElementById('btn-save-category')?.addEventListener('click', async () => {
    const name = document.getElementById('category-name').value.trim();
    if (!name) return alert('اسم التصنيف مطلوب');
    try {
      await apiCall('/categories', 'POST', { name });
      document.getElementById('category-form').style.display = 'none';
      loadCategories();
    } catch (err) { alert('خطأ: ' + err.message); }
  });
}

function showEditCategoryModal(catId) {
  apiCall('/categories', 'GET').then(categories => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box">
        <h3>تعديل التصنيف</h3>
        <input id="edit-cat-name" class="input-field" value="${cat.name}" />
        <div class="modal-actions">
          <button class="btn-primary" id="save-cat-edit">حفظ</button>
          <button class="btn-secondary" id="cancel-cat-edit">إلغاء</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('save-cat-edit').onclick = async () => {
      const name = document.getElementById('edit-cat-name').value.trim();
      if (!name) return alert('الاسم مطلوب');
      try {
        await apiCall('/categories', 'PUT', { id: catId, name });
        document.body.removeChild(overlay);
        loadCategories();
      } catch (e) { alert('خطأ: ' + e.message); }
    };
    document.getElementById('cancel-cat-edit').onclick = () => {
      document.body.removeChild(overlay);
    };
  });
}

async function deleteCategory(catId) {
  if (!await confirmDialog('هل أنت متأكد من حذف هذا التصنيف؟ قد تبقى المواد المرتبطة به بدون تصنيف.')) return;
  try {
    await apiCall(`/categories?id=${catId}`, 'DELETE');
    alert('تم حذف التصنيف بنجاح');
    loadCategories();
  } catch (e) { alert('خطأ: ' + e.message); }
}

// ==================== توجيه التبويبات ====================
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('tab')) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    const tab = e.target.dataset.tab;
    if (tab === 'dashboard') loadDashboard();
    else if (tab === 'items') loadItems();
    else if (tab === 'sale-invoice') loadSaleInvoiceForm();
    else if (tab === 'purchase-invoice') loadPurchaseInvoiceForm();
    else if (tab === 'customers') loadCustomers();
    else if (tab === 'suppliers') loadSuppliers();
    else if (tab === 'categories') loadCategories();
    else if (tab === 'payments') loadPayments();
    else if (tab === 'invoices') loadInvoices();
    else if (tab === 'reports') loadReports();
  }
});
// ==================== بدء التطبيق ====================
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
