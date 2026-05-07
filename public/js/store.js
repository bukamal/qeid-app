// public/js/store.js
// نظام إدارة حالة مركزي للتخزين المؤقت مع تبعيات ذكية ونظام اشتراك

const store = {
  data: {},
  listeners: {},  // { key: [callback1, callback2, ...] }
  
  dependencies: {
    customers:        ['invoices'],
    suppliers:        ['invoices'],
    items:            ['invoices'],
    units:            ['items', 'invoices'],
    categories:       ['items', 'invoices'],
    invoices:         ['payments', 'summary', 'customers', 'suppliers', 'items'],
    payments:         ['invoices', 'summary', 'customers', 'suppliers'],
    expenses:         ['summary'],
    summary:          [],
    reports:          [],
    accounts:         ['reports'],
    vouchers:         ['invoices', 'customers', 'suppliers', 'payments', 'expenses'],
    definitions_category: ['items', 'invoices'],
    definitions_unit: ['items', 'invoices']
  }
};

/**
 * إعلام المستمعين المسجلين على مفتاح بأن البيانات أبطلت
 */
function notifyListeners(key) {
  if (store.listeners[key]) {
    store.listeners[key].forEach(cb => {
      try { cb(); } catch (e) { console.error('Listener error:', e); }
    });
  }
}

/**
 * جلب البيانات الحالية من المتجر
 */
export function get(key) {
  return store.data[key];
}

/**
 * تخزين بيانات جديدة وإعلام المستمعين
 */
export function set(key, data) {
  store.data[key] = data;
  // إعلام المستمعين بأن بيانات جديدة وصلت (اختياري لفائدة أخرى)
}

/**
 * الاشتراك في تغييرات مفتاح معين (استدعاء عند الإبطال)
 * يعيد دالة unsubscribe لإلغاء الاشتراك
 */
export function subscribe(key, callback) {
  if (!store.listeners[key]) {
    store.listeners[key] = [];
  }
  store.listeners[key].push(callback);
  
  return () => {
    const arr = store.listeners[key];
    if (arr) {
      store.listeners[key] = arr.filter(cb => cb !== callback);
    }
  };
}

/**
 * إبطال مفتاح واحد داخلياً
 */
function invalidateKey(key) {
  if (!key) return;
  
  // إزالة البيانات المخزنة
  delete store.data[key];
  // إعلام المشتركين بأن هذا المفتاح أبطل
  notifyListeners(key);
  
  // إزالة أي مفاتيح تبدأ بـ key/ أو key_
  Object.keys(store.data).forEach(k => {
    if (k.startsWith(key + '/') || k.startsWith(key + '_')) {
      delete store.data[k];
      notifyListeners(k);
    }
  });
}

/**
 * إبطال مفتاح وكافة تبعياته المباشرة
 */
export function invalidate(key) {
  if (!key) return;
  
  // إبطال المفتاح الأساسي
  invalidateKey(key);
  
  // إبطال التبعيات
  const deps = store.dependencies[key] || [];
  const visited = new Set([key]);
  
  deps.forEach(dep => {
    if (!visited.has(dep)) {
      visited.add(dep);
      invalidateKey(dep);
    }
  });
}

/**
 * مسح كامل المتجر
 */
export function clearAll() {
  Object.keys(store.data).forEach(k => {
    delete store.data[k];
    notifyListeners(k);
  });
  store.listeners = {};
}
