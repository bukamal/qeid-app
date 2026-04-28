const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// الوضع الليلي
if (tg.colorScheme === 'dark') {
  document.body.classList.add('dark');
}
tg.onEvent('themeChanged', () => {
  document.body.classList.toggle('dark', tg.colorScheme === 'dark');
});

const initData = tg.initData;
const user = tg.initDataUnsafe?.user;

const apiBase = '/api';

async function apiCall(endpoint, method = 'GET', body = {}) {
  body.initData = initData; // إرسال بيانات تيليجرام مع كل طلب للتحقق
  const res = await fetch(apiBase + endpoint, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method !== 'GET' ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error('API error');
  return res.json();
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
      document.getElementById('loading').textContent = 'فشل التحقق';
    }
  } catch (err) {
    document.getElementById('loading').textContent = 'خطأ في الاتصال';
  }
}

async function loadDashboard() {
  try {
    const entries = await apiCall('/entries');
    document.getElementById('tab-content').innerHTML =
      `<div class="card">عدد القيود: ${entries.length}</div>`;
  } catch (err) {
    document.getElementById('tab-content').innerHTML =
      '<div class="card">تعذر تحميل البيانات</div>';
  }
}

async function loadJournal() {
  try {
    const entries = await apiCall('/entries');
    let html = entries.map(e => `
      <div class="card">
        <strong>${e.reference || 'بدون رقم'}</strong> - ${e.date} - ${e.description}
      </div>
    `).join('');
    document.getElementById('tab-content').innerHTML = html || '<div class="card">لا توجد قيود</div>';
  } catch (err) {
    document.getElementById('tab-content').innerHTML = '<div class="card">خطأ في تحميل القيود</div>';
  }
}

// التنقل بين التبويبات
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('tab')) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    const tab = e.target.dataset.tab;
    if (tab === 'dashboard') loadDashboard();
    else if (tab === 'journal') loadJournal();
  }
});

verifyUser();
