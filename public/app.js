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

// لوحة التحكم
async function loadDashboard() {
  try {
    const entries = await apiCall('/entries', 'GET');
    const items = await apiCall('/items', 'GET');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">📊 عدد القيود: ${entries.length}</div>
      <div class="card">📦 عدد المواد: ${items.length}</div>
    `;
  } catch (err) {
    document.getElementById('tab-content').innerHTML = `<div class="card" style="color:red;">⚠️ ${err.message}</div>`;
  }
}

// عرض القيود (مع إظهار المادة إن وجدت)
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
          if (line.item) {
            detail += ` | المادة: ${line.item.name}`;
            if (line.quantity_change && line.quantity_change != 0) {
              detail += ` (${line.quantity_change > 0 ? '+' : ''}${line.quantity_change})`;
            }
          }
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

// --- نموذج إضافة قيد مع دعم المواد ---
let accountsCache = [];
let itemsCache = [];

async function loadAddEntryForm() {
  try {
    const [accounts, items] = await Promise.all([
      apiCall('/accounts', 'GET'),
      apiCall('/items', 'GET')
    ]);
    accountsCache = accounts;
    itemsCache = items;
    let accountOptions = accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    let itemOptions = '<option value="">بدون مادة</option>' + items.map(i => `<option value="${i.id}">${i.name} (المخزون: ${i.quantity})</option>`).join('');

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
            <input type="number" step="any" placeholder="الكمية (+ / -)" class="input-field qty-input" />
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
    const itemOptions = '<option value="">بدون مادة</option>' + itemsCache.map(i => `<option value="${i.id}">${i.name} (المخزون: ${i.quantity})</option>`).join('');
    const newLine = document.createElement('div');
    newLine.className = 'line-row';
    newLine.dataset.index = lineIndex++;
    newLine.innerHTML = `
      <select class="input-field account-select">${accountOptions}</select>
      <input type="number" step="0.01" placeholder="مدين" class="input-field debit-input" />
      <input type="number" step="0.01" placeholder="دائن" class="input-field credit-input" />
      <select class="input-field item-select">${itemOptions}</select>
      <input type="number" step="any" placeholder="الكمية (+ / -)" class="input-field qty-input" />
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
      if (!accountId || (debit === 0 && credit === 0 && qtyChange === 0)) return;
      lines.push({
        account_id: accountId,
        debit,
        credit,
        item_id: itemId,
        quantity_change: qtyChange
      });
      totalDebit += debit;
      totalCredit += credit;
    });

    if (lines.length < 2) return alert('أضف سطرين على الأقل');
    if (Math.abs(totalDebit - totalCredit) > 0.01) return alert('المبلغ المدين يجب أن يساوي المبلغ الدائن');

    try {
      await apiCall('/entries', 'POST', { date, description, reference, lines });
      alert('تم حفظ القيد بنجاح');
      // تحديث مخبأ المواد بعد التغيير لأنه قد تتغير الكميات
      itemsCache = await apiCall('/items', 'GET');
      // الانتقال إلى تبويب القيود
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

// المواد (نفس السابق)
async function loadItems() {
  try {
    const [items, categories] = await Promise.all([
      apiCall('/items', 'GET'),
      apiCall('/categories', 'GET')
    ]);
    itemsCache = items; // تحديث الكاش
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
      loadItems();
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
    else if (tab === 'add-entry') loadAddEntryForm();
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
      loadDashboard();
    } else {
      throw new Error('فشل التحقق من الهوية');
    }
  } catch (err) {
    showError(err.message);
  }
}

verifyUser();
