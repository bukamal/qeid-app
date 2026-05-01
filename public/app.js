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

// ========== دالة عامة لعرض النوافذ المنبثقة (نموذج موحد) ==========
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
    if (confirmMode) {
      closeModal();
      if (onSuccess) onSuccess(true);
      return;
    }
    const values = {};
    for (const field of fields) {
      const el = document.getElementById(field.id);
      if (el) values[field.id] = el.value.trim();
    }
    try {
      const result = await onSave(values);
      if (result && result.error) {
        alert('خطأ: ' + result.error.message);
      } else {
        closeModal();
        if (onSuccess) onSuccess();
      }
    } catch (e) {
      alert('خطأ: ' + e.message);
    }
  };
}

// دالة تأكيد عامة (تستخدم showFormModal في وضع confirm)
function confirmDialog(msg) {
  return new Promise(resolve => {
    showFormModal({
      title: msg,
      fields: [],
      confirmMode: true,
      onSuccess: (confirmed) => resolve(confirmed)
    });
  });
}
// ========== العملاء ==========
function showAddCustomerModal() {
  showFormModal({
    title: 'إضافة عميل جديد',
    fields: [
      { id: 'name', label: 'الاسم', placeholder: 'اسم العميل' },
      { id: 'phone', label: 'الهاتف', placeholder: 'رقم الهاتف' },
      { id: 'address', label: 'العنوان', placeholder: 'العنوان' }
    ],
    onSave: (values) => apiCall('/customers', 'POST', values),
    onSuccess: () => loadCustomers()
  });
}

function showEditCustomerModal(custId) {
  const c = customersCache.find(x => x.id === custId);
  if (!c) return;
  showFormModal({
    title: 'تعديل العميل',
    fields: [
      { id: 'name', label: 'الاسم' },
      { id: 'phone', label: 'الهاتف' },
      { id: 'address', label: 'العنوان' }
    ],
    initialValues: { name: c.name, phone: c.phone || '', address: c.address || '' },
    onSave: (values) => apiCall('/customers', 'PUT', { id: custId, ...values }),
    onSuccess: () => loadCustomers()
  });
}

async function loadCustomers() {
  try {
    let html = `<div class="card"><h2>العملاء</h2><button id="btn-add-customer" class="btn-primary">+ إضافة عميل</button></div>`;
    if (!customersCache.length) html += '<div class="card">لا يوجد عملاء</div>';
    else html += customersCache.map(c => `<div class="card"><strong>${c.name}</strong> <span style="float:left;font-weight:bold;color:${c.balance >= 0 ? 'green' : 'red'}">الرصيد: ${c.balance}</span><br>📞 ${c.phone || '-'} | 🏠 ${c.address || '-'}<div class="card-actions"><button class="btn-secondary" onclick="showEditCustomerModal(${c.id})">✏️ تعديل</button><button class="btn-danger" onclick="deleteCustomer(${c.id})">🗑️ حذف</button></div></div>`).join('');
    document.getElementById('tab-content').innerHTML = html;
    document.getElementById('btn-add-customer').addEventListener('click', showAddCustomerModal);
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`;
  }
}

async function deleteCustomer(id) {
  if (!await confirmDialog('متأكد من حذف العميل؟')) return;
  try {
    await apiCall(`/customers?id=${id}`, 'DELETE');
    alert('تم الحذف');
    loadCustomers();
  } catch (e) { alert('خطأ: ' + e.message); }
}

// ========== الموردين ==========
function showAddSupplierModal() {
  showFormModal({
    title: 'إضافة مورد جديد',
    fields: [
      { id: 'name', label: 'الاسم', placeholder: 'اسم المورد' },
      { id: 'phone', label: 'الهاتف', placeholder: 'رقم الهاتف' },
      { id: 'address', label: 'العنوان', placeholder: 'العنوان' }
    ],
    onSave: (values) => apiCall('/suppliers', 'POST', values),
    onSuccess: () => loadSuppliers()
  });
}

function showEditSupplierModal(supId) {
  const s = suppliersCache.find(x => x.id === supId);
  if (!s) return;
  showFormModal({
    title: 'تعديل المورد',
    fields: [
      { id: 'name', label: 'الاسم' },
      { id: 'phone', label: 'الهاتف' },
      { id: 'address', label: 'العنوان' }
    ],
    initialValues: { name: s.name, phone: s.phone || '', address: s.address || '' },
    onSave: (values) => apiCall('/suppliers', 'PUT', { id: supId, ...values }),
    onSuccess: () => loadSuppliers()
  });
}

async function loadSuppliers() {
  try {
    let html = `<div class="card"><h2>الموردين</h2><button id="btn-add-supplier" class="btn-primary">+ إضافة مورد</button></div>`;
    if (!suppliersCache.length) html += '<div class="card">لا يوجد موردين</div>';
    else html += suppliersCache.map(s => `<div class="card"><strong>${s.name}</strong> <span style="float:left;font-weight:bold;color:${s.balance <= 0 ? 'green' : 'red'}">الرصيد: ${s.balance}</span><br>📞 ${s.phone || '-'} | 🏠 ${s.address || '-'}<div class="card-actions"><button class="btn-secondary" onclick="showEditSupplierModal(${s.id})">✏️ تعديل</button><button class="btn-danger" onclick="deleteSupplier(${s.id})">🗑️ حذف</button></div></div>`).join('');
    document.getElementById('tab-content').innerHTML = html;
    document.getElementById('btn-add-supplier').addEventListener('click', showAddSupplierModal);
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`;
  }
}

async function deleteSupplier(id) {
  if (!await confirmDialog('متأكد من حذف المورد؟')) return;
  try {
    await apiCall(`/suppliers?id=${id}`, 'DELETE');
    alert('تم الحذف');
    loadSuppliers();
  } catch (e) { alert('خطأ: ' + e.message); }
}

