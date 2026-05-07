import { apiCall, formatNumber, formatDate, ICONS } from './core.js';
import { showToast } from './modal.js';

// ========== عرض قائمة التقارير ==========
export async function loadReports() {
  document.getElementById('tab-content').innerHTML = `
    <div class="card">
      <h3 class="card-title">التقارير المالية</h3>
      <p class="card-subtitle">اختر التقرير المطلوب لعرض التفاصيل</p>
    </div>
    <div class="report-card" data-report="trial_balance">
      <div class="report-icon">${ICONS.chart}</div>
      <div class="report-info"><h4>ميزان المراجعة</h4><p>نظرة شاملة على الحسابات</p></div>
    </div>
    <div class="report-card" data-report="income_statement">
      <div class="report-icon">${ICONS.chart}</div>
      <div class="report-info"><h4>قائمة الدخل</h4><p>الإيرادات والمصروفات والأرباح</p></div>
    </div>
    <div class="report-card" data-report="balance_sheet">
      <div class="report-icon">${ICONS.chart}</div>
      <div class="report-info"><h4>الميزانية العمومية</h4><p>الأصول والخصوم وحقوق الملكية</p></div>
    </div>
    <div class="report-card" data-report="account_ledger">
      <div class="report-icon">${ICONS.fileText}</div>
      <div class="report-info"><h4>الأستاذ العام</h4><p>كشف حساب تفصيلي</p></div>
    </div>
    <div class="report-card" data-report="customer_statement">
      <div class="report-icon">${ICONS.users}</div>
      <div class="report-info"><h4>كشف حساب عميل</h4><p>حركات عميل محدد</p></div>
    </div>
    <div class="report-card" data-report="supplier_statement">
      <div class="report-icon">${ICONS.factory}</div>
      <div class="report-info"><h4>كشف حساب مورد</h4><p>حركات مورد محدد</p></div>
    </div>`;

  document.querySelectorAll('.report-card').forEach(el => {
    el.addEventListener('click', () => {
      const r = el.dataset.report;
      if (r === 'trial_balance') loadTrialBalance();
      else if (r === 'income_statement') loadIncomeStatement();
      else if (r === 'balance_sheet') loadBalanceSheet();
      else if (r === 'account_ledger') loadAccountLedgerForm();
      else if (r === 'customer_statement') loadCustomerStatementForm();
      else if (r === 'supplier_statement') loadSupplierStatementForm();
    });
  });
}

