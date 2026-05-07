import {
  apiCall, user, ICONS,
  setItemsCache, setCustomersCache, setSuppliersCache,
  setInvoicesCache, setCategoriesCache, setUnitsCache
} from './core.js';
import { initNavigation } from './navigation.js';
import { loadDashboard } from './dashboard.js';

/**
 * التحقق من هوية المستخدم وتهيئة التطبيق
 */
async function verifyUser() {
  try {
    const data = await apiCall('/verify', 'POST');

    if (data.verified) {
      // تعيين معلومات المستخدم في الشريط الجانبي
      document.getElementById('user-name-sidebar').textContent = user?.first_name || 'مستخدم';
      document.getElementById('user-avatar').textContent = (user?.first_name?.[0] || 'م').toUpperCase();

      // تهيئة قوائم التنقل
      initNavigation();

      // تحميل جميع البيانات الأولية بشكل متوازٍ
      const [
        items,
        customers,
        suppliers,
        invoices,
        categories,
        units
      ] = await Promise.all([
        apiCall('/items', 'GET'),
        apiCall('/customers', 'GET'),
        apiCall('/suppliers', 'GET'),
        apiCall('/invoices', 'GET'),
        apiCall('/definitions?type=category', 'GET'),
        apiCall('/definitions?type=unit', 'GET')
      ]);

      // تخزين البيانات في الذاكرة المؤقتة
      setItemsCache(items);
      setCustomersCache(customers);
      setSuppliersCache(suppliers);
      setInvoicesCache(invoices);
      setCategoriesCache(categories);
      setUnitsCache(units);

      // إخفاء شاشة التحميل وعرض لوحة التحكم
      document.getElementById('loading-screen').classList.add('hidden');
      loadDashboard();
    } else {
      // عرض رسالة خطأ إذا لم يتم التحقق
      document.getElementById('loading-screen').innerHTML = `
        <div style="color:var(--danger);font-size:18px;text-align:center;padding:20px;">
          ${ICONS.x}
          <br><br>
          ${data.error || 'غير مصرح'}
        </div>`;
    }
  } catch (err) {
    // عرض رسالة خطأ في حالة فشل الاتصال
    document.getElementById('loading-screen').innerHTML = `
      <div style="color:var(--danger);font-size:18px;text-align:center;padding:20px;">
        ${ICONS.x}
        <br><br>
        ${err.message}
      </div>`;
  }
}

// بدء عملية التحقق تلقائياً عند تحميل الملف
verifyUser();
