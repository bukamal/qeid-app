// public/js/store.js
// نظام إدارة حالة مركزي للتخزين المؤقت مع تبعيات ذكية

const store = {
  data: {},
  listeners: {},
  
  // خريطة التبعيات: عند إبطال مفتاح، يتم إبطال المفاتيح التابعة له تلقائياً
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
    definitions_category: ['items', 'invoices'],
    definitions_unit: ['items', 'invoices']
  }
};

/**
 * إعلام جميع المستمعين المسجلين على مفتاح معين
 */
function notify(key, data) {
  if (store.listeners[key]) {
    store.listeners[key].forEach(cb => cb(data));
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
  notify(key, data);
}

/**
 * الاشتراك في تغييرات مفتاح معين
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
 * إبطال مفتاح واحد (داخلياً)
 */
function invalidateKey(key) {
  if (!key) return;
  
  // إزالة المفتاح نفسه
  delete store.data[key];
  notify(key, undefined);
  
  // إزالة أي مفاتيح تبدأ بـ "key/" أو "key_"
  Object.keys(store.data).forEach(k => {
    if (k.startsWith(key + '/') || k.startsWith(key + '_')) {
      delete store.data[k];
      notify(k, undefined);
    }
  });
}

/**
 * إبطال مفتاح وكافة تبعياته المباشرة (مع منع التكرار)
 */
export function invalidate(key) {
  if (!key) return;
  
  // إبطال المفتاح الأساسي
  invalidateKey(key);
  
  // إبطال التبعيات (المستوى الأول فقط، لكن التبعيات نفسها قد تشمل تبعياتها
  // ولكن نظراً لأن الخريطة الحالية لا تحتاج تكراراً عميقاً، نكتفي بمستوى واحد.
  // مع ذلك نضمن عدم تكرار المفاتيح)
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
 * مسح كامل المتجر (نادر الاستخدام)
 */
export function clearAll() {
  Object.keys(store.data).forEach(k => delete store.data[k]);
  store.listeners = {};
}
