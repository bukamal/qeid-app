// public/js/init.js
import { apiCall, user, ICONS } from './core.js';
import { initNavigation } from './navigation.js';
import { loadDashboard } from './dashboard.js';

async function verifyUser() {
  try {
    const data = await apiCall('/verify', 'POST');

    if (data.verified) {
      // تعيين اسم المستخدم في الشريط الجانبي
      document.getElementById('user-name-sidebar').textContent = user?.first_name || 'مستخدم';
      document.getElementById('user-avatar').textContent = (user?.first_name?.[0] || 'م').toUpperCase();

      // بناء القوائم الجانبية والسفلية
      initNavigation();

      // 🟢 إخفاء شاشة التحميل فورًا بعد نجاح التحقق
      document.getElementById('loading-screen').classList.add('hidden');

      // 🟢 بدء تشغيل لوحة التحكم مباشرةً (ستظهر skeleton لحين وصول البيانات)
      loadDashboard();

      // جلب جميع البيانات الأولية الأخرى في الخلفية دون حظر التفاعل
      Promise.all([
        apiCall('/items', 'GET'),
        apiCall('/customers', 'GET'),
        apiCall('/suppliers', 'GET'),
        apiCall('/invoices', 'GET'),
        apiCall('/definitions?type=category', 'GET'),
        apiCall('/definitions?type=unit', 'GET')
      ]).catch(err => {
        console.warn('تعذّر جلب بعض البيانات الأولية في الخلفية:', err);
      });

    } else {
      // فشل التحقق – عرض رسالة خطأ داخل شاشة التحميل
      document.getElementById('loading-screen').innerHTML = `
        <div style="color:var(--danger);font-size:18px;text-align:center;padding:20px;">
          ${ICONS.x}<br><br>${data.error || 'غير مصرح'}
        </div>`;
    }
  } catch (err) {
    // خطأ في الاتصال أو استثناء غير متوقع
    document.getElementById('loading-screen').innerHTML = `
      <div style="color:var(--danger);font-size:18px;text-align:center;padding:20px;">
        ${ICONS.x}<br><br>${err.message}
      </div>`;
  }
}

verifyUser();
