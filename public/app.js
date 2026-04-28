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
  // نضيف initData تلقائياً للتحقق الخادمي
  const finalBody = { ...body, initData };
  const res = await fetch(apiBase + endpoint, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method !== 'GET' ? JSON.stringify(finalBody) : undefined
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `خطأ ${res.status}`);
  }
  return json;
}

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

async function loadDashboard() {
  try {
    const entries = await apiCall('/entries');
    const count = entries.length;
    document.getElementById('tab-content').innerHTML =
      `<div class="card">📊 عدد القيود: ${count}</div>`;
  } catch (err) {
    document.getElementById('tab-content').innerHTML =
      `<div class="card" style="color:red;">⚠️ ${err.message}</div>`;
  }
}

async function loadJournal() {
  try {
    const entries = await apiCall('/entries');
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

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('tab')) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    if (e.target.dataset.tab === 'dashboard') loadDashboard();
    else if (e.target.dataset.tab === 'journal') loadJournal();
  }
});

verifyUser();
