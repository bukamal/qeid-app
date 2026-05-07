import { apiCall, formatNumber } from './core.js';
import { showToast } from './modal.js';

export async function loadDashboard() {
  try {
    const data = await apiCall('/summary', 'GET');
    let html = `<div class="stats-grid">
      <div class="stat-card profit"><div class="stat-label">صافي الربح</div><div class="stat-value ${data.net_profit>=0?'positive':'negative'}" style="font-size:24px;">${formatNumber(data.net_profit)}</div>${data.net_profit>=0?'<div class="stat-trend up">↑ ربح</div>':'<div class="stat-trend down">↓ خسارة</div>'}</div>
      <div class="stat-card cash"><div class="stat-label">رصيد الصندوق</div><div class="stat-value ${data.cash_balance>=0?'positive':'negative'}">${formatNumber(data.cash_balance)}</div></div>
      <div class="stat-card receivables"><div class="stat-label">الذمم المدينة</div><div class="stat-value">${formatNumber(data.receivables)}</div></div>
      <div class="stat-card payables"><div class="stat-label">الذمم الدائنة</div><div class="stat-value">${formatNumber(data.payables)}</div></div>
    </div><div class="chart-card"><div class="chart-title">المبيعات vs المشتريات</div><canvas id="incomeChart"></canvas></div>`;
    if (data.monthly) html += `<div class="chart-card"><div class="chart-title">الحركات المالية الشهرية</div><canvas id="paymentsChart"></canvas></div>`;
    if (data.daily?.dates.length) html += `<div class="chart-card"><div class="chart-title">الربح اليومي (آخر 30 يوم)</div><canvas id="profitChart"></canvas></div>`;
    document.getElementById('tab-content').innerHTML = html;

    // رسم المخططات
    new Chart(document.getElementById('incomeChart'), {
      type: 'doughnut',
      data: {
        labels: ['مبيعات', 'مشتريات'],
        datasets: [{ data: [data.total_sales, data.total_purchases], backgroundColor: ['#10b981', '#f59e0b'], borderWidth: 0, hoverOffset: 4 }]
      },
      options: { responsive: true, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { font: { family: 'Tajawal' } } } } }
    });

    if (data.monthly) {
      new Chart(document.getElementById('paymentsChart'), {
        type: 'bar',
        data: {
          labels: data.monthly.labels,
          datasets: [
            { label: 'وارد', data: data.monthly.payments_in, backgroundColor: '#4f46e5', borderRadius: 6 },
            { label: 'منصرف', data: data.monthly.payments_out, backgroundColor: '#ef4444', borderRadius: 6 }
          ]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } }, plugins: { legend: { labels: { font: { family: 'Tajawal' } } } } }
      });
    }

    if (data.daily?.dates.length) {
      new Chart(document.getElementById('profitChart'), {
        type: 'line',
        data: {
          labels: data.daily.dates.slice(-30),
          datasets: [{ label: 'صافي الربح', data: data.daily.profits.slice(-30), borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)', tension: 0.3, fill: true, pointRadius: 3, pointHoverRadius: 5 }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } }, plugins: { legend: { labels: { font: { family: 'Tajawal' } } } } }
      });
    }
  } catch (err) { showToast(err.message, 'error'); }
}