// ========== المواد (مع دعم الحقول الإضافية) ==========
function showAddItemModal() {
  const catOpts = categoriesCache.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  showFormModal({
    title: 'إضافة مادة جديدة',
    fields: [
      { id: 'name', label: 'اسم المادة' },
      { id: 'category_id', label: 'التصنيف', type: 'select', options: `<option value="">بدون تصنيف</option>${catOpts}` },
      { id: 'item_type', label: 'نوع المادة', type: 'select', options: `<option value="مخزون">مخزون</option><option value="منتج نهائي">منتج نهائي</option><option value="خدمة">خدمة</option>` },
      { id: 'unit', label: 'وحدة القياس', placeholder: 'مثال: قطعة، صندوق' },
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
        return { error: { message: 'توجد مادة بنفس الاسم' } };
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
      { id: 'item_type', label: 'نوع المادة', type: 'select', options: `<option value="مخزون">مخزون</option><option value="منتج نهائي">منتج نهائي</option><option value="خدمة">خدمة</option>` },
      { id: 'unit', label: 'وحدة القياس' },
      { id: 'purchase_price', label: 'سعر الشراء', type: 'number' },
      { id: 'selling_price', label: 'سعر البيع', type: 'number' }
    ],
    initialValues: {
      name: it.name,
      category_id: it.category_id || '',
      item_type: it.item_type || 'مخزون',
      unit: it.unit || '',
      purchase_price: it.purchase_price,
      selling_price: it.selling_price
    },
    onSave: (values) => apiCall('/items', 'PUT', {
      id: itemId,
      ...values,
      category_id: values.category_id || null,
      purchase_price: parseFloat(values.purchase_price) || 0,
      selling_price: parseFloat(values.selling_price) || 0
    }),
    onSuccess: () => loadItems()
  });
}

async function deleteItem(id) {
  if (!await confirmDialog('متأكد من حذف المادة؟')) return;
  try {
    await apiCall(`/items?id=${id}`, 'DELETE');
    alert('تم الحذف');
    loadItems();
  } catch (e) { alert('خطأ: ' + e.message); }
}
// ========== التصنيفات ==========
function showAddCategoryModal() {
  showFormModal({
    title: 'إضافة تصنيف جديد',
    fields: [{ id: 'name', label: 'اسم التصنيف', placeholder: 'اسم التصنيف' }],
    onSave: (values) => apiCall('/definitions', 'POST', { type: 'category', ...values }),
    onSuccess: () => loadCategories()
  });
}

function showEditCategoryModal(id) {
  const c = categoriesCache.find(x => x.id === id);
  if (!c) return;
  showFormModal({
    title: 'تعديل التصنيف',
    fields: [{ id: 'name', label: 'اسم التصنيف' }],
    initialValues: { name: c.name },
    onSave: (values) => apiCall('/definitions', 'PUT', { type: 'category', id, ...values }),
    onSuccess: () => loadCategories()
  });
}

async function loadCategories() {
  try {
    let html = `<div class="card"><h2>التصنيفات</h2><button id="btn-add-cat" class="btn-primary">+ إضافة تصنيف</button></div>`;
    if (!categoriesCache.length) html += '<div class="card">لا توجد تصنيفات</div>';
    else html += categoriesCache.map(c => `<div class="card"><strong>${c.name}</strong><div class="card-actions"><button class="btn-secondary" onclick="showEditCategoryModal(${c.id})">✏️ تعديل</button><button class="btn-danger" onclick="deleteCategory(${c.id})">🗑️ حذف</button></div></div>`).join('');
    document.getElementById('tab-content').innerHTML = html;
    document.getElementById('btn-add-cat').addEventListener('click', showAddCategoryModal);
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`;
  }
}

async function deleteCategory(id) {
  if (!await confirmDialog('متأكد من حذف التصنيف؟')) return;
  try {
    await apiCall(`/definitions?type=category&id=${id}`, 'DELETE');
    alert('تم الحذف');
    loadCategories();
  } catch (e) { alert('خطأ: ' + e.message); }
}

// ========== وحدات القياس ==========
function showAddUnitModal() {
  showFormModal({
    title: 'إضافة وحدة جديدة',
    fields: [
      { id: 'name', label: 'الاسم', placeholder: 'اسم الوحدة' },
      { id: 'abbreviation', label: 'الاختصار (اختياري)', placeholder: 'مثلاً: كغ' }
    ],
    onSave: (values) => apiCall('/definitions', 'POST', { type: 'unit', ...values }),
    onSuccess: () => loadUnits()
  });
}

function showEditUnitModal(id) {
  const u = unitsCache.find(x => x.id === id);
  if (!u) return;
  showFormModal({
    title: 'تعديل الوحدة',
    fields: [
      { id: 'name', label: 'الاسم' },
      { id: 'abbreviation', label: 'الاختصار' }
    ],
    initialValues: { name: u.name, abbreviation: u.abbreviation || '' },
    onSave: (values) => apiCall('/definitions', 'PUT', { type: 'unit', id, ...values }),
    onSuccess: () => loadUnits()
  });
}

async function loadUnits() {
  try {
    let html = `<div class="card"><h2>وحدات القياس</h2><button id="btn-add-unit" class="btn-primary">+ إضافة وحدة</button></div>`;
    if (!unitsCache.length) html += '<div class="card">لا توجد وحدات</div>';
    else html += unitsCache.map(u => `<div class="card"><strong>${u.name}</strong> ${u.abbreviation ? '(' + u.abbreviation + ')' : ''}<div class="card-actions"><button class="btn-secondary" onclick="showEditUnitModal(${u.id})">✏️ تعديل</button><button class="btn-danger" onclick="deleteUnit(${u.id})">🗑️ حذف</button></div></div>`).join('');
    document.getElementById('tab-content').innerHTML = html;
    document.getElementById('btn-add-unit')?.addEventListener('click', showAddUnitModal);
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`;
  }
}

async function deleteUnit(id) {
  if (!await confirmDialog('متأكد من حذف الوحدة؟')) return;
  try {
    await apiCall(`/definitions?type=unit&id=${id}`, 'DELETE');
    alert('تم الحذف');
    loadUnits();
  } catch (e) { alert('خطأ: ' + e.message); }
}

// ========== المصاريف ==========
function showAddExpenseModal() {
  showFormModal({
    title: 'إضافة مصروف جديد',
    fields: [
      { id: 'amount', label: 'المبلغ', type: 'number', placeholder: 'المبلغ' },
      { id: 'expense_date', label: 'التاريخ', type: 'date' },
      { id: 'description', label: 'الوصف', placeholder: 'وصف المصروف' }
    ],
    initialValues: { expense_date: new Date().toISOString().split('T')[0] },
    onSave: (values) => apiCall('/expenses', 'POST', { ...values, amount: parseFloat(values.amount) }),
    onSuccess: () => loadExpenses()
  });
}