// ========== ميزان المراجعة ==========
export async function loadTrialBalance() {
  try {
    const data = await apiCall('/reports?type=trial_balance', 'GET');
    const rows = data.map(r => `<tr>
      <td style="font-weight:700;">${r.name}</td>
      <td>${formatNumber(r.total_debit)}</td>
      <td>${formatNumber(r.total_credit)}</td>
      <td class="${r.balance>=0?'text-success':'text-danger'}" style="font-weight:800;">${formatNumber(r.balance)}</td>
    </tr>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn btn-secondary btn-sm" onclick="window.loadReports()" style="width:auto;margin-bottom:12px;">🔙 رجوع</button>
        <h3 class="card-title">ميزان المراجعة</h3>
        <div class="table-wrap"><table class="table"><thead><tr><th>الحساب</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>${rows}</tbody></table></div>
      </div>`;
  } catch (e) { showToast(e.message, 'error'); }
}

// ========== قائمة الدخل ==========
export async function loadIncomeStatement() {
  try {
    const d = await apiCall('/reports?type=income_statement', 'GET');
    const iRows = d.income.map(i => `<tr><td>${i.name}</td><td style="font-weight:700;color:var(--success);">${formatNumber(i.balance)}</td></tr>`).join('');
    const eRows = d.expenses.map(e => `<tr><td>${e.name}</td><td style="font-weight:700;color:var(--danger);">${formatNumber(e.balance)}</td></tr>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn btn-secondary btn-sm" onclick="window.loadReports()" style="width:auto;margin-bottom:12px;">🔙 رجوع</button>
        <h3 class="card-title">قائمة الدخل</h3>
        <h4>الإيرادات</h4>
        <div class="table-wrap"><table class="table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${iRows}</tbody></table></div>
        <p style="font-weight:800;text-align:left;">إجمالي الإيرادات: <span style="color:var(--success);">${formatNumber(d.total_income)}</span></p>
        <h4>المصروفات</h4>
        <div class="table-wrap"><table class="table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${eRows}</tbody></table></div>
        <p style="font-weight:800;text-align:left;">إجمالي المصروفات: <span style="color:var(--danger);">${formatNumber(d.total_expenses)}</span></p>
        <hr>
        <h2 style="color:${d.net_profit>=0?'var(--success)':'var(--danger)'};font-size:24px;font-weight:900;text-align:center;">صافي الربح: ${formatNumber(d.net_profit)}</h2>
      </div>`;
  } catch (e) { showToast(e.message, 'error'); }
}

// ========== الميزانية العمومية ==========
export async function loadBalanceSheet() {
  try {
    const d = await apiCall('/reports?type=balance_sheet', 'GET');
    const aRows = d.assets.map(a => `<tr><td>${a.name}</td><td style="font-weight:700;">${formatNumber(a.balance)}</td></tr>`).join('');
    const lRows = d.liabilities.map(l => `<tr><td>${l.name}</td><td style="font-weight:700;">${formatNumber(l.balance)}</td></tr>`).join('');
    const eRows = d.equity.map(e => `<tr><td>${e.name}</td><td style="font-weight:700;">${formatNumber(e.balance)}</td></tr>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn btn-secondary btn-sm" onclick="window.loadReports()" style="width:auto;margin-bottom:12px;">🔙 رجوع</button>
        <h3 class="card-title">الميزانية العمومية</h3>
        <h4>الأصول</h4>
        <div class="table-wrap"><table class="table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${aRows}</tbody></table></div>
        <p style="font-weight:800;text-align:left;">إجمالي الأصول: ${formatNumber(d.total_assets)}</p>
        <h4>الخصوم</h4>
        <div class="table-wrap"><table class="table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${lRows}</tbody></table></div>
        <p style="font-weight:800;text-align:left;">إجمالي الخصوم: ${formatNumber(d.total_liabilities)}</p>
        <h4>حقوق الملكية</h4>
        <div class="table-wrap"><table class="table"><thead><tr><th>الحساب</th><th>الرصيد</th></tr></thead><tbody>${eRows}</tbody></table></div>
        <p style="font-weight:800;text-align:left;">إجمالي حقوق الملكية: ${formatNumber(d.total_equity)}</p>
      </div>`;
  } catch (e) { showToast(e.message, 'error'); }
}

// ========== الأستاذ العام ==========
export async function loadAccountLedgerForm() {
  try {
    const accounts = await apiCall('/accounts', 'GET');
    const opts = accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn btn-secondary btn-sm" onclick="window.loadReports()" style="width:auto;margin-bottom:12px;">🔙 رجوع</button>
        <h3 class="card-title">الأستاذ العام</h3>
        <div class="form-group"><select class="select" id="ledger-account">${opts}</select></div>
        <button class="btn btn-primary" id="btn-ledger" style="width:auto;">عرض الحركات</button>
        <div id="ledger-result" style="margin-top:16px"></div>
      </div>`;
    document.getElementById('btn-ledger').addEventListener('click', async () => {
      const id = document.getElementById('ledger-account').value;
      if (!id) return;
      try {
        const lines = await apiCall(`/reports?type=account_ledger&account_id=${id}`, 'GET');
        let html = '<div class="table-wrap"><table class="table"><thead><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>';
        lines.forEach(l => html += `<tr>
          <td>${formatDate(l.date)}</td>
          <td>${l.description||''}</td>
          <td style="color:var(--success);font-weight:700;">${formatNumber(l.debit)}</td>
          <td style="color:var(--danger);font-weight:700;">${formatNumber(l.credit)}</td>
          <td class="${(l.balance||0)>=0?'text-success':'text-danger'}" style="font-weight:800;">${formatNumber(l.balance)}</td>
        </tr>`);
        html += '</tbody></table></div>';
        document.getElementById('ledger-result').innerHTML = html;
      } catch (e) { showToast(e.message, 'error'); }
    });
  } catch (e) { showToast(e.message, 'error'); }
}

// ========== كشف حساب عميل ==========
export async function loadCustomerStatementForm() {
  try {
    const custs = await apiCall('/customers', 'GET');
    const opts = custs.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn btn-secondary btn-sm" onclick="window.loadReports()" style="width:auto;margin-bottom:12px;">🔙 رجوع</button>
        <h3 class="card-title">كشف حساب عميل</h3>
        <div class="form-group"><select class="select" id="stmt-cust">${opts}</select></div>
        <button class="btn btn-primary" id="btn-stmt-cust" style="width:auto;">عرض الكشف</button>
        <div id="stmt-result" style="margin-top:16px"></div>
      </div>`;
    document.getElementById('btn-stmt-cust').addEventListener('click', async () => {
      const id = document.getElementById('stmt-cust').value;
      if (!id) return;
      try {
        const lines = await apiCall(`/reports?type=customer_statement&customer_id=${id}`, 'GET');
        let html = '<div class="table-wrap"><table class="table"><thead><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>';
        lines.forEach(l => html += `<tr>
          <td>${formatDate(l.date)}</td>
          <td>${l.description||''}</td>
          <td style="color:var(--success);font-weight:700;">${formatNumber(l.debit)}</td>
          <td style="color:var(--danger);font-weight:700;">${formatNumber(l.credit)}</td>
          <td class="${(l.balance||0)>=0?'text-success':'text-danger'}" style="font-weight:800;">${formatNumber(l.balance)}</td>
        </tr>`);
        html += '</tbody></table></div>';
        document.getElementById('stmt-result').innerHTML = html;
      } catch (e) { showToast(e.message, 'error'); }
    });
  } catch (e) { showToast(e.message, 'error'); }
}

// ========== كشف حساب مورد ==========
export async function loadSupplierStatementForm() {
  try {
    const supps = await apiCall('/suppliers', 'GET');
    const opts = supps.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    document.getElementById('tab-content').innerHTML = `
      <div class="card">
        <button class="btn btn-secondary btn-sm" onclick="window.loadReports()" style="width:auto;margin-bottom:12px;">🔙 رجوع</button>
        <h3 class="card-title">كشف حساب مورد</h3>
        <div class="form-group"><select class="select" id="stmt-supp">${opts}</select></div>
        <button class="btn btn-primary" id="btn-stmt-supp" style="width:auto;">عرض الكشف</button>
        <div id="stmt-result" style="margin-top:16px"></div>
      </div>`;
    document.getElementById('btn-stmt-supp').addEventListener('click', async () => {
      const id = document.getElementById('stmt-supp').value;
      if (!id) return;
      try {
        const lines = await apiCall(`/reports?type=supplier_statement&supplier_id=${id}`, 'GET');
        let html = '<div class="table-wrap"><table class="table"><thead><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>';
        lines.forEach(l => html += `<tr>
          <td>${formatDate(l.date)}</td>
          <td>${l.description||''}</td>
          <td style="color:var(--success);font-weight:700;">${formatNumber(l.debit)}</td>
          <td style="color:var(--danger);font-weight:700;">${formatNumber(l.credit)}</td>
          <td class="${(l.balance||0)>=0?'text-success':'text-danger'}" style="font-weight:800;">${formatNumber(l.balance)}</td>
        </tr>`);
        html += '</tbody></table></div>';
        document.getElementById('stmt-result').innerHTML = html;
      } catch (e) { showToast(e.message, 'error'); }
    });
  } catch (e) { showToast(e.message, 'error'); }
}

// تعريض دالة loadReports للوصول من أزرار الرجوع
window.loadReports = loadReports;
