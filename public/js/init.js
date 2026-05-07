// public/js/init.js
import { apiCall, user, ICONS } from './core.js';
import { initNavigation } from './navigation.js';
import { loadDashboard } from './dashboard.js';

async function verifyUser() {
  try {
    const data = await apiCall('/verify', 'POST');

    if (data.verified) {
      document.getElementById('user-name-sidebar').textContent = user?.first_name || 'مستخدم';
      document.getElementById('user-avatar').textContent = (user?.first_name?.[0] || 'م').toUpperCase();

      initNavigation();

      // جلب جميع البيانات الأولية بالتوازي (تخزينها تلقائي في store)
      await Promise.all([
        apiCall('/items', 'GET'),
        apiCall('/customers', 'GET'),
        apiCall('/suppliers', 'GET'),
        apiCall('/invoices', 'GET'),
        apiCall('/definitions?type=category', 'GET'),
        apiCall('/definitions?type=unit', 'GET')
      ]);

      document.getElementById('loading-screen').classList.add('hidden');
      loadDashboard();
    } else {
      document.getElementById('loading-screen').innerHTML = `
        <div style="color:var(--danger);font-size:18px;text-align:center;padding:20px;">
          ${ICONS.x}<br><br>${data.error || 'غير مصرح'}
        </div>`;
    }
  } catch (err) {
    document.getElementById('loading-screen').innerHTML = `
      <div style="color:var(--danger);font-size:18px;text-align:center;padding:20px;">
        ${ICONS.x}<br><br>${err.message}
      </div>`;
  }
}

verifyUser();