async function loadExpenses() {
  try {
    const expenses = await apiCall('/expenses', 'GET');
    let html = `<div class="card"><h2>المصاريف العامة</h2><button id="btn-add-expense" class="btn-primary">+ إضافة مصروف</button></div>`;
    if (!expenses.length) html += '<div class="card">لا توجد مصاريف</div>';
    else html += expenses.map(ex => `<div class="card"><strong>${ex.amount}</strong> – ${ex.expense_date}<br>${ex.description || ''}<div class="card-actions"><button class="btn-danger" onclick="deleteExpense(${ex.id})">🗑️ حذف</button></div></div>`).join('');
    document.getElementById('tab-content').innerHTML = html;
    document.getElementById('btn-add-expense').addEventListener('click', showAddExpenseModal);
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`;
  }
}

async function deleteExpense(id) {
  if (!await confirmDialog('متأكد من حذف المصروف؟')) return;
  try {
    await apiCall(`/expenses?id=${id}`, 'DELETE');
    alert('تم الحذف');
    loadExpenses();
  } catch (e) { alert('خطأ: ' + e.message); }
}

// ========== الدفعات (جزء معقد لا يمكن تبسيطه كثيراً، سنتركه كما هو مع تحسين بسيط) ==========
async function loadPayments() {
  try {
    const [payments, invoices, customers, suppliers] = await Promise.all([apiCall('/payments', 'GET'), apiCall('/invoices', 'GET'), apiCall('/customers', 'GET'), apiCall('/suppliers', 'GET')]);
    let html = `<div class="card"><h2>الدفعات</h2><button id="btn-add-pmt" class="btn-primary">+ إضافة دفعة</button></div>`;
    if (!payments.length) html += '<div class="card">لا توجد دفعات</div>';
    else html += payments.map(p => `<div class="card"><strong>${p.amount}</strong> – ${p.payment_date}<br>${p.customer?.name ? 'العميل: ' + p.customer.name : ''}${p.supplier?.name ? 'المورد: ' + p.supplier.name : ''}${p.invoice ? '| فاتورة: ' + (p.invoice.type === 'sale' ? 'بيع ' : 'شراء ') + (p.invoice.reference || '') : ''}${p.notes ? '<br>' + p.notes : ''}<div class="card-actions"><button class="btn-danger" onclick="deletePayment(${p.id})">🗑️ حذف</button></div></div>`).join('');
    document.getElementById('tab-content').innerHTML = html;
    document.getElementById('btn-add-pmt').addEventListener('click', () => showAddPaymentModal(customers, suppliers, invoices));
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`;
  }
}

function showAddPaymentModal(customers, suppliers, invoices) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-box" style="max-width:500px;"><h3>إضافة دفعة جديدة</h3><label class="form-label">النوع</label><select id="pmt-type" class="input-field"><option value="customer">من عميل</option><option value="supplier">إلى مورد</option></select><div id="pmt-cust-block"><label class="form-label">العميل</label><select id="pmt-customer" class="input-field"><option value="">اختر عميل</option>${customers.map(c => `<option value="${c.id}">${c.name} (${c.balance})</option>`).join('')}</select></div><div id="pmt-supp-block" style="display:none;"><label class="form-label">المورد</label><select id="pmt-supplier" class="input-field"><option value="">اختر مورد</option>${suppliers.map(s => `<option value="${s.id}">${s.name} (${s.balance})</option>`).join('')}</select></div><label class="form-label">الفاتورة (اختياري)</label><select id="pmt-invoice" class="input-field"><option value="">بدون فاتورة</option></select><label class="form-label">المبلغ</label><input id="pmt-amount" type="number" step="0.01" placeholder="المبلغ" class="input-field" /><label class="form-label">التاريخ</label><input id="pmt-date" type="date" class="input-field" value="${new Date().toISOString().split('T')[0]}" /><label class="form-label">ملاحظات</label><textarea id="pmt-notes" placeholder="ملاحظات" class="input-field"></textarea><div class="modal-actions"><button class="btn-primary" id="btn-save-pmt">حفظ الدفعة</button><button class="btn-secondary" id="btn-cancel-pmt">إلغاء</button></div></div>`;
  document.body.appendChild(overlay);
  const tSel = document.getElementById('pmt-type'), cBlock = document.getElementById('pmt-cust-block'), sBlock = document.getElementById('pmt-supp-block'), invSel = document.getElementById('pmt-invoice'), cSel = document.getElementById('pmt-customer'), sSel = document.getElementById('pmt-supplier');
  const updateInvList = (type, eId) => { const filt = invoices.filter(inv => type === 'customer' ? inv.type === 'sale' && inv.customer_id == eId : inv.type === 'purchase' && inv.supplier_id == eId); invSel.innerHTML = '<option value="">بدون فاتورة</option>' + filt.map(inv => `<option value="${inv.id}">${inv.type === 'sale' ? 'بيع' : 'شراء'} ${inv.reference || ''} (${inv.total})</option>`).join(''); };
  tSel.addEventListener('change', () => { if (tSel.value === 'customer') { cBlock.style.display = 'block'; sBlock.style.display = 'none'; updateInvList('customer', cSel.value); } else { cBlock.style.display = 'none'; sBlock.style.display = 'block'; updateInvList('supplier', sSel.value); } });
  cSel.addEventListener('change', () => updateInvList('customer', cSel.value));
  sSel.addEventListener('change', () => updateInvList('supplier', sSel.value));
  document.getElementById('btn-save-pmt').onclick = async () => { const type = tSel.value, cust = type === 'customer' ? (cSel.value || null) : null, supp = type === 'supplier' ? (sSel.value || null) : null, invId = invSel.value || null, amount = parseFloat(document.getElementById('pmt-amount').value); if (!amount || amount <= 0) return alert('المبلغ مطلوب'); if (!cust && !supp) return alert('اختر عميلاً أو مورداً'); try { await apiCall('/payments', 'POST', { invoice_id: invId, customer_id: cust, supplier_id: supp, amount, payment_date: document.getElementById('pmt-date').value, notes: document.getElementById('pmt-notes').value.trim() }); document.body.removeChild(overlay); alert('تم حفظ الدفعة'); loadPayments(); } catch (e) { alert('خطأ: ' + e.message); } };
  document.getElementById('btn-cancel-pmt').onclick = () => document.body.removeChild(overlay);
}

async function deletePayment(id) {
  if (!await confirmDialog('متأكد من حذف الدفعة؟')) return;
  try {
    await apiCall(`/payments?id=${id}`, 'DELETE');
    alert('تم الحذف');
    loadPayments();
  } catch (e) { alert('خطأ: ' + e.message); }
}

