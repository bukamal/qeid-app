const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

if (tg.colorScheme === 'dark') {
  document.body.classList.add('dark');
}
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
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
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

// عرض لوحة التحكم
async function loadDashboard() {
  try {
    const entries = await apiCall('/entries', 'GET');
    const items = await apiCall('/items', 'GET');
    const count = entries.length;
    const itemsCount = items.length;
    document.getElementById('tab-content').innerHTML = `
      <div class="card">📊 عدد القيود: ${count}</div>
      <div class="card">📦 عدد المواد: ${itemsCount}</div>
    `;
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`;
  }
}

// عرض القيود
async function loadJournal() {
  try {
    const entries = await apiCall('/entries', 'GET');
    const html = entries.map(e => `
      <div class="card">
        <strong>${e.reference || 'بدون رقم'}</strong> – ${e.date}<br>
        ${e.description || ''}
      </div>
    `).join('');
    document.getElementById('tab-content').innerHTML = html || '<div class="card">لا توجد قيود</div>';
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`;
  }
}

// --- قسم المواد ---
async function loadItems() {
  try {
    const [items, categories] = await Promise.all([
      apiCall('/items', 'GET'),
      apiCall('/categories', 'GET')
    ]);
    let html = `
      <div class="card" style="margin-bottom:20px;">
        <h2>المواد</h2>
        <button id="btn-add-item" class="btn-primary">+ إضافة مادة</button>
      </div>
    `;

    // نموذج إضافة مادة (مخفي افتراضياً)
    html += `
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

    // قائمة المواد
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
      // تحديث قائمة التصنيفات في النموذج
      const select = document.getElementById('item-category');
      const opt = document.createElement('option');
      opt.value = newCat.id;
      opt.textContent = newCat.name;
      select.appendChild(opt);
      select.value = newCat.id;
      document.getElementById('item-add-category').value = '';
    } catch (err) {
      alert('خطأ: ' + err.message);
    }
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
      loadItems(); // إعادة تحميل القائمة
    } catch (err) {
      alert('خطأ: ' + err.message);
    }
  });
}

// توجيه التبويبات
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('tab')) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    const tab = e.target.dataset.tab;
    if (tab === 'dashboard') loadDashboard();
    else if (tab === 'journal') loadJournal();
    else if (tab === 'items') loadItems();
  }
});

// بدء التطبيق
async function verifyUser() {
  try {
    const data = await apiCall('/verify', 'POST');
    if (data.verified) {
      document.getElementById('user-name').textContent = user.first_name;
      document.getElementById('loading').style.display = 'none';
      document.getElementById('main').style.display = 'block';
      loadDashboard(); // التحميل الافتراضي
    } else {
      throw new Error('فشل التحقق من الهوية');
    }
  } catch (err) {
    showError(err.message);
  }
}

verifyUser();
