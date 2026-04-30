const tg = window.Telegram.WebApp; tg.ready(); tg.expand();
if (tg.colorScheme === 'dark') document.body.classList.add('dark');
tg.onEvent('themeChanged', () => { document.body.classList.toggle('dark', tg.colorScheme === 'dark'); });
const initData = tg.initData, user = tg.initDataUnsafe?.user, apiBase = '/api';
function showLoading(msg) { document.getElementById('loading').textContent = msg; document.getElementById('loading').style.display = 'block'; document.getElementById('main').style.display = 'none'; }
function showError(msg) { document.getElementById('loading').textContent = '❌ ' + msg; document.getElementById('loading').style.display = 'block'; document.getElementById('main').style.display = 'none'; }
async function apiCall(endpoint, method = 'GET', body = {}) {
  let url = apiBase + endpoint;
  if (method === 'GET' || method === 'DELETE') {
    url += (url.includes('?')?'&':'?') + 'initData=' + encodeURIComponent(initData);
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `خطأ ${res.status}`);
    return json;
  } else {
    const finalBody = { ...body, initData };
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(finalBody) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `خطأ ${res.status}`);
    return json;
  }
}
async function loadDashboard() {
  try {
    const [items, customers, suppliers, invoices, monthly, daily] = await Promise.all([
      apiCall('/items', 'GET'), apiCall('/customers', 'GET'), apiCall('/suppliers', 'GET'), apiCall('/invoices', 'GET'),
      apiCall('/reports?type=monthly_summary', 'GET'), apiCall('/reports?type=daily_profit', 'GET')
    ]);
    const totalSales = invoices.filter(inv => inv.type === 'sale').reduce((s, inv) => s + (inv.total || 0), 0);
    const totalPurchases = invoices.filter(inv => inv.type === 'purchase').reduce((s, inv) => s + (inv.total || 0), 0);
    document.getElementById('tab-content').innerHTML = `
      <div class="dashboard-grid">
        <div class="dash-card items"><span class="dash-icon">📦</span><div class="dash-label">المواد</div><div class="dash-value">${items.length}</div></div>
        <div class="dash-card customers"><span class="dash-icon">👥</span><div class="dash-label">العملاء</div><div class="dash-value">${customers.length}</div></div>
        <div class="dash-card suppliers"><span class="dash-icon">🏭</span><div class="dash-label">الموردين</div><div class="dash-value">${suppliers.length}</div></div>
        <div class="dash-card invoices"><span class="dash-icon">🧾</span><div class="dash-label">الفواتير</div><div class="dash-value">${invoices.length}</div></div>
      </div>
      <div class="charts-row">
        <div class="chart-container"><h4>المبيعات والمشتريات</h4><canvas id="incomeChart"></canvas></div>
        <div class="chart-container"><h4>المدفوعات الشهرية</h4><canvas id="paymentsChart"></canvas></div>
        <div class="chart-container"><h4>صافي الربح اليومي</h4><canvas id="profitChart"></canvas></div>
      </div>`;
    setTimeout(() => {
      const ctx1 = document.getElementById('incomeChart');
      if (ctx1) new Chart(ctx1, { type: 'doughnut', data: { labels: ['مبيعات', 'مشتريات'], datasets: [{ data: [totalSales, totalPurchases], backgroundColor: ['#10b981','#f59e0b'], borderColor: '#fff', borderWidth: 2 }] }, options: { responsive: true, plugins: { legend: { position: 'bottom' } } } });
      const ctx2 = document.getElementById('paymentsChart');
      if (ctx2 && monthly) new Chart(ctx2, { type: 'bar', data: { labels: monthly.labels, datasets: [{ label: 'وارد', data: monthly.payments_in, backgroundColor: '#10b981' }, { label: 'منصرف', data: monthly.payments_out, backgroundColor: '#ef4444' }] }, options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } } });
      const ctx3 = document.getElementById('profitChart');
      if (ctx3 && daily) {
        const pts = daily.dates.map((ds, i) => ({ x: new Date(ds + 'T00:00:00'), y: daily.profits[i] }));
        new Chart(ctx3, { type: 'line', data: { datasets: [{ label: 'صافي الربح اليومي', data: pts, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, pointRadius: 3 }] }, options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { x: { type: 'time', time: { unit: 'day', displayFormats: { day: 'yyyy-MM-dd' } }, title: { display: true, text: 'التاريخ' } }, y: { beginAtZero: true, title: { display: true, text: 'الربح' } } } } });
      }
    }, 100);
  } catch (err) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`; }
}
let customersCache = [];
async function loadCustomers() {
  try {
    const customers = await apiCall('/customers', 'GET'); customersCache = customers;
    let html = `<div class="card"><h2>العملاء</h2><button id="btn-add-customer" class="btn-primary">+ إضافة عميل</button></div>`;
    if (!customers.length) html += '<div class="card">لا يوجد عملاء</div>';
    else html += customers.map(c => `<div class="card"><strong>${c.name}</strong> <span style="float:left;font-weight:bold;color:${c.balance>=0?'green':'red'}">الرصيد: ${c.balance}</span><br>📞 ${c.phone||'-'} | 🏠 ${c.address||'-'}<div class="card-actions"><button class="btn-secondary" onclick="showEditCustomerModal(${c.id})">✏️ تعديل</button><button class="btn-danger" onclick="deleteCustomer(${c.id})">🗑️ حذف</button></div></div>`).join('');
    document.getElementById('tab-content').innerHTML = html;
    document.getElementById('btn-add-customer').addEventListener('click', showAddCustomerModal);
  } catch (err) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`; }
}
function showAddCustomerModal() {
  const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-box"><h3>إضافة عميل جديد</h3><label class="form-label">الاسم</label><input id="add-cust-name" class="input-field" placeholder="اسم العميل" /><label class="form-label">الهاتف</label><input id="add-cust-phone" class="input-field" placeholder="رقم الهاتف" /><label class="form-label">العنوان</label><input id="add-cust-address" class="input-field" placeholder="العنوان" /><div class="modal-actions"><button class="btn-primary" id="save-add-cust">حفظ</button><button class="btn-secondary" id="cancel-add-cust">إلغاء</button></div></div>`;
  document.body.appendChild(overlay);
  document.getElementById('save-add-cust').onclick = async () => {
    const n = document.getElementById('add-cust-name').value.trim(); if (!n) return alert('الاسم مطلوب');
    try { await apiCall('/customers', 'POST', { name: n, phone: document.getElementById('add-cust-phone').value.trim(), address: document.getElementById('add-cust-address').value.trim() }); document.body.removeChild(overlay); loadCustomers(); } catch (e) { alert('خطأ: '+e.message); }
  };
  document.getElementById('cancel-add-cust').onclick = () => document.body.removeChild(overlay);
}
function showEditCustomerModal(custId) {
  const c = customersCache.find(x => x.id === custId); if (!c) return;
  const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-box"><h3>تعديل العميل</h3><label class="form-label">الاسم</label><input id="edit-cust-name" class="input-field" value="${c.name}" /><label class="form-label">الهاتف</label><input id="edit-cust-phone" class="input-field" value="${c.phone||''}" /><label class="form-label">العنوان</label><input id="edit-cust-address" class="input-field" value="${c.address||''}" /><div class="modal-actions"><button class="btn-primary" id="save-cust-edit">حفظ</button><button class="btn-secondary" id="cancel-cust-edit">إلغاء</button></div></div>`;
  document.body.appendChild(overlay);
  document.getElementById('save-cust-edit').onclick = async () => {
    const n = document.getElementById('edit-cust-name').value.trim(); if (!n) return alert('الاسم مطلوب');
    try { await apiCall('/customers', 'PUT', { id: custId, name: n, phone: document.getElementById('edit-cust-phone').value.trim(), address: document.getElementById('edit-cust-address').value.trim() }); document.body.removeChild(overlay); loadCustomers(); } catch (e) { alert('خطأ: '+e.message); }
  };
  document.getElementById('cancel-cust-edit').onclick = () => document.body.removeChild(overlay);
}
let suppliersCache = [];
async function loadSuppliers() {
  try {
    const suppliers = await apiCall('/suppliers', 'GET'); suppliersCache = suppliers;
    let html = `<div class="card"><h2>الموردين</h2><button id="btn-add-supplier" class="btn-primary">+ إضافة مورد</button></div>`;
    if (!suppliers.length) html += '<div class="card">لا يوجد موردين</div>';
    else html += suppliers.map(s => `<div class="card"><strong>${s.name}</strong> <span style="float:left;font-weight:bold;color:${s.balance<=0?'green':'red'}">الرصيد: ${s.balance}</span><br>📞 ${s.phone||'-'} | 🏠 ${s.address||'-'}<div class="card-actions"><button class="btn-secondary" onclick="showEditSupplierModal(${s.id})">✏️ تعديل</button><button class="btn-danger" onclick="deleteSupplier(${s.id})">🗑️ حذف</button></div></div>`).join('');
    document.getElementById('tab-content').innerHTML = html;
    document.getElementById('btn-add-supplier').addEventListener('click', showAddSupplierModal);
  } catch (err) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`; }
}
function showAddSupplierModal() {
  const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-box"><h3>إضافة مورد جديد</h3><label class="form-label">الاسم</label><input id="add-sup-name" class="input-field" placeholder="اسم المورد" /><label class="form-label">الهاتف</label><input id="add-sup-phone" class="input-field" placeholder="رقم الهاتف" /><label class="form-label">العنوان</label><input id="add-sup-address" class="input-field" placeholder="العنوان" /><div class="modal-actions"><button class="btn-primary" id="save-add-sup">حفظ</button><button class="btn-secondary" id="cancel-add-sup">إلغاء</button></div></div>`;
  document.body.appendChild(overlay);
  document.getElementById('save-add-sup').onclick = async () => {
    const n = document.getElementById('add-sup-name').value.trim(); if (!n) return alert('الاسم مطلوب');
    try { await apiCall('/suppliers', 'POST', { name: n, phone: document.getElementById('add-sup-phone').value.trim(), address: document.getElementById('add-sup-address').value.trim() }); document.body.removeChild(overlay); loadSuppliers(); } catch (e) { alert('خطأ: '+e.message); }
  };
  document.getElementById('cancel-add-sup').onclick = () => document.body.removeChild(overlay);
}
function showEditSupplierModal(supId) {
  const s = suppliersCache.find(x => x.id === supId); if (!s) return;
  const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-box"><h3>تعديل المورد</h3><label class="form-label">الاسم</label><input id="edit-sup-name" class="input-field" value="${s.name}" /><label class="form-label">الهاتف</label><input id="edit-sup-phone" class="input-field" value="${s.phone||''}" /><label class="form-label">العنوان</label><input id="edit-sup-address" class="input-field" value="${s.address||''}" /><div class="modal-actions"><button class="btn-primary" id="save-sup-edit">حفظ</button><button class="btn-secondary" id="cancel-sup-edit">إلغاء</button></div></div>`;
  document.body.appendChild(overlay);
  document.getElementById('save-sup-edit').onclick = async () => {
    const n = document.getElementById('edit-sup-name').value.trim(); if (!n) return alert('الاسم مطلوب');
    try { await apiCall('/suppliers', 'PUT', { id: supId, name: n, phone: document.getElementById('edit-sup-phone').value.trim(), address: document.getElementById('edit-sup-address').value.trim() }); document.body.removeChild(overlay); loadSuppliers(); } catch (e) { alert('خطأ: '+e.message); }
  };
  document.getElementById('cancel-sup-edit').onclick = () => document.body.removeChild(overlay);
}
let itemsCache = [], categoriesCache = [];
async function loadItems() {
  try {
    const [items, categories] = await Promise.all([apiCall('/items', 'GET'), apiCall('/categories', 'GET')]); itemsCache = items; categoriesCache = categories;
    let html = `<div class="card"><h2>المواد</h2><button id="btn-add-item" class="btn-primary">+ إضافة مادة</button></div>`;
    if (!items.length) html += '<div class="card">لا توجد مواد مضافة بعد</div>';
    else html += items.map(i => `<div class="card item-row"><strong>${i.name}</strong> <span style="float:left;font-size:0.9em">${i.item_type||'مخزون'}</span><br>📂 ${i.category?.name||'بدون تصنيف'} | 🛒 شراء:${i.purchase_price} | 💰 بيع:${i.selling_price}<div class="card-actions"><button class="btn-secondary" onclick="showEditItemModal(${i.id})">✏️ تعديل</button><button class="btn-danger" onclick="deleteItem(${i.id})">🗑️ حذف</button></div></div>`).join('');
    document.getElementById('tab-content').innerHTML = html;
    document.getElementById('btn-add-item').addEventListener('click', showAddItemModal);
  } catch (err) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`; }
}
function showAddItemModal() {
  const catOpts = categoriesCache.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-box"><h3>إضافة مادة جديدة</h3><label class="form-label">اسم المادة</label><input id="add-item-name" class="input-field" /><label class="form-label">التصنيف</label><select id="add-item-category" class="input-field"><option value="">بدون تصنيف</option>${catOpts}</select><div style="display:flex;gap:8px;margin:5px 0"><input id="add-item-new-category" class="input-field" placeholder="تصنيف جديد" style="flex:2"/><button id="btn-add-category-in-modal" class="btn-secondary" style="flex:1">أضف تصنيف</button></div><label class="form-label">نوع المادة</label><select id="add-item-type" class="input-field"><option value="مخزون">مخزون</option><option value="منتج نهائي">منتج نهائي</option><option value="خدمة">خدمة</option></select><label class="form-label">سعر الشراء</label><input id="add-item-purchase" type="number" step="0.01" class="input-field" value="0"/><label class="form-label">سعر البيع</label><input id="add-item-selling" type="number" step="0.01" class="input-field" value="0"/><div class="modal-actions"><button class="btn-primary" id="save-add-item">حفظ</button><button class="btn-secondary" id="cancel-add-item">إلغاء</button></div></div>`;
  document.body.appendChild(overlay);
  document.getElementById('btn-add-category-in-modal').onclick = async () => {
    const cn = document.getElementById('add-item-new-category').value.trim(); if (!cn) return alert('أدخل اسم التصنيف');
    try { const nc = await apiCall('/categories', 'POST', { name: cn }); const sel = document.getElementById('add-item-category'); const opt = document.createElement('option'); opt.value = nc.id; opt.textContent = nc.name; sel.appendChild(opt); sel.value = nc.id; document.getElementById('add-item-new-category').value = ''; categoriesCache.push(nc); } catch (e) { alert('خطأ: '+e.message); }
  };
  document.getElementById('save-add-item').onclick = async () => {
    const n = document.getElementById('add-item-name').value.trim(); if (!n) return alert('اسم المادة مطلوب'); if (itemsCache.some(i => i.name.toLowerCase() === n.toLowerCase())) return alert('توجد مادة بنفس الاسم');
    const payload = { name: n, category_id: document.getElementById('add-item-category').value || null, item_type: document.getElementById('add-item-type').value, purchase_price: parseFloat(document.getElementById('add-item-purchase').value)||0, selling_price: parseFloat(document.getElementById('add-item-selling').value)||0 };
    try { await apiCall('/items', 'POST', payload); document.body.removeChild(overlay); loadItems(); } catch (e) { alert('خطأ: '+e.message); }
  };
  document.getElementById('cancel-add-item').onclick = () => document.body.removeChild(overlay);
}
function showEditItemModal(itemId) {
  const it = itemsCache.find(i => i.id === itemId); if (!it) return;
  const catOpts = categoriesCache.map(c => `<option value="${c.id}" ${c.id===it.category_id?'selected':''}>${c.name}</option>`).join('');
  const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-box"><h3>تعديل المادة</h3><label class="form-label">اسم المادة</label><input id="edit-item-name" class="input-field" value="${it.name}" /><label class="form-label">التصنيف</label><select id="edit-item-category" class="input-field"><option value="">بدون تصنيف</option>${catOpts}</select><label class="form-label">نوع المادة</label><select id="edit-item-type" class="input-field"><option value="مخزون" ${it.item_type==='مخزون'?'selected':''}>مخزون</option><option value="منتج نهائي" ${it.item_type==='منتج نهائي'?'selected':''}>منتج نهائي</option><option value="خدمة" ${it.item_type==='خدمة'?'selected':''}>خدمة</option></select><label class="form-label">سعر الشراء</label><input id="edit-item-purchase" type="number" step="0.01" class="input-field" value="${it.purchase_price}"/><label class="form-label">سعر البيع</label><input id="edit-item-selling" type="number" step="0.01" class="input-field" value="${it.selling_price}"/><div class="modal-actions"><button class="btn-primary" id="save-item-edit">حفظ</button><button class="btn-secondary" id="cancel-item-edit">إلغاء</button></div></div>`;
  document.body.appendChild(overlay);
  document.getElementById('save-item-edit').onclick = async () => {
    const n = document.getElementById('edit-item-name').value.trim(); if (!n) return alert('الاسم مطلوب');
    const payload = { id: itemId, name: n, category_id: document.getElementById('edit-item-category').value||null, item_type: document.getElementById('edit-item-type').value, purchase_price: parseFloat(document.getElementById('edit-item-purchase').value)||0, selling_price: parseFloat(document.getElementById('edit-item-selling').value)||0 };
    try { await apiCall('/items', 'PUT', payload); document.body.removeChild(overlay); loadItems(); } catch (e) { alert('خطأ: '+e.message); }
  };
  document.getElementById('cancel-item-edit').onclick = () => document.body.removeChild(overlay);
}
function updateInvoiceRemoveButtons() { document.querySelectorAll('#inv-lines-container .line-row').forEach(row => { const btn = row.querySelector('.btn-remove-line'); if (btn) btn.style.display = document.querySelectorAll('#inv-lines-container .line-row').length > 1 ? 'inline-block' : 'none'; }); }
function attachInvoiceEvents(invoiceType) {
  function isItemDuplicate(id, cur) { if (!id) return false; let found = false; document.querySelectorAll('#inv-lines-container .line-row').forEach(r => { if (r===cur) return; if (r.querySelector('.item-select')?.value===id) found=true; }); return found; }
  function autoFillPrice(sel, pr) {
    const id = sel.value; if (!id) { pr.value=''; return; }
    const item = itemsCache.find(i => i.id==id);
    if (item) { pr.value = (invoiceType==='sale'?item.selling_price:item.purchase_price)||0; const row = sel.closest('.line-row'); const qty = row.querySelector('.qty-input'), tot = row.querySelector('.total-input'); if (qty&&tot) tot.value = ((parseFloat(qty.value)||0)*(parseFloat(pr.value)||0)).toFixed(2); }
  }
  document.getElementById('btn-add-inv-line')?.addEventListener('click', () => {
    const ctr = document.getElementById('inv-lines-container');
    const line = document.createElement('div'); line.className = 'line-row';
    line.innerHTML = `<select class="input-field item-select"><option value="">اختر مادة</option>${itemsCache.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}</select><input type="number" step="any" placeholder="الكمية" class="input-field qty-input" /><input type="number" step="0.01" placeholder="السعر" class="input-field price-input" /><input type="number" step="0.01" placeholder="الإجمالي" class="input-field total-input" readonly /><button class="btn-remove-line btn-secondary">✕</button>`;
    ctr.appendChild(line); updateInvoiceRemoveButtons(); attachLineEvents(line);
    const sel = line.querySelector('.item-select'), pr = line.querySelector('.price-input');
    sel.addEventListener('change', function() { if (isItemDuplicate(this.value, this.closest('.line-row'))) { alert('المادة مضافة مسبقاً'); this.value=''; pr.value=''; return; } autoFillPrice(this, pr); });
  });
  document.getElementById('inv-lines-container')?.addEventListener('click', e => { if (e.target.classList.contains('btn-remove-line')) { const row = e.target.closest('.line-row'); if (document.querySelectorAll('#inv-lines-container .line-row').length>1) { row.remove(); updateInvoiceRemoveButtons(); } } });
  function attachLineEvents(row) { const qty = row.querySelector('.qty-input'), pr = row.querySelector('.price-input'), tot = row.querySelector('.total-input'); const calc = () => { tot.value = ((parseFloat(qty.value)||0)*(parseFloat(pr.value)||0)).toFixed(2); }; qty?.addEventListener('input', calc); pr?.addEventListener('input', calc); const sel = row.querySelector('.item-select'); sel?.addEventListener('change', function() { if (isItemDuplicate(this.value, this.closest('.line-row'))) { alert('المادة مضافة مسبقاً'); this.value=''; pr.value=''; return; } autoFillPrice(this, pr); }); }
  document.querySelectorAll('#inv-lines-container .line-row').forEach(r => attachLineEvents(r));
  document.getElementById('btn-save-invoice')?.addEventListener('click', async () => {
    const type = document.getElementById('inv-type').value, entity = document.getElementById('inv-entity').value;
    let cust=null, supp=null; if (type==='sale') cust = entity==='cash'?null:entity; else supp = entity==='cash'?null:entity;
    const date = document.getElementById('inv-date').value, ref = document.getElementById('inv-ref').value.trim(), notes = document.getElementById('inv-notes').value.trim(), paid = parseFloat(document.getElementById('inv-paid')?.value)||0;
    const lines = []; const ids = []; let dup = false;
    document.querySelectorAll('#inv-lines-container .line-row').forEach(row => {
      const id = row.querySelector('.item-select').value||null; if (id) { if (ids.includes(id)) dup=true; ids.push(id); }
      const qty = parseFloat(row.querySelector('.qty-input').value)||0, price = parseFloat(row.querySelector('.price-input').value)||0, total = parseFloat(row.querySelector('.total-input').value)||0;
      if (id||qty>0) lines.push({item_id:id, description:id?'':'بند', quantity:qty, unit_price:price, total});
    });
    if (dup) return alert('لا يمكن تكرار نفس المادة'); if (!lines.length) return alert('أضف بنداً');
    try { await apiCall('/invoices','POST',{type,customer_id:cust,supplier_id:supp,date,reference:ref,notes,lines,paid_amount:paid}); alert('تم حفظ الفاتورة'); loadInvoices(); } catch(e) { alert('خطأ: '+e.message); }
  });
  updateInvoiceRemoveButtons();
}
async function loadSaleInvoiceForm() { showInvoiceModal('sale'); }
async function loadPurchaseInvoiceForm() { showInvoiceModal('purchase'); }
async function showInvoiceModal(type) {
  try {
    const [customers, suppliers, items] = await Promise.all([apiCall('/customers','GET'),apiCall('/suppliers','GET'),apiCall('/items','GET')]);
    itemsCache=items;customersCache=customers;suppliersCache=suppliers;
    let entOpts = ''; if (type==='sale') entOpts = `<option value="cash">عميل نقدي</option>`+customers.map(c=>`<option value="${c.id}">${c.name}</option>`).join(''); else entOpts = `<option value="cash">مورد نقدي</option>`+suppliers.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
    const modalHTML = `<div class="modal-box" style="max-width:600px;max-height:90vh;overflow-y:auto;text-align:right;"><h3>فاتورة ${type==='sale'?'مبيعات':'مشتريات'} جديدة</h3><input type="hidden" id="inv-type" value="${type}" /><label class="form-label">${type==='sale'?'العميل':'المورد'}</label><select id="inv-entity" class="input-field">${entOpts}</select><label class="form-label">التاريخ</label><input id="inv-date" type="date" class="input-field" value="${new Date().toISOString().split('T')[0]}"/><label class="form-label">الرقم المرجعي</label><input id="inv-ref" placeholder="الرقم المرجعي" class="input-field"/><label class="form-label">ملاحظات</label><textarea id="inv-notes" placeholder="ملاحظات" class="input-field"></textarea><h4 style="margin:16px 0 8px;">البنود</h4><div id="inv-lines-container"><div class="line-row"><select class="input-field item-select"><option value="">اختر مادة</option>${items.map(i=>`<option value="${i.id}">${i.name}</option>`).join('')}</select><input type="number" step="any" placeholder="الكمية" class="input-field qty-input"/><input type="number" step="0.01" placeholder="السعر" class="input-field price-input"/><input type="number" step="0.01" placeholder="الإجمالي" class="input-field total-input" readonly/><button class="btn-remove-line btn-secondary" style="display:none">✕</button></div></div><button id="btn-add-inv-line" class="btn-secondary">+ بند</button><label class="form-label" style="margin-top:16px;">المبلغ المدفوع</label><input id="inv-paid" type="number" step="0.01" placeholder="المبلغ المدفوع" class="input-field" value="0"/><div class="modal-actions" style="margin-top:20px;"><button class="btn-primary" id="btn-save-invoice">حفظ الفاتورة</button><button class="btn-secondary" id="btn-cancel-invoice">إلغاء</button></div></div>`;
    const overlay = document.createElement('div'); overlay.className = 'modal-overlay'; overlay.innerHTML = modalHTML; document.body.appendChild(overlay);
    attachInvoiceEvents(type);
    document.getElementById('btn-cancel-invoice').addEventListener('click', () => { document.body.removeChild(overlay); });
    document.getElementById('btn-save-invoice').onclick = async function() {
      const type = document.getElementById('inv-type').value, entity = document.getElementById('inv-entity').value;
      let cust=null, supp=null; if (type==='sale') cust = entity==='cash'?null:entity; else supp = entity==='cash'?null:entity;
      const date = document.getElementById('inv-date').value, ref = document.getElementById('inv-ref').value.trim(), notes = document.getElementById('inv-notes').value.trim(), paid = parseFloat(document.getElementById('inv-paid')?.value)||0;
      const lines = []; const ids = []; let dup = false;
      document.querySelectorAll('#inv-lines-container .line-row').forEach(row => {
        const id = row.querySelector('.item-select').value||null; if (id) { if (ids.includes(id)) dup=true; ids.push(id); }
        const qty = parseFloat(row.querySelector('.qty-input').value)||0, price = parseFloat(row.querySelector('.price-input').value)||0, total = parseFloat(row.querySelector('.total-input').value)||0;
        if (id||qty>0) lines.push({item_id:id, description:id?'':'بند', quantity:qty, unit_price:price, total});
      });
      if (dup) return alert('لا يمكن تكرار نفس المادة'); if (!lines.length) return alert('أضف بنداً');
      try { await apiCall('/invoices','POST',{type,customer_id:cust,supplier_id:supp,date,reference:ref,notes,lines,paid_amount:paid}); document.body.removeChild(overlay); alert('تم حفظ الفاتورة بنجاح'); loadInvoices(); } catch(e) { alert('خطأ: '+e.message); }
    };
  } catch(err) { alert('خطأ: '+err.message); }
}
let invoicesCache = [];
async function loadInvoices() {
  try {
    const [invoices] = await Promise.all([apiCall('/invoices','GET')]); invoicesCache = invoices;
    customersCache = (await apiCall('/customers','GET')); suppliersCache = (await apiCall('/suppliers','GET')); itemsCache = (await apiCall('/items','GET'));
    let html = `<div class="card"><h2>جميع الفواتير</h2></div>`;
    if (!invoices.length) html += '<div class="card">لا توجد فواتير</div>';
    else html += invoices.map(inv => `<div class="card"><strong>${inv.type==='sale'?'بيع':'شراء'} ${inv.reference||''}</strong> – ${inv.date}<br>${inv.customer?.name?'العميل: '+inv.customer.name:''} ${inv.supplier?.name?'المورد: '+inv.supplier.name:''}<br>الإجمالي: ${inv.total} | المدفوع: ${inv.paid||0} | الباقي: <strong>${inv.balance||0}</strong><div style="font-size:0.8em">${inv.invoice_lines?.map(l => `${l.item?.name||'-'} x${l.quantity} @${l.unit_price}`).join('<br>')}</div><div class="card-actions"><button class="btn-secondary edit-invoice-btn" data-invoice-id="${inv.id}">✏️ تعديل</button><button class="btn-primary print-invoice-btn" data-invoice-id="${inv.id}">🖨️ طباعة</button><button class="btn-primary pdf-invoice-btn" data-invoice-id="${inv.id}">📥 PDF</button><button class="btn-danger delete-invoice-btn" data-invoice-id="${inv.id}">🗑️ حذف</button></div></div>`).join('');
    document.getElementById('tab-content').innerHTML = html;
    document.querySelectorAll('.edit-invoice-btn').forEach(btn => btn.addEventListener('click', e => { const inv = invoicesCache.find(i => i.id === parseInt(e.target.dataset.invoiceId)); if (inv) showEditInvoiceModal(inv); }));
    document.querySelectorAll('.print-invoice-btn').forEach(btn => btn.addEventListener('click', e => { const inv = invoicesCache.find(i => i.id === parseInt(e.target.dataset.invoiceId)); if (inv) printInvoice(inv); }));
    document.querySelectorAll('.pdf-invoice-btn').forEach(btn => btn.addEventListener('click', async e => {
      const id = parseInt(e.target.dataset.invoiceId);
      btn.disabled = true; btn.textContent = '⏳ جاري الإرسال...';
      try { await apiCall('/send-invoice-pdf', 'POST', { invoiceId: id }); alert('تم إرسال الفاتورة إلى البوت ✅'); } catch (ex) { alert('فشل الإرسال: '+ex.message); }
      finally { btn.disabled = false; btn.textContent = '📥 PDF'; }
    }));
    document.querySelectorAll('.delete-invoice-btn').forEach(btn => btn.addEventListener('click', e => deleteInvoice(parseInt(e.target.dataset.invoiceId))));
  } catch (err) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`; }
}
function showEditInvoiceModal(invoice) {
  const type = invoice.type;
  const itemsOpt = itemsCache.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
  const customersOpt = customersCache.map(c => `<option value="${c.id}" ${c.id===invoice.customer_id?'selected':''}>${c.name}</option>`).join('');
  const suppliersOpt = suppliersCache.map(s => `<option value="${s.id}" ${s.id===invoice.supplier_id?'selected':''}>${s.name}</option>`).join('');
  function isEditItemDuplicate(id, cur) { if (!id) return false; let found = false; document.querySelectorAll('#edit-inv-lines .line-row').forEach(r => { if (r===cur) return; if (r.querySelector('.item-select')?.value===id) found=true; }); return found; }
  function autoFillPrice(sel, pr) { const id = sel.value; if (!id) { pr.value=''; return; } const item = itemsCache.find(i => i.id==id); if (item) { pr.value = (type==='sale'?item.selling_price:item.purchase_price)||0; const row = sel.closest('.line-row'); const q = row.querySelector('.qty-input'), t = row.querySelector('.total-input'); if (q&&t) t.value = ((parseFloat(q.value)||0)*(parseFloat(pr.value)||0)).toFixed(2); } }
  let linesHtml = ''; invoice.invoice_lines.forEach(l => linesHtml += `<div class="line-row"><select class="input-field item-select"><option value="">اختر مادة</option>${itemsCache.map(i => `<option value="${i.id}" ${i.id===l.item_id?'selected':''}>${i.name}</option>`).join('')}</select><input type="number" step="any" class="input-field qty-input" value="${l.quantity}"/><input type="number" step="0.01" class="input-field price-input" value="${l.unit_price}"/><input type="number" step="0.01" class="input-field total-input" value="${l.total}" readonly/><button class="btn-remove-line btn-secondary">✕</button></div>`);
  const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-box" style="max-width:600px;max-height:90vh;overflow-y:auto"><h3>تعديل الفاتورة</h3><input type="hidden" id="edit-inv-id" value="${invoice.id}"/><label>النوع</label><select id="edit-inv-type" class="input-field"><option value="sale" ${type==='sale'?'selected':''}>بيع</option><option value="purchase" ${type==='purchase'?'selected':''}>شراء</option></select><div id="edit-customer-block" style="display:${type==='sale'?'block':'none'}"><label>العميل</label><select id="edit-inv-customer" class="input-field"><option value="">اختر عميل</option>${customersOpt}</select></div><div id="edit-supplier-block" style="display:${type==='purchase'?'block':'none'}"><label>المورد</label><select id="edit-inv-supplier" class="input-field"><option value="">اختر مورد</option>${suppliersOpt}</select></div><label>التاريخ</label><input id="edit-inv-date" type="date" class="input-field" value="${invoice.date}"/><label>الرقم المرجعي</label><input id="edit-inv-ref" class="input-field" value="${invoice.reference||''}"/><label>ملاحظات</label><textarea id="edit-inv-notes" class="input-field">${invoice.notes||''}</textarea><h4>البنود</h4><div id="edit-inv-lines">${linesHtml}</div><button id="btn-add-edit-line" class="btn-secondary">+ بند</button><div class="modal-actions"><button class="btn-primary" id="save-invoice-edit">حفظ</button><button class="btn-secondary" id="cancel-invoice-edit">إلغاء</button></div></div>`;
  document.body.appendChild(overlay);
  document.getElementById('edit-inv-type').addEventListener('change', function() { document.getElementById('edit-customer-block').style.display = this.value==='sale'?'block':'none'; document.getElementById('edit-supplier-block').style.display = this.value==='purchase'?'block':'none'; });
  document.getElementById('btn-add-edit-line').addEventListener('click', () => { const line = document.createElement('div'); line.className = 'line-row'; line.innerHTML = `<select class="input-field item-select"><option value="">اختر مادة</option>${itemsOpt}</select><input type="number" step="any" class="input-field qty-input" placeholder="الكمية"/><input type="number" step="0.01" class="input-field price-input" placeholder="السعر"/><input type="number" step="0.01" class="input-field total-input" placeholder="الإجمالي" readonly/><button class="btn-remove-line btn-secondary">✕</button>`; document.getElementById('edit-inv-lines').appendChild(line); attachLineEvents(line); const sel = line.querySelector('.item-select'), pr = line.querySelector('.price-input'); sel.addEventListener('change', function() { if (isEditItemDuplicate(this.value, this.closest('.line-row'))) { alert('مادة مضافة مسبقاً'); this.value=''; pr.value=''; return; } autoFillPrice(this, pr); }); });
  document.getElementById('edit-inv-lines').addEventListener('click', e => { if (e.target.classList.contains('btn-remove-line')) { const row = e.target.closest('.line-row'); if (document.querySelectorAll('#edit-inv-lines .line-row').length>1) row.remove(); } });
  function attachLineEvents(row) { const q = row.querySelector('.qty-input'), p = row.querySelector('.price-input'), t = row.querySelector('.total-input'); const calc = () => t.value = ((parseFloat(q.value)||0)*(parseFloat(p.value)||0)).toFixed(2); q?.addEventListener('input', calc); p?.addEventListener('input', calc); const sel = row.querySelector('.item-select'); sel?.addEventListener('change', function() { if (isEditItemDuplicate(this.value, this.closest('.line-row'))) { alert('مادة مضافة مسبقاً'); this.value=''; p.value=''; return; } autoFillPrice(this, p); }); }
  document.querySelectorAll('#edit-inv-lines .line-row').forEach(r => attachLineEvents(r));
  document.getElementById('save-invoice-edit').onclick = async () => {
    const id = parseInt(document.getElementById('edit-inv-id').value), type = document.getElementById('edit-inv-type').value, cust = document.getElementById('edit-inv-customer')?.value||null, supp = document.getElementById('edit-inv-supplier')?.value||null, date = document.getElementById('edit-inv-date').value, ref = document.getElementById('edit-inv-ref').value.trim(), notes = document.getElementById('edit-inv-notes').value.trim();
    const lines = []; const ids = []; let dup = false;
    document.querySelectorAll('#edit-inv-lines .line-row').forEach(row => { const itemId = row.querySelector('.item-select').value||null; if (itemId) { if (ids.includes(itemId)) dup=true; ids.push(itemId); } lines.push({item_id:itemId||null, quantity:parseFloat(row.querySelector('.qty-input').value)||0, unit_price:parseFloat(row.querySelector('.price-input').value)||0, total:parseFloat(row.querySelector('.total-input').value)||0}); });
    if (dup) return alert('لا يمكن تكرار نفس المادة'); if (!lines.filter(l=>l.item_id||l.quantity>0).length) return alert('أضف بنداً');
    try { await apiCall('/invoices','PUT', { id, type, customer_id:cust, supplier_id:supp, date, reference:ref, notes, lines }); document.body.removeChild(overlay); alert('تم تعديل الفاتورة'); loadInvoices(); } catch (e) { alert('خطأ: '+e.message); }
  };
  document.getElementById('cancel-invoice-edit').onclick = () => document.body.removeChild(overlay);
}
function printInvoice(invoice) {
  if (!invoice) return alert('بيانات غير متوفرة');
  const rows = invoice.invoice_lines?.map(l => `<tr><td>${l.item?.name||'-'}</td><td>${l.quantity}</td><td>${l.unit_price}</td><td>${l.total}</td></tr>`).join('')||'';
  const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>فاتورة ${invoice.reference||''}</title><style>body{font-family:Tajawal,sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #ddd;padding:8px;text-align:right}th{background:#f0f0f0}@media print{.no-print{display:none}}</style></head><body><h2>فاتورة ${invoice.type==='sale'?'بيع':'شراء'}</h2><p>التاريخ: ${invoice.date} | المرجع: ${invoice.reference||'-'}</p><p>${invoice.customer?.name?'العميل: '+invoice.customer.name:''} ${invoice.supplier?.name?'المورد: '+invoice.supplier.name:''}</p><table><tr><th>المادة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>${rows}</table><h3>الإجمالي: ${invoice.total}</h3><p>المدفوع: ${invoice.paid||0} | الباقي: ${invoice.balance||0}</p><p>${invoice.notes||''}</p><button class="no-print" onclick="window.print()">🖨️ طباعة</button><script>setTimeout(()=>window.print(),800);</script></body></html>`;
  const w = window.open('','_blank','width=800,height=600');
  if (w) { w.document.write(html); w.document.close(); }
  else { alert('سيتم عرض الفاتورة للطباعة'); const ifr = document.createElement('iframe'); ifr.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:9999;background:white;'; document.body.appendChild(ifr); ifr.contentWindow.document.write(html); ifr.contentWindow.document.close(); try { ifr.contentWindow.onafterprint = () => document.body.removeChild(ifr); } catch(e) {} }
}
function downloadPDF(invoice) {
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;padding:40px;background:white;font-family:Tajawal,sans-serif;direction:rtl;color:#000';
  div.innerHTML = `<h2 style="text-align:center;color:#2563eb">الراجحي للمحاسبة</h2><h3 style="text-align:center">فاتورة ${invoice.type==='sale'?'بيع':'شراء'}</h3><p style="text-align:center">التاريخ: ${invoice.date} | المرجع: ${invoice.reference||'-'}</p>${invoice.customer?.name?`<p>العميل: ${invoice.customer.name}</p>`:''}${invoice.supplier?.name?`<p>المورد: ${invoice.supplier.name}</p>`:''}<table style="width:100%;border-collapse:collapse;margin-top:20px"><tr style="background:#f0f0f0"><th style="border:1px solid #ccc;padding:8px">المادة</th><th style="border:1px solid #ccc;padding:8px">الكمية</th><th style="border:1px solid #ccc;padding:8px">السعر</th><th style="border:1px solid #ccc;padding:8px">الإجمالي</th></tr>${invoice.invoice_lines?.map(l=>`<tr><td style="border:1px solid #ddd;padding:8px">${l.item?.name||'-'}</td><td style="border:1px solid #ddd;padding:8px">${l.quantity}</td><td style="border:1px solid #ddd;padding:8px">${l.unit_price}</td><td style="border:1px solid #ddd;padding:8px">${l.total}</td></tr>`).join('')}</table><div style="text-align:left;margin-top:20px"><p><strong>الإجمالي: ${invoice.total}</strong></p><p>المدفوع: ${invoice.paid||0}</p><p style="color:red"><strong>الباقي: ${invoice.balance||0}</strong></p></div>${invoice.notes?`<p style="margin-top:15px">ملاحظات: ${invoice.notes}</p>`:''}`;
  document.body.appendChild(div);
  html2canvas(div, { scale: 2, backgroundColor: '#fff', logging: false }).then(canvas => {
    document.body.removeChild(div);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const w = 210, h = (canvas.height * w) / canvas.width;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h);
    pdf.save(`فاتورة-${invoice.reference||invoice.id}.pdf`);
  }).catch(e => { document.body.removeChild(div); alert('فشل PDF: '+e.message); });
}
function confirmDialog(msg) { return new Promise(resolve => { const overlay = document.createElement('div'); overlay.className = 'modal-overlay'; overlay.innerHTML = `<div class="modal-box"><p>${msg}</p><div class="modal-actions"><button class="btn-danger" id="modal-confirm">نعم، احذف</button><button class="btn-secondary" id="modal-cancel">إلغاء</button></div></div>`; document.body.appendChild(overlay); document.getElementById('modal-confirm').onclick = () => { document.body.removeChild(overlay); resolve(true); }; document.getElementById('modal-cancel').onclick = () => { document.body.removeChild(overlay); resolve(false); }; }); }
async function deleteItem(id) { if (!await confirmDialog('متأكد من حذف المادة؟')) return; try { await apiCall(`/items?id=${id}`,'DELETE'); alert('تم الحذف'); loadItems(); } catch(e) { alert('خطأ: '+e.message); } }
async function deleteCustomer(id) { if (!await confirmDialog('متأكد من حذف العميل؟')) return; try { await apiCall(`/customers?id=${id}`,'DELETE'); alert('تم الحذف'); loadCustomers(); } catch(e) { alert('خطأ: '+e.message); } }
async function deleteSupplier(id) { if (!await confirmDialog('متأكد من حذف المورد؟')) return; try { await apiCall(`/suppliers?id=${id}`,'DELETE'); alert('تم الحذف'); loadSuppliers(); } catch(e) { alert('خطأ: '+e.message); } }
async function deleteInvoice(id) { if (!await confirmDialog('متأكد من حذف الفاتورة؟')) return; try { await apiCall(`/invoices?id=${id}`,'DELETE'); alert('تم الحذف'); loadInvoices(); } catch(e) { alert('خطأ: '+e.message); } }
async function loadCategories() {
  try {
    const cats = await apiCall('/categories','GET');
    let html = `<div class="card"><h2>التصنيفات</h2><button id="btn-add-cat" class="btn-primary">+ إضافة تصنيف</button></div>`;
    if (!cats.length) html += '<div class="card">لا توجد تصنيفات</div>';
    else html += cats.map(c => `<div class="card"><strong>${c.name}</strong><div class="card-actions"><button class="btn-secondary" onclick="showEditCategoryModal(${c.id})">✏️ تعديل</button><button class="btn-danger" onclick="deleteCategory(${c.id})">🗑️ حذف</button></div></div>`).join('');
    document.getElementById('tab-content').innerHTML = html;
    document.getElementById('btn-add-cat').addEventListener('click', showAddCategoryModal);
  } catch (err) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`; }
}
function showAddCategoryModal() {
  const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-box"><h3>إضافة تصنيف جديد</h3><label class="form-label">اسم التصنيف</label><input id="cat-name" class="input-field" placeholder="اسم التصنيف" /><div class="modal-actions"><button class="btn-primary" id="btn-save-cat">حفظ</button><button class="btn-secondary" id="btn-cancel-cat">إلغاء</button></div></div>`;
  document.body.appendChild(overlay);
  document.getElementById('btn-save-cat').onclick = async () => {
    const n = document.getElementById('cat-name').value.trim();
    if (!n) return alert('الاسم مطلوب');
    try { await apiCall('/categories','POST',{name:n}); document.body.removeChild(overlay); loadCategories(); } catch(e) { alert('خطأ: '+e.message); }
  };
  document.getElementById('btn-cancel-cat').onclick = () => document.body.removeChild(overlay);
}
function showEditCategoryModal(id) { apiCall('/categories','GET').then(cats => { const c = cats.find(x => x.id===id); if (!c) return; const overlay = document.createElement('div'); overlay.className='modal-overlay'; overlay.innerHTML=`<div class="modal-box"><h3>تعديل التصنيف</h3><input id="edit-cat-name" class="input-field" value="${c.name}"/><div class="modal-actions"><button class="btn-primary" id="save-cat-edit">حفظ</button><button class="btn-secondary" id="cancel-cat-edit">إلغاء</button></div></div>`; document.body.appendChild(overlay); document.getElementById('save-cat-edit').onclick = async () => { const n = document.getElementById('edit-cat-name').value.trim(); if (!n) return alert('الاسم مطلوب'); try { await apiCall('/categories','PUT',{id,name:n}); document.body.removeChild(overlay); loadCategories(); } catch(e) { alert('خطأ: '+e.message); } }; document.getElementById('cancel-cat-edit').onclick = () => document.body.removeChild(overlay); }); }
async function deleteCategory(id) { if (!await confirmDialog('متأكد من حذف التصنيف؟')) return; try { await apiCall(`/categories?id=${id}`,'DELETE'); alert('تم الحذف'); loadCategories(); } catch(e) { alert('خطأ: '+e.message); } }
async function loadPayments() {
  try {
    const [payments, invoices, customers, suppliers] = await Promise.all([apiCall('/payments','GET'), apiCall('/invoices','GET'), apiCall('/customers','GET'), apiCall('/suppliers','GET')]);
    let html = `<div class="card"><h2>الدفعات</h2><button id="btn-add-pmt" class="btn-primary">+ إضافة دفعة</button></div>`;
    if (!payments.length) html += '<div class="card">لا توجد دفعات</div>';
    else html += payments.map(p => `<div class="card"><strong>${p.amount}</strong> – ${p.payment_date}<br>${p.customer?.name?'العميل: '+p.customer.name:''} ${p.supplier?.name?'المورد: '+p.supplier.name:''} ${p.invoice?'| فاتورة: '+(p.invoice.type==='sale'?'بيع ':'شراء ')+(p.invoice.reference||''):''} ${p.notes?'<br>'+p.notes:''}<div class="card-actions"><button class="btn-danger" onclick="deletePayment(${p.id})">🗑️ حذف</button></div></div>`).join('');
    document.getElementById('tab-content').innerHTML = html;
    document.getElementById('btn-add-pmt').addEventListener('click', () => showAddPaymentModal(customers, suppliers, invoices));
  } catch (err) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`; }
}
function showAddPaymentModal(customers, suppliers, invoices) {
  const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-box" style="max-width:500px;"><h3>إضافة دفعة جديدة</h3><label class="form-label">النوع</label><select id="pmt-type" class="input-field"><option value="customer">من عميل</option><option value="supplier">إلى مورد</option></select><div id="pmt-cust-block"><label class="form-label">العميل</label><select id="pmt-customer" class="input-field"><option value="">اختر عميل</option>${customers.map(c => `<option value="${c.id}">${c.name} (${c.balance})</option>`).join('')}</select></div><div id="pmt-supp-block" style="display:none;"><label class="form-label">المورد</label><select id="pmt-supplier" class="input-field"><option value="">اختر مورد</option>${suppliers.map(s => `<option value="${s.id}">${s.name} (${s.balance})</option>`).join('')}</select></div><label class="form-label">الفاتورة (اختياري)</label><select id="pmt-invoice" class="input-field"><option value="">بدون فاتورة</option></select><label class="form-label">المبلغ</label><input id="pmt-amount" type="number" step="0.01" placeholder="المبلغ" class="input-field" /><label class="form-label">التاريخ</label><input id="pmt-date" type="date" class="input-field" value="${new Date().toISOString().split('T')[0]}" /><label class="form-label">ملاحظات</label><textarea id="pmt-notes" placeholder="ملاحظات" class="input-field"></textarea><div class="modal-actions"><button class="btn-primary" id="btn-save-pmt">حفظ الدفعة</button><button class="btn-secondary" id="btn-cancel-pmt">إلغاء</button></div></div>`;
  document.body.appendChild(overlay);
  const tSel = document.getElementById('pmt-type'), cBlock = document.getElementById('pmt-cust-block'), sBlock = document.getElementById('pmt-supp-block'), invSel = document.getElementById('pmt-invoice'), cSel = document.getElementById('pmt-customer'), sSel = document.getElementById('pmt-supplier');
  const updateInvList = (type, eId) => { const filt = invoices.filter(inv => type==='customer'? inv.type==='sale' && inv.customer_id==eId : inv.type==='purchase' && inv.supplier_id==eId); invSel.innerHTML = '<option value="">بدون فاتورة</option>' + filt.map(inv => `<option value="${inv.id}">${inv.type==='sale'?'بيع':'شراء'} ${inv.reference||''} (${inv.total})</option>`).join(''); };
  tSel.addEventListener('change', () => { if (tSel.value==='customer') { cBlock.style.display='block'; sBlock.style.display='none'; updateInvList('customer', cSel.value); } else { cBlock.style.display='none'; sBlock.style.display='block'; updateInvList('supplier', sSel.value); } });
  cSel.addEventListener('change', () => updateInvList('customer', cSel.value));
  sSel.addEventListener('change', () => updateInvList('supplier', sSel.value));
  document.getElementById('btn-save-pmt').onclick = async () => {
    const type = tSel.value, cust = type==='customer'? (cSel.value||null) : null, supp = type==='supplier'? (sSel.value||null) : null, invId = invSel.value||null, amount = parseFloat(document.getElementById('pmt-amount').value);
    if (!amount || amount<=0) return alert('المبلغ مطلوب'); if (!cust && !supp) return alert('اختر عميلاً أو مورداً');
    try { await apiCall('/payments','POST',{invoice_id:invId,customer_id:cust,supplier_id:supp,amount,payment_date:document.getElementById('pmt-date').value,notes:document.getElementById('pmt-notes').value.trim()}); document.body.removeChild(overlay); alert('تم حفظ الدفعة'); loadPayments(); } catch(e) { alert('خطأ: '+e.message); }
  };
  document.getElementById('btn-cancel-pmt').onclick = () => document.body.removeChild(overlay);
}
async function deletePayment(id) { if (!await confirmDialog('متأكد من حذف الدفعة؟')) return; try { await apiCall(`/payments?id=${id}`,'DELETE'); alert('تم الحذف'); loadPayments(); } catch(e) { alert('خطأ: '+e.message); } }
async function loadReports() {
  let html = `<div class="card"><h2>التقارير</h2></div><div class="card report-link" data-report="trial_balance">📊 ميزان المراجعة</div><div class="card report-link" data-report="income_statement">📈 قائمة الدخل</div><div class="card report-link" data-report="balance_sheet">⚖️ الميزانية العمومية</div><div class="card report-link" data-report="account_ledger">📒 الأستاذ العام</div><div class="card report-link" data-report="customer_statement">👤 كشف حساب عميل</div><div class="card report-link" data-report="supplier_statement">🏭 كشف حساب مورد</div>`;
  document.getElementById('tab-content').innerHTML = html;
  document.querySelectorAll('.report-link').forEach(el => el.addEventListener('click', () => { const r = el.dataset.report; if (r==='trial_balance') loadTrialBalance(); else if (r==='income_statement') loadIncomeStatement(); else if (r==='balance_sheet') loadBalanceSheet(); else if (r==='account_ledger') loadAccountLedgerForm(); else if (r==='customer_statement') loadCustomerStatementForm(); else if (r==='supplier_statement') loadSupplierStatementForm(); }));
}
async function loadTrialBalance() {
  try {
    const data = await apiCall('/reports?type=trial_balance','GET');
    const rows = data.map(r => `<tr><td>${r.name}</td><td>${r.total_debit.toFixed(2)}</td><td>${r.total_credit.toFixed(2)}</td><td style="color:${r.balance>=0?'green':'red'}">${r.balance.toFixed(2)}</td></tr>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn-secondary" onclick="loadReports()">🔙 رجوع</button>
        <h3>ميزان المراجعة</h3>
        <div class="report-table-wrapper">
          <table class="report-table">
            <tr><th>الحساب</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr>
            ${rows}
          </table>
        </div>
      </div>`;
  } catch(e) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${e.message}</div>`; }
}
async function loadIncomeStatement() {
  try {
    const d = await apiCall('/reports?type=income_statement','GET');
    const iR = d.income.map(i => `<tr><td>${i.name}</td><td>${i.balance.toFixed(2)}</td></tr>`).join('');
    const eR = d.expenses.map(e => `<tr><td>${e.name}</td><td>${e.balance.toFixed(2)}</td></tr>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn-secondary" onclick="loadReports()">🔙 رجوع</button>
        <h3>قائمة الدخل</h3>
        <h4>الإيرادات</h4>
        <div class="report-table-wrapper">
          <table class="report-table">${iR}</table>
        </div>
        <strong>إجمالي الإيرادات: ${d.total_income.toFixed(2)}</strong>
        <h4>المصروفات</h4>
        <div class="report-table-wrapper">
          <table class="report-table">${eR}</table>
        </div>
        <strong>إجمالي المصروفات: ${d.total_expenses.toFixed(2)}</strong>
        <hr><h2>صافي الربح: ${d.net_profit.toFixed(2)}</h2>
      </div>`;
  } catch(e) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${e.message}</div>`; }
}
async function loadBalanceSheet() {
  try {
    const d = await apiCall('/reports?type=balance_sheet','GET');
    const aR = d.assets.map(a => `<tr><td>${a.name}</td><td>${a.balance.toFixed(2)}</td></tr>`).join('');
    const lR = d.liabilities.map(l => `<tr><td>${l.name}</td><td>${l.balance.toFixed(2)}</td></tr>`).join('');
    const eR = d.equity.map(e => `<tr><td>${e.name}</td><td>${e.balance.toFixed(2)}</td></tr>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn-secondary" onclick="loadReports()">🔙 رجوع</button>
        <h3>الميزانية العمومية</h3>
        <h4>الأصول</h4>
        <div class="report-table-wrapper">
          <table class="report-table">${aR}</table>
        </div>
        <strong>إجمالي الأصول: ${d.total_assets.toFixed(2)}</strong>
        <h4>الخصوم</h4>
        <div class="report-table-wrapper">
          <table class="report-table">${lR}</table>
        </div>
        <strong>إجمالي الخصوم: ${d.total_liabilities.toFixed(2)}</strong>
        <h4>حقوق الملكية</h4>
        <div class="report-table-wrapper">
          <table class="report-table">${eR}</table>
        </div>
        <strong>إجمالي حقوق الملكية: ${d.total_equity.toFixed(2)}</strong>
      </div>`;
  } catch(e) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${e.message}</div>`; }
}
async function loadAccountLedgerForm() {
  try {
    const accounts = await apiCall('/accounts','GET');
    const opts = accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn-secondary" onclick="loadReports()">🔙 رجوع</button>
        <h3>الأستاذ العام</h3>
        <select id="ledger-account" class="input-field">${opts}</select>
        <button id="btn-ledger" class="btn-primary">عرض الحركات</button>
        <div id="ledger-result" style="margin-top:15px"></div>
      </div>`;
    document.getElementById('btn-ledger').addEventListener('click', async () => {
      const id = document.getElementById('ledger-account').value; if (!id) return;
      try {
        const lines = await apiCall(`/reports?type=account_ledger&account_id=${id}`,'GET');
        let html = '<div class="report-table-wrapper"><table class="report-table"><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr>';
        lines.forEach(l => html += `<tr><td>${l.date||''}</td><td>${l.description||''}</td><td>${(l.debit||0).toFixed(2)}</td><td>${(l.credit||0).toFixed(2)}</td><td style="font-weight:bold;color:${l.balance>=0?'green':'red'}">${(l.balance||0).toFixed(2)}</td></tr>`);
        html += '</table></div>';
        document.getElementById('ledger-result').innerHTML = html;
      } catch(e) { document.getElementById('ledger-result').innerHTML = `<div style="color:red">⚠️ ${e.message}</div>`; }
    });
  } catch(e) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${e.message}</div>`; }
}
async function loadCustomerStatementForm() {
  try {
    const custs = await apiCall('/customers','GET');
    const opts = custs.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn-secondary" onclick="loadReports()">🔙 رجوع</button>
        <h3>كشف حساب عميل</h3>
        <select id="stmt-cust" class="input-field">${opts}</select>
        <button id="btn-stmt-cust" class="btn-primary">عرض الكشف</button>
        <div id="stmt-result"></div>
      </div>`;
    document.getElementById('btn-stmt-cust').addEventListener('click', async () => {
      const id = document.getElementById('stmt-cust').value; if (!id) return;
      try {
        const lines = await apiCall(`/reports?type=customer_statement&customer_id=${id}`,'GET');
        let html = '<div class="report-table-wrapper"><table class="report-table"><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr>';
        lines.forEach(l => html += `<tr><td>${l.date||''}</td><td>${l.description||''}</td><td>${(l.debit||0).toFixed(2)}</td><td>${(l.credit||0).toFixed(2)}</td><td style="font-weight:bold;color:${l.balance>=0?'green':'red'}">${(l.balance||0).toFixed(2)}</td></tr>`);
        html += '</table></div>';
        document.getElementById('stmt-result').innerHTML = html;
      } catch(e) { document.getElementById('stmt-result').innerHTML = `<div style="color:red">⚠️ ${e.message}</div>`; }
    });
  } catch(e) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${e.message}</div>`; }
}
async function loadSupplierStatementForm() {
  try {
    const supps = await apiCall('/suppliers','GET');
    const opts = supps.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn-secondary" onclick="loadReports()">🔙 رجوع</button>
        <h3>كشف حساب مورد</h3>
        <select id="stmt-supp" class="input-field">${opts}</select>
        <button id="btn-stmt-supp" class="btn-primary">عرض الكشف</button>
        <div id="stmt-result"></div>
      </div>`;
    document.getElementById('btn-stmt-supp').addEventListener('click', async () => {
      const id = document.getElementById('stmt-supp').value; if (!id) return;
      try {
        const lines = await apiCall(`/reports?type=supplier_statement&supplier_id=${id}`,'GET');
        let html = '<div class="report-table-wrapper"><table class="report-table"><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr>';
        lines.forEach(l => html += `<tr><td>${l.date||''}</td><td>${l.description||''}</td><td>${(l.debit||0).toFixed(2)}</td><td>${(l.credit||0).toFixed(2)}</td><td style="font-weight:bold;color:${l.balance>=0?'green':'red'}">${(l.balance||0).toFixed(2)}</td></tr>`);
        html += '</table></div>';
        document.getElementById('stmt-result').innerHTML = html;
      } catch(e) { document.getElementById('stmt-result').innerHTML = `<div style="color:red">⚠️ ${e.message}</div>`; }
    });
  } catch(e) { document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${e.message}</div>`; }
}
(function enableTabDragAndDrop() { const nav = document.querySelector('nav'); if (!nav) return; let dragged = null; function save() { const tabs = Array.from(nav.querySelectorAll('.tab')); localStorage.setItem('tabOrder', JSON.stringify(tabs.map(t => t.dataset.tab))); } function apply() { const saved = JSON.parse(localStorage.getItem('tabOrder')); if (!saved) return; const tabs = Array.from(nav.querySelectorAll('.tab')); const map = {}; tabs.forEach(t => map[t.dataset.tab] = t); saved.forEach(k => { if (map[k]) nav.appendChild(map[k]); }); } if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', apply); else apply(); nav.addEventListener('dragstart', e => { dragged = e.target.closest('.tab'); if (dragged) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain',''); dragged.style.opacity = '0.5'; } }); nav.addEventListener('dragend', () => { if (dragged) { dragged.style.opacity = '1'; dragged = null; } }); nav.addEventListener('dragover', e => e.preventDefault()); nav.addEventListener('drop', e => { e.preventDefault(); const target = e.target.closest('.tab'); if (!target || !dragged || target===dragged) return; const tabs = Array.from(nav.querySelectorAll('.tab')); if (tabs.indexOf(dragged) < tabs.indexOf(target)) nav.insertBefore(dragged, target.nextSibling); else nav.insertBefore(dragged, target); save(); }); nav.addEventListener('touchstart', e => { dragged = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY)?.closest('.tab'); if (dragged) dragged.style.opacity = '0.5'; }, {passive:true}); nav.addEventListener('touchmove', e => { if (!dragged) return; e.preventDefault(); const target = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY)?.closest('.tab'); if (target && target!==dragged) { const tabs = Array.from(nav.querySelectorAll('.tab')); if (tabs.indexOf(dragged) < tabs.indexOf(target)) nav.insertBefore(dragged, target.nextSibling); else nav.insertBefore(dragged, target); } }, {passive:false}); nav.addEventListener('touchend', () => { if (dragged) { dragged.style.opacity = '1'; save(); dragged = null; } }); })();
document.addEventListener('click', e => { if (e.target.classList.contains('tab')) { document.querySelectorAll('.tab').forEach(t => t.classList.remove('active')); e.target.classList.add('active'); const tab = e.target.dataset.tab; if (tab==='dashboard') loadDashboard(); else if (tab==='items') loadItems(); else if (tab==='sale-invoice') loadSaleInvoiceForm(); else if (tab==='purchase-invoice') loadPurchaseInvoiceForm(); else if (tab==='customers') loadCustomers(); else if (tab==='suppliers') loadSuppliers(); else if (tab==='categories') loadCategories(); else if (tab==='payments') loadPayments(); else if (tab==='invoices') loadInvoices(); else if (tab==='reports') loadReports(); } });
async function verifyUser() { try { const data = await apiCall('/verify','POST'); if (data.verified) { document.getElementById('user-name').textContent = user.first_name; document.getElementById('loading').style.display = 'none'; document.getElementById('main').style.display = 'block'; loadDashboard(); } else showError(data.error || 'غير مصرح لك'); } catch (err) { showError(err.message); } }
verifyUser();
