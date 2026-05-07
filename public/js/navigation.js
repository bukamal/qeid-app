import { ICONS, unlockScroll } from './core.js';
import { loadDashboard } from './dashboard.js';
import { loadItems } from './items.js';
import { showInvoiceModal } from './invoices.js';
import { loadGenericSection, getSectionOptions, loadUnitsSection } from './sections.js';
import { loadPayments } from './payments.js';
import { loadExpenses } from './expenses.js';
import { loadInvoices } from './invoices.js';
import { loadReports } from './reports.js';

export const tabsConfig = {
  dashboard: { title: 'لوحة التحكم', subtitle: 'نظرة عامة على أداء عملك', icon: ICONS.home },
  items: { title: 'المواد', subtitle: 'إدارة المخزون والمنتجات', icon: ICONS.box },
  'sale-invoice': { title: 'فاتورة بيع', subtitle: 'إنشاء فاتورة مبيعات جديدة', icon: ICONS.cart },
  'purchase-invoice': { title: 'فاتورة شراء', subtitle: 'إنشاء فاتورة مشتريات جديدة', icon: ICONS.download },
  customers: { title: 'العملاء', subtitle: 'قائمة العملاء والذمم المدينة', icon: ICONS.users },
  suppliers: { title: 'الموردين', subtitle: 'قائمة الموردين والذمم الدائنة', icon: ICONS.factory },
  categories: { title: 'التصنيفات', subtitle: 'تصنيفات المواد', icon: ICONS.tag },
  units: { title: 'الوحدات', subtitle: 'إدارة وحدات القياس', icon: ICONS.scale },
  payments: { title: 'الدفعات', subtitle: 'سجل المقبوضات والمدفوعات', icon: ICONS.wallet },
  expenses: { title: 'المصاريف', subtitle: 'تتبع المصاريف التشغيلية', icon: ICONS.dollar },
  invoices: { title: 'الفواتير', subtitle: 'سجل الفواتير والحركات', icon: ICONS.fileText },
  reports: { title: 'التقارير', subtitle: 'التقارير المالية والإحصائيات', icon: ICONS.chart }
};

export function setActiveTab(tabName) {
  document.querySelectorAll('.nav-item, .bottom-item').forEach(el => el.classList.toggle('active', el.dataset.tab === tabName));
  const cfg = tabsConfig[tabName];
  document.getElementById('page-title').textContent = cfg?.title || '';
  document.getElementById('page-subtitle').textContent = cfg?.subtitle || '';
  document.getElementById('page-subtitle').style.display = cfg?.subtitle ? 'block' : 'none';
}

export function navigateTo(tabName) {
  setActiveTab(tabName);
  document.getElementById('more-menu').style.display = 'none';
  document.getElementById('sidebar').classList.remove('open');
  if (document.body.style.position === 'fixed') unlockScroll();

  const content = document.getElementById('tab-content');
  content.style.opacity = '0';
  content.style.transform = 'translateY(10px)';

  setTimeout(() => {
    switch (tabName) {
      case 'dashboard': loadDashboard(); break;
      case 'items': loadItems(); break;
      case 'sale-invoice': showInvoiceModal('sale'); break;
      case 'purchase-invoice': showInvoiceModal('purchase'); break;
      case 'customers': loadGenericSection(getSectionOptions('/customers')); break;
      case 'suppliers': loadGenericSection(getSectionOptions('/suppliers')); break;
      case 'categories': loadGenericSection(getSectionOptions('/definitions?type=category')); break;
      case 'units': loadUnitsSection(); break;
      case 'payments': loadPayments(); break;
      case 'expenses': loadExpenses(); break;
      case 'invoices': loadInvoices(); break;
      case 'reports': loadReports(); break;
      case 'more': showMoreMenu(); break;
    }
    requestAnimationFrame(() => {
      content.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
      content.style.opacity = '1';
      content.style.transform = 'translateY(0)';
    });
  }, 50);
}

function showMoreMenu() {
  document.getElementById('more-menu').style.display = 'flex';
  lockScroll();
}

export function initNavigation() {
  const sidebarNav = document.getElementById('sidebar-nav');
  const sheetGrid = document.getElementById('sheet-grid');
  const mainTabs = ['dashboard','items','sale-invoice','purchase-invoice','customers','suppliers','categories','units','payments','expenses','invoices','reports'];
  const moreTabs = ['purchase-invoice','customers','suppliers','categories','units','payments','expenses','reports'];

  mainTabs.forEach(key => {
    const cfg = tabsConfig[key];
    if (!cfg) return;
    const btn = document.createElement('button');
    btn.className = 'nav-item' + (key === 'dashboard' ? ' active' : '');
    btn.dataset.tab = key;
    btn.innerHTML = `${cfg.icon}<span>${cfg.title}</span>`;
    btn.onclick = () => navigateTo(key);
    sidebarNav.appendChild(btn);
  });

  moreTabs.forEach(key => {
    const cfg = tabsConfig[key];
    if (!cfg) return;
    const btn = document.createElement('button');
    btn.className = 'sheet-item';
    btn.dataset.tab = key;
    btn.innerHTML = `${cfg.icon}<span>${cfg.title}</span>`;
    btn.onclick = () => { unlockScroll(); navigateTo(key); };
    sheetGrid.appendChild(btn);
  });
}

// ربط الأحداث
document.getElementById('menu-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

const moreBackdrop = document.querySelector('.sheet-backdrop');
if (moreBackdrop) {
  moreBackdrop.addEventListener('click', () => {
    document.getElementById('more-menu').style.display = 'none';
    unlockScroll();
  });
}

document.querySelectorAll('.bottom-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    if (tabName === 'more') showMoreMenu();
    else if (tabName) navigateTo(tabName);
  });
});