// ========== التقارير (بدون تغيير) ==========
async function loadReports() {
  let html = `<div class="card"><h2>التقارير</h2></div><div class="card report-link" data-report="trial_balance">📊 ميزان المراجعة</div><div class="card report-link" data-report="income_statement">📈 قائمة الدخل</div><div class="card report-link" data-report="balance_sheet">⚖️ الميزانية العمومية</div><div class="card report-link" data-report="account_ledger">📒 الأستاذ العام</div><div class="card report-link" data-report="customer_statement">👤 كشف حساب عميل</div><div class="card report-link" data-report="supplier_statement">🏭 كشف حساب مورد</div>`;
  document.getElementById('tab-content').innerHTML = html;
  document.querySelectorAll('.report-link').forEach(el => el.addEventListener('click', () => { const r = el.dataset.report; if (r === 'trial_balance') loadTrialBalance(); else if (r === 'income_statement') loadIncomeStatement(); else if (r === 'balance_sheet') loadBalanceSheet(); else if (r === 'account_ledger') loadAccountLedgerForm(); else if (r === 'customer_statement') loadCustomerStatementForm(); else if (r === 'supplier_statement') loadSupplierStatementForm(); }));
}

async function loadTrialBalance() { /* نفس الكود السابق */ }
async function loadIncomeStatement() { /* نفس الكود السابق */ }
async function loadBalanceSheet() { /* نفس الكود السابق */ }
async function loadAccountLedgerForm() { /* نفس الكود السابق */ }
async function loadCustomerStatementForm() { /* نفس الكود السابق */ }
async function loadSupplierStatementForm() { /* نفس الكود السابق */ }

// ========== المساعدة ==========
function showHelpModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-box" style="max-width:600px; text-align:right;"><h3>📚 مركز المساعدة – الراجحي للمحاسبة</h3><p>مرحباً بك في نظام الراجحي للمحاسبة. إليك دليل سريع لاستخدام التطبيق:</p><h4>🧭 التبويبات الرئيسية</h4><ul style="padding-right:16px;"><li><b>لوحة التحكم:</b> ملخص مالي، أرباح، سيولة، ومخططات.</li><li><b>المواد:</b> إضافة وتعديل وحذف المواد مع أسعار البيع والشراء.</li><li><b>فاتورة مبيعات / مشتريات:</b> إنشاء فاتورة بيع أو شراء، اختيار عميل/مورد، وإضافة بنود.</li><li><b>العملاء والموردين:</b> إدارة جهات الاتصال وأرصدتهم.</li><li><b>التصنيفات:</b> تنظيم المواد في فئات.</li><li><b>الدفعات:</b> تسجيل المدفوعات والمقبوضات وربطها بالفواتير.</li><li><b>المصاريف:</b> تسجيل المصاريف العامة للإدارة.</li><li><b>الفواتير:</b> عرض جميع الفواتير مع إمكانية تعديلها وطباعتها وإرسال PDF.</li><li><b>التقارير:</b> ميزان مراجعة، قائمة دخل، ميزانية عمومية، أستاذ عام، وكشوف حسابات.</li></ul><h4>💡 نصائح</h4><ul style="padding-right:16px;"><li>يمكنك سحب التبويبات لإعادة ترتيبها حسب رغبتك.</li><li>اضغط على 📥 PDF في أي فاتورة لإرسال نسخة إلى محادثتك.</li><li>التقارير تُحدث تلقائياً من الفواتير والدفعات والمصاريف.</li></ul><p style="margin-top:16px;">📱 للدعم والتواصل: <b>@bukamal1991</b></p><div class="modal-actions"><button class="btn-primary" id="close-help">حسناً، فهمت</button></div></div>`;
  document.body.appendChild(overlay);
  document.getElementById('close-help').addEventListener('click', () => { document.body.removeChild(overlay); });
}
// ========== الفواتير (معقدة نوعاً ما، نستخدم نفس الكود السابق مع تحسينات بسيطة) ==========
async function loadSaleInvoiceForm() { showInvoiceModal('sale'); }
async function loadPurchaseInvoiceForm() { showInvoiceModal('purchase'); }

async function showInvoiceModal(type) {
  try {
    const [customers, suppliers, items] = await Promise.all([apiCall('/customers', 'GET'), apiCall('/suppliers', 'GET'), apiCall('/items', 'GET')]);
    itemsCache = items; customersCache = customers; suppliersCache = suppliers;
    let entOpts = '';
    if (type === 'sale') entOpts = `<option value="cash">عميل نقدي</option>` + customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    else entOpts = `<option value="cash">مورد نقدي</option>` + suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    const modalHTML = `<div class="modal-box" style="max-width:600px;max-height:90vh;overflow-y:auto;text-align:right;"><h3>فاتورة ${type === 'sale' ? 'مبيعات' : 'مشتريات'} جديدة</h3><input type="hidden" id="inv-type" value="${type}"/><h4 style="margin:16px 0 8px;">البنود</h4><div id="inv-lines-container"><div class="line-row"><select class="input-field item-select"><option value="">اختر مادة</option>${items.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}</select><div style="flex:1;"><label class="form-label" style="margin-top:0;font-size:0.8rem;">الكمية</label><input type="number" step="any" class="input-field qty-input"/></div><div style="flex:1;"><label class="form-label" style="margin-top:0;font-size:0.8rem;">السعر</label><input type="number" step="0.01" class="input-field price-input"/></div><div style="flex:1;"><label class="form-label" style="margin-top:0;font-size:0.8rem;">الإجمالي</label><input type="number" step="0.01" class="input-field total-input" readonly/></div><button class="btn-remove-line btn-secondary" style="display:none">✕</button></div></div><button id="btn-add-inv-line" class="btn-secondary">+ بند</button><label class="form-label" style="margin-top:16px;">${type === 'sale' ? 'العميل' : 'المورد'}</label><select id="inv-entity" class="input-field">${entOpts}</select><label class="form-label">التاريخ</label><input id="inv-date" type="date" class="input-field" value="${new Date().toISOString().split('T')[0]}"/><label class="form-label">الرقم المرجعي</label><input id="inv-ref" placeholder="الرقم المرجعي" class="input-field"/><label class="form-label">ملاحظات</label><textarea id="inv-notes" placeholder="ملاحظات" class="input-field"></textarea><label class="form-label">المبلغ المدفوع</label><input id="inv-paid" type="number" step="0.01" placeholder="المبلغ المدفوع" class="input-field"/><div class="modal-actions" style="margin-top:20px;"><button class="btn-primary" id="btn-save-invoice">حفظ الفاتورة</button><button class="btn-secondary" id="btn-cancel-invoice">إلغاء</button></div></div>`;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = modalHTML;
    document.body.appendChild(overlay);
    attachInvoiceEvents(type);
    document.getElementById('btn-cancel-invoice').addEventListener('click', () => { document.body.removeChild(overlay); });
  } catch (err) { alert('خطأ: ' + err.message); }
}

function attachInvoiceEvents(invoiceType) {
  function isItemDuplicate(id, cur) {
    if (!id) return false;
    let found = false;
    document.querySelectorAll('#inv-lines-container .line-row').forEach(r => {
      if (r === cur) return;
      if (r.querySelector('.item-select')?.value === id) found = true;
    });
    return found;
  }
  function autoFillPrice(sel, pr) {
    const id = sel.value;
    if (!id) { pr.value = ''; return; }
    const item = itemsCache.find(i => i.id == id);
    if (item) {
      pr.value = (invoiceType === 'sale' ? item.selling_price : item.purchase_price) || 0;
      const row = sel.closest('.line-row');
      const qty = row.querySelector('.qty-input'), tot = row.querySelector('.total-input');
      if (qty && tot) tot.value = Math.round((parseFloat(qty.value) || 0) * (parseFloat(pr.value) || 0));
    }
  }
  document.querySelectorAll('#inv-lines-container .line-row').forEach(row => {
    const sel = row.querySelector('.item-select'), pr = row.querySelector('.price-input');
    if (sel && pr) autoFillPrice(sel, pr);
    sel?.addEventListener('change', function () {
      if (isItemDuplicate(this.value, this.closest('.line-row'))) { alert('المادة مضافة مسبقاً'); this.value = ''; pr.value = ''; return; }
      autoFillPrice(this, pr);
    });
    const qty = row.querySelector('.qty-input'), tot = row.querySelector('.total-input');
    const calc = () => { tot.value = Math.round((parseFloat(qty.value) || 0) * (parseFloat(pr.value) || 0)); };
    qty?.addEventListener('input', calc);
    pr?.addEventListener('input', calc);
  });
  document.getElementById('btn-add-inv-line')?.addEventListener('click', () => {
    const ctr = document.getElementById('inv-lines-container');
    const newLine = document.createElement('div');
    newLine.className = 'line-row';
    newLine.innerHTML = `<select class="input-field item-select"><option value="">اختر مادة</option>${itemsCache.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}</select><div style="flex:1;"><label class="form-label" style="margin-top:0;">الكمية</label><input type="number" step="any" class="input-field qty-input"/></div><div style="flex:1;"><label class="form-label" style="margin-top:0;">السعر</label><input type="number" step="0.01" class="input-field price-input"/></div><div style="flex:1;"><label class="form-label" style="margin-top:0;">الإجمالي</label><input type="number" step="0.01" class="input-field total-input" readonly/></div><button class="btn-remove-line btn-secondary">✕</button>`;
    ctr.appendChild(newLine);
    updateInvoiceRemoveButtons();
    const sel = newLine.querySelector('.item-select'), pr = newLine.querySelector('.price-input');
    const qty = newLine.querySelector('.qty-input'), tot = newLine.querySelector('.total-input');
    sel.addEventListener('change', function () {
      if (isItemDuplicate(this.value, this.closest('.line-row'))) { alert('المادة مضافة مسبقاً'); this.value = ''; pr.value = ''; return; }
      autoFillPrice(this, pr);
    });
    const calc = () => { tot.value = Math.round((parseFloat(qty.value) || 0) * (parseFloat(pr.value) || 0)); };
    qty.addEventListener('input', calc);
    pr.addEventListener('input', calc);
  });
  document.getElementById('inv-lines-container')?.addEventListener('click', e => {
    if (e.target.classList.contains('btn-remove-line')) {
      const row = e.target.closest('.line-row');
      if (document.querySelectorAll('#inv-lines-container .line-row').length > 1) { row.remove(); updateInvoiceRemoveButtons(); }
    }
  });
  updateInvoiceRemoveButtons();
  document.getElementById('btn-save-invoice').onclick = async function () {
    const type = document.getElementById('inv-type').value;
    const entity = document.getElementById('inv-entity').value;
    let cust = null, supp = null;
    if (type === 'sale') cust = entity === 'cash' ? null : entity;
    else supp = entity === 'cash' ? null : entity;
    const date = document.getElementById('inv-date').value;
    const ref = document.getElementById('inv-ref').value.trim();
    const notes = document.getElementById('inv-notes').value.trim();
    const paid = parseFloat(document.getElementById('inv-paid')?.value) || 0;
    const lines = [];
    const ids = new Set();
    let dup = false;
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
      await apiCall('/invoices', 'POST', { type, customer_id: cust, supplier_id: supp, date, reference: ref, notes, lines, paid_amount: paid });
      document.body.removeChild(document.querySelector('.modal-overlay'));
      alert('تم حفظ الفاتورة بنجاح');
      loadInvoices();
    } catch (e) { alert('خطأ: ' + e.message); }
  };
}

function updateInvoiceRemoveButtons() {
  document.querySelectorAll('#inv-lines-container .line-row').forEach(row => {
    const btn = row.querySelector('.btn-remove-line');
    if (btn) btn.style.display = document.querySelectorAll('#inv-lines-container .line-row').length > 1 ? 'inline-block' : 'none';
  });
}

async function loadInvoices() {
  try {
    let html = `<div class="card"><h2>جميع الفواتير</h2><div style="display:flex;gap:6px;margin-bottom:8px;"><button class="tab filter-tab active" data-filter="all">الكل</button><button class="tab filter-tab" data-filter="sale">بيع</button><button class="tab filter-tab" data-filter="purchase">شراء</button></div><input id="invoice-search" type="text" class="input-field" placeholder="🔍 بحث في الفواتير..." style="margin-bottom:6px;"/></div><div id="invoices-list"></div>`;
    document.getElementById('tab-content').innerHTML = html;
    document.querySelectorAll('.filter-tab').forEach(tab => { tab.addEventListener('click', function () { document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active')); this.classList.add('active'); renderFilteredInvoices(); }); });
    document.getElementById('invoice-search').addEventListener('input', renderFilteredInvoices);
    renderFilteredInvoices();
  } catch (err) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`; }
}

function renderFilteredInvoices() {
  const activeFilter = document.querySelector('.filter-tab.active')?.dataset.filter || 'all';
  const q = document.getElementById('invoice-search')?.value.trim().toLowerCase() || '';
  let filtered = invoicesCache;
  if (activeFilter === 'sale') filtered = filtered.filter(inv => inv.type === 'sale');
  else if (activeFilter === 'purchase') filtered = filtered.filter(inv => inv.type === 'purchase');
  if (q) filtered = filtered.filter(inv => (inv.reference || '').toLowerCase().includes(q) || (inv.customer?.name || '').toLowerCase().includes(q) || (inv.supplier?.name || '').toLowerCase().includes(q) || String(inv.total).includes(q));
  if (!filtered.length) { document.getElementById('invoices-list').innerHTML = '<div class="card">لا توجد فواتير مطابقة</div>'; return; }
  document.getElementById('invoices-list').innerHTML = filtered.map(inv => `<div class="card"><strong>${inv.type === 'sale' ? 'بيع' : 'شراء'} ${inv.reference || ''}</strong> – ${inv.date}<br>${inv.customer?.name ? 'العميل: ' + inv.customer.name : ''} ${inv.supplier?.name ? 'المورد: ' + inv.supplier.name : ''}<br>الإجمالي: ${Math.round(inv.total)} | المدفوع: ${Math.round(inv.paid || 0)} | الباقي: <strong>${Math.round(inv.balance || 0)}</strong><div style="font-size:0.8em;">${inv.invoice_lines?.map(l => `${l.item?.name || '-'} x${l.quantity} @${l.unit_price}`).join('<br>')}</div><div class="card-actions"><button class="btn-secondary edit-invoice-btn" data-invoice-id="${inv.id}">✏️ تعديل</button><button class="btn-primary print-invoice-btn" data-invoice-id="${inv.id}">🖨️ طباعة</button><button class="btn-primary pdf-invoice-btn" data-invoice-id="${inv.id}">📥 PDF</button><button class="btn-danger delete-invoice-btn" data-invoice-id="${inv.id}">🗑️ حذف</button></div></div>`).join('');
  document.querySelectorAll('.edit-invoice-btn').forEach(btn => btn.addEventListener('click', e => { const inv = invoicesCache.find(i => i.id === parseInt(e.target.dataset.invoiceId)); if (inv) showEditInvoiceModal(inv); }));
  document.querySelectorAll('.print-invoice-btn').forEach(btn => btn.addEventListener('click', e => { const inv = invoicesCache.find(i => i.id === parseInt(e.target.dataset.invoiceId)); if (inv) printInvoice(inv); }));
  document.querySelectorAll('.pdf-invoice-btn').forEach(btn => btn.addEventListener('click', async e => { const id = parseInt(e.target.dataset.invoiceId); btn.disabled = true; btn.textContent = '⏳ جاري الإرسال...'; try { await apiCall('/send-invoice-pdf', 'POST', { invoiceId: id }); alert('تم إرسال الفاتورة إلى البوت ✅'); } catch (ex) { alert('فشل الإرسال: ' + ex.message); } finally { btn.disabled = false; btn.textContent = '📥 PDF'; } }));
  document.querySelectorAll('.delete-invoice-btn').forEach(btn => btn.addEventListener('click', e => deleteInvoice(parseInt(e.target.dataset.invoiceId))));
}

function printInvoice(invoice) { /* نفس الكود السابق */ }
async function deleteInvoice(id) {
  if (!await confirmDialog('متأكد من حذف الفاتورة؟')) return;
  try { await apiCall(`/invoices?id=${id}`, 'DELETE'); alert('تم الحذف'); loadInvoices(); } catch (e) { alert('خطأ: ' + e.message); }
}

// ========== لوحة التحكم ==========
async function loadDashboard() {
  try {
    const data = await apiCall('/summary', 'GET');
    const totalSales = data.total_sales || 0;
    const totalPurchases = data.total_purchases || 0;
    document.getElementById('tab-content').innerHTML = `
      <div class="summary-strip">
        <div class="summary-item profit"><div class="summary-icon">💰</div><div class="summary-label">صافي الربح</div><div class="summary-value ${data.net_profit >= 0 ? 'positive' : 'negative'}">${data.net_profit.toFixed(2)}</div></div>
        <div class="summary-item cash"><div class="summary-icon">🏦</div><div class="summary-label">رصيد الصندوق</div><div class="summary-value ${data.cash_balance >= 0 ? 'positive' : 'negative'}">${data.cash_balance.toFixed(2)}</div></div>
        <div class="summary-item daily-cash"><div class="summary-icon">📅</div><div class="summary-label">رصيد الصندوق اليومي</div><div class="summary-value ${data.daily_cash_balance >= 0 ? 'positive' : 'negative'}">${data.daily_cash_balance.toFixed(2)}</div></div>
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
      if (ctx1) new Chart(ctx1, { type: 'doughnut', data: { labels: ['مبيعات', 'مشتريات'], datasets: [{ data: [totalSales, totalPurchases], backgroundColor: ['#10b981', '#f59e0b'], borderColor: '#fff', borderWidth: 2 }] }, options: { responsive: true, plugins: { legend: { position: 'bottom' } } } });
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

// ========== التقارير ==========
async function loadReports() {
  let html = `
    <div class="card"><h2>التقارير</h2></div>
    <div class="card report-link" data-report="trial_balance">📊 ميزان المراجعة</div>
    <div class="card report-link" data-report="income_statement">📈 قائمة الدخل</div>
    <div class="card report-link" data-report="balance_sheet">⚖️ الميزانية العمومية</div>
    <div class="card report-link" data-report="account_ledger">📒 الأستاذ العام</div>
    <div class="card report-link" data-report="customer_statement">👤 كشف حساب عميل</div>
    <div class="card report-link" data-report="supplier_statement">🏭 كشف حساب مورد</div>
  `;
  document.getElementById('tab-content').innerHTML = html;
  document.querySelectorAll('.report-link').forEach(el => {
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
    const rows = data.map(r => `
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
        <div class="report-table-wrapper">
          <table class="report-table">
            <thead><tr><th>الحساب</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${e.message}</div>`;
  }
}

async function loadIncomeStatement() {
  try {
    const d = await apiCall('/reports?type=income_statement', 'GET');
    const incomeRows = d.income.map(i => `<tr><td>${i.name}</td><td>${i.balance.toFixed(2)}</td></tr>`).join('');
    const expenseRows = d.expenses.map(e => `<tr><td>${e.name}</td><td>${e.balance.toFixed(2)}</td></tr>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn-secondary" onclick="loadReports()">🔙 رجوع</button>
        <h3>قائمة الدخل</h3>
        <h4>الإيرادات</h4>
        <div class="report-table-wrapper"><table class="report-table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${incomeRows}</tbody></table></div>
        <strong>إجمالي الإيرادات: ${d.total_income.toFixed(2)}</strong>
        <h4>المصروفات</h4>
        <div class="report-table-wrapper"><table class="report-table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${expenseRows}</tbody></table></div>
        <strong>إجمالي المصروفات: ${d.total_expenses.toFixed(2)}</strong>
        <hr>
        <h2>صافي الربح: ${d.net_profit.toFixed(2)}</h2>
      </div>
    `;
  } catch (e) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${e.message}</div>`;
  }
}

async function loadBalanceSheet() {
  try {
    const d = await apiCall('/reports?type=balance_sheet', 'GET');
    const assetsRows = d.assets.map(a => `<tr><td>${a.name}</td><td>${a.balance.toFixed(2)}</td></tr>`).join('');
    const liabilitiesRows = d.liabilities.map(l => `<tr><td>${l.name}</td><td>${l.balance.toFixed(2)}</td></tr>`).join('');
    const equityRows = d.equity.map(e => `<tr><td>${e.name}</td><td>${e.balance.toFixed(2)}</td></tr>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn-secondary" onclick="loadReports()">🔙 رجوع</button>
        <h3>الميزانية العمومية</h3>
        <h4>الأصول</h4>
        <div class="report-table-wrapper"><table class="report-table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${assetsRows}</tbody></table></div>
        <strong>إجمالي الأصول: ${d.total_assets.toFixed(2)}</strong>
        <h4>الخصوم</h4>
        <div class="report-table-wrapper"><table class="report-table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${liabilitiesRows}</tbody></table></div>
        <strong>إجمالي الخصوم: ${d.total_liabilities.toFixed(2)}</strong>
        <h4>حقوق الملكية</h4>
        <div class="report-table-wrapper"><table class="report-table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${equityRows}</tbody></table></div>
        <strong>إجمالي حقوق الملكية: ${d.total_equity.toFixed(2)}</strong>
      </div>
    `;
  } catch (e) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${e.message}</div>`;
  }
}

async function loadAccountLedgerForm() {
  try {
    const accounts = await apiCall('/accounts', 'GET');
    const opts = accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn-secondary" onclick="loadReports()">🔙 رجوع</button>
        <h3>الأستاذ العام</h3>
        <select id="ledger-account" class="input-field">${opts}</select>
        <button id="btn-ledger" class="btn-primary">عرض الحركات</button>
        <div id="ledger-result" style="margin-top:15px"></div>
      </div>
    `;
    document.getElementById('btn-ledger').addEventListener('click', async () => {
      const accountId = document.getElementById('ledger-account').value;
      if (!accountId) return;
      try {
        const lines = await apiCall(`/reports?type=account_ledger&account_id=${accountId}`, 'GET');
        let html = '<div class="report-table-wrapper"><table class="report-table"><thead><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>';
        lines.forEach(l => {
          html += `
            <tr>
              <td>${l.date || ''}</td>
              <td>${l.description || ''}</td>
              <td>${(l.debit || 0).toFixed(2)}</td>
              <td>${(l.credit || 0).toFixed(2)}</td>
              <td style="font-weight:bold;color:${l.balance >= 0 ? 'green' : 'red'}">${(l.balance || 0).toFixed(2)}</td>
            </tr>
          `;
        });
        html += '</tbody></table></div>';
        document.getElementById('ledger-result').innerHTML = html;
      } catch (e) {
        document.getElementById('ledger-result').innerHTML = `<div style="color:red">⚠️ ${e.message}</div>`;
      }
    });
  } catch (e) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${e.message}</div>`;
  }
}

async function loadCustomerStatementForm() {
  try {
    const customers = await apiCall('/customers', 'GET');
    const opts = customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn-secondary" onclick="loadReports()">🔙 رجوع</button>
        <h3>كشف حساب عميل</h3>
        <select id="stmt-cust" class="input-field">${opts}</select>
        <button id="btn-stmt-cust" class="btn-primary">عرض الكشف</button>
        <div id="stmt-result"></div>
      </div>
    `;
    document.getElementById('btn-stmt-cust').addEventListener('click', async () => {
      const custId = document.getElementById('stmt-cust').value;
      if (!custId) return;
      try {
        const lines = await apiCall(`/reports?type=customer_statement&customer_id=${custId}`, 'GET');
        let html = '<div class="report-table-wrapper"><table class="report-table"><thead><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>';
        lines.forEach(l => {
          html += `
            <tr>
              <td>${l.date || ''}</td>
              <td>${l.description || ''}</td>
              <td>${(l.debit || 0).toFixed(2)}</td>
              <td>${(l.credit || 0).toFixed(2)}</td>
              <td style="font-weight:bold;color:${l.balance >= 0 ? 'green' : 'red'}">${(l.balance || 0).toFixed(2)}</td>
            </tr>
          `;
        });
        html += '</tbody></table></div>';
        document.getElementById('stmt-result').innerHTML = html;
      } catch (e) {
        document.getElementById('stmt-result').innerHTML = `<div style="color:red">⚠️ ${e.message}</div>`;
      }
    });
  } catch (e) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${e.message}</div>`;
  }
}

async function loadSupplierStatementForm() {
  try {
    const suppliers = await apiCall('/suppliers', 'GET');
    const opts = suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn-secondary" onclick="loadReports()">🔙 رجوع</button>
        <h3>كشف حساب مورد</h3>
        <select id="stmt-supp" class="input-field">${opts}</select>
        <button id="btn-stmt-supp" class="btn-primary">عرض الكشف</button>
        <div id="stmt-result"></div>
      </div>
    `;
    document.getElementById('btn-stmt-supp').addEventListener('click', async () => {
      const suppId = document.getElementById('stmt-supp').value;
      if (!suppId) return;
      try {
        const lines = await apiCall(`/reports?type=supplier_statement&supplier_id=${suppId}`, 'GET');
        let html = '<div class="report-table-wrapper"><table class="report-table"><thead><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>';
        lines.forEach(l => {
          html += `
            <tr>
              <td>${l.date || ''}</td>
              <td>${l.description || ''}</td>
              <td>${(l.debit || 0).toFixed(2)}</td>
              <td>${(l.credit || 0).toFixed(2)}</td>
              <td style="font-weight:bold;color:${l.balance >= 0 ? 'green' : 'red'}">${(l.balance || 0).toFixed(2)}</td>
            </tr>
          `;
        });
        html += '</tbody></table></div>';
        document.getElementById('stmt-result').innerHTML = html;
      } catch (e) {
        document.getElementById('stmt-result').innerHTML = `<div style="color:red">⚠️ ${e.message}</div>`;
      }
    });
  } catch (e) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${e.message}</div>`;
  }
}

// ========== أحداث التبويبات ==========
document.addEventListener('click', e => {
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
    else if (tab === 'units') loadUnits();
    else if (tab === 'payments') loadPayments();
    else if (tab === 'expenses') loadExpenses();
    else if (tab === 'invoices') loadInvoices();
    else if (tab === 'reports') loadReports();
  }
});

// ========== المصادقة والتحقق ==========
async function verifyUser() {
  try {
    const data = await apiCall('/verify', 'POST');
    if (data.verified) {
      document.getElementById('user-name').textContent = user.first_name;
      document.getElementById('loading').style.display = 'none';
      document.getElementById('main').style.display = 'block';
      [itemsCache, customersCache, suppliersCache, invoicesCache, categoriesCache, unitsCache] = await Promise.all([apiCall('/items', 'GET'), apiCall('/customers', 'GET'), apiCall('/suppliers', 'GET'), apiCall('/invoices', 'GET'), apiCall('/definitions?type=category', 'GET'), apiCall('/definitions?type=unit', 'GET')]);
      loadDashboard();
      document.getElementById('btn-help').addEventListener('click', showHelpModal);
    } else showError(data.error || 'غير مصرح لك');
  } catch (err) { showError(err.message); }
}
verifyUser();

// ========== تمرير التبويبات العمودي الاحترافي (بدون سحب أفقي) ==========
(function initSmartNavbar() {
  const nav = document.querySelector('nav');
  if (!nav) return;
  let lastScroll = 0;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const currentScroll = window.scrollY;
        if (currentScroll > lastScroll && currentScroll > 50) {
          nav.style.transition = 'transform 0.3s ease, opacity 0.2s ease';
          nav.style.transform = 'translateY(-100%)';
          nav.style.opacity = '0';
          nav.style.pointerEvents = 'none';
        } else if (currentScroll < lastScroll) {
          nav.style.transform = 'translateY(0)';
          nav.style.opacity = '1';
          nav.style.pointerEvents = 'auto';
        }
        lastScroll = currentScroll;
        ticking = false;
      });
      ticking = true;
    }
  });
})();

// ========== دوال المواد وعرض التفاصيل (مكملة للجزء الثاني) ==========
async function loadItems() {
  try {
    let html = `<div class="card"><h2>المواد</h2><button id="btn-add-item" class="btn-primary">+ إضافة مادة</button><input id="items-search" type="text" class="input-field" placeholder="🔍 بحث في المواد..." style="margin-top:8px;" /></div><div id="items-list"></div>`;
    document.getElementById('tab-content').innerHTML = html;
    document.getElementById('btn-add-item').addEventListener('click', showAddItemModal);
    document.getElementById('items-search').addEventListener('input', renderFilteredItems);
    renderFilteredItems();
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`;
  }
}

function renderFilteredItems() {
  const searchQuery = document.getElementById('items-search')?.value.trim().toLowerCase() || '';
  let filtered = itemsCache;
  if (searchQuery) filtered = filtered.filter(item => (item.name || '').toLowerCase().includes(searchQuery));
  if (!filtered.length) {
    document.getElementById('items-list').innerHTML = '<div class="card">لا توجد مواد مطابقة</div>';
    return;
  }
  let tableHtml = `<div class="card" style="overflow-x:auto; padding:0; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.05);"><table class="items-table"><thead><tr><th>اسم المادة</th><th>🛒 مشترى</th><th>💰 مباع</th><th>📦 متوفر</th><th>📏 الوحدة</th><th>💵 القيمة</th></tr></thead><tbody>`;
  filtered.forEach(item => {
    const purchaseQty = item.purchase_qty ?? 0;
    const saleQty = item.sale_qty ?? 0;
    const available = item.available ?? 0;
    const totalValue = item.total_value ?? 0;
    const unit = item.unit || '-';
    tableHtml += `<tr class="item-row" data-item-id="${item.id}" style="cursor:pointer;" onclick="showItemDetailModal(${item.id})"><td class="item-name">${item.name}</td><td class="qty">${purchaseQty}</td><td class="qty">${saleQty}</td><td class="qty" style="color:${available < 0 ? '#dc2626' : '#334155'}">${available}</td><td class="unit">${unit}</td><td class="value">${Math.round(totalValue)}<\/td></tr>`;
  });
  tableHtml += `</tbody>}</div>`;
  document.getElementById('items-list').innerHTML = tableHtml;
}

function showItemDetailModal(itemId) {
  const item = itemsCache.find(i => i.id === itemId);
  if (!item) return;
  const purchaseQty = item.purchase_qty ?? 0;
  const saleQty = item.sale_qty ?? 0;
  const available = item.available ?? 0;
  const totalValue = item.total_value ?? 0;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-box"><h3>${item.name}</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;"><div>📏 الوحدة: <b>${item.unit || 'غير محدد'}</b></div><div>🛒 الكمية المشتراة: <b>${purchaseQty}</b></div><div>💰 الكمية المباعة: <b>${saleQty}</b></div><div>📦 الكمية المتوفرة: <b>${available}</b></div><div>💵 القيمة (بسعر الشراء): <b>${totalValue.toFixed(2)}</b></div><div>🏷️ التصنيف: <b>${item.category?.name || 'بدون'}</b></div><div>📋 النوع: <b>${item.item_type || '-'}</b></div><div>🛒 سعر الشراء: <b>${item.purchase_price}</b></div><div>💰 سعر البيع: <b>${item.selling_price}</b></div></div><div class="modal-actions"><button class="btn-secondary" id="edit-item-from-detail">✏️ تعديل</button><button class="btn-danger" id="delete-item-from-detail">🗑️ حذف</button><button class="btn-secondary" id="close-detail">إغلاق</button></div></div>`;
  document.body.appendChild(overlay);
  document.getElementById('edit-item-from-detail').onclick = () => { document.body.removeChild(overlay); showEditItemModal(itemId); };
  document.getElementById('delete-item-from-detail').onclick = () => { document.body.removeChild(overlay); deleteItem(itemId); };
  document.getElementById('close-detail').onclick = () => document.body.removeChild(overlay);
}

