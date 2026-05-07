// public/js/vouchers.js
import { apiCall, formatNumber, formatDate, ICONS } from './core.js';
import { showToast, confirmDialog, openModal } from './modal.js';
import { invalidate } from './store.js'; // <-- تمت إضافته لحل مشكلة عدم تحديث الفواتير

export async function loadVouchers() {
  try {
    const vouchers = await apiCall('/payments?voucher=1', 'GET');
    let html = `<div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">السندات</h3>
          <span class="card-subtitle">سندات القبض والصرف والمصاريف</span>
        </div>
        <button class="btn btn-primary btn-sm" id="btn-add-voucher">${ICONS.plus} إضافة سند</button>
      </div>
    </div>`;

    if (!vouchers.length) {
      html += emptyState('لا توجد سندات مسجلة', 'ابدأ بإضافة سند قبض أو صرف أو مصروف');
    } else {
      vouchers.forEach(v => {
        const typeLabel = v.type === 'receipt' ? 'قبض' : v.type === 'payment' ? 'صرف' : 'مصروف';
        const entityName = v.customer?.name || v.supplier?.name || '';
        const bgColor = v.type === 'receipt' ? 'var(--success)' : v.type === 'payment' ? 'var(--danger)' : 'var(--warning)';
        const sign = v.type === 'receipt' ? '+' : '-';

        html += `
          <div class="card" style="border-right:3px solid ${bgColor}; margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div style="flex:1;">
                <div style="font-weight:900;font-size:20px;color:${bgColor};">
                  ${sign} ${formatNumber(v.amount)}
                </div>
                <div style="font-size:13px;color:var(--text-muted);margin-top:2px;">
                  ${formatDate(v.date)} · ${typeLabel} ${entityName ? '· ' + entityName : ''}
                </div>
              </div>
              <button class="btn btn-ghost btn-sm" data-delete-voucher="${v.id}">${ICONS.trash}</button>
            </div>
            ${v.description ? `<div style="margin-top:10px;font-size:14px;color:var(--text-secondary);">${v.description}</div>` : ''}
            ${v.reference ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px;">المرجع: ${v.reference}</div>` : ''}
            ${v.invoice_id ? `<div style="font-size:12px;color:var(--primary);margin-top:4px;">مرتبط بفاتورة رقم: ${v.invoice_id}</div>` : ''}
          </div>`;
      });
    }

    document.getElementById('tab-content').innerHTML = html;

    document.getElementById('btn-add-voucher')?.addEventListener('click', showAddVoucherModal);
    document.querySelectorAll('[data-delete-voucher]').forEach(btn => {
      btn.addEventListener('click', () => deleteVoucher(btn.dataset.deleteVoucher));
    });

  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function showAddVoucherModal() {
  let customers = [];
  let suppliers = [];
  try {
    const [custData, suppData] = await Promise.all([
      apiCall('/customers', 'GET'),
      apiCall('/suppliers', 'GET')
    ]);
    customers = custData;
    suppliers = suppData;
  } catch (e) {
    showToast('فشل جلب بيانات العملاء والموردين', 'error');
    return;
  }

  const body = `
    <div class="form-group">
      <label class="form-label">نوع السند</label>
      <select class="select" id="v-type">
        <option value="receipt">سند قبض</option>
        <option value="payment">سند صرف</option>
        <option value="expense">سند مصروف</option>
      </select>
    </div>
    
    <div class="form-group" id="v-cust-group" style="display:none;">
      <label class="form-label">العميل (اختياري)</label>
      <select class="select" id="v-customer">
        <option value="">بدون عميل</option>
        ${customers.map(c => `<option value="${c.id}">${c.name} (${formatNumber(c.balance)})</option>`).join('')}
      </select>
    </div>
    
    <div class="form-group" id="v-supp-group" style="display:none;">
      <label class="form-label">المورد (اختياري)</label>
      <select class="select" id="v-supplier">
        <option value="">بدون مورد</option>
        ${suppliers.map(s => `<option value="${s.id}">${s.name} (${formatNumber(s.balance)})</option>`).join('')}
      </select>
    </div>
    
    <div class="form-group">
      <label class="form-label">المبلغ</label>
      <input type="number" step="0.01" class="input" id="v-amount" placeholder="0.00">
    </div>
    
    <div class="form-group">
      <label class="form-label">التاريخ</label>
      <input type="date" class="input" id="v-date" value="${new Date().toISOString().split('T')[0]}">
    </div>
    
    <div class="form-group">
      <label class="form-label">الوصف</label>
      <textarea class="textarea" id="v-desc" placeholder="تفاصيل السند..."></textarea>
    </div>
    
    <div class="form-group">
      <label class="form-label">الرقم المرجعي</label>
      <input type="text" class="input" id="v-ref" placeholder="رقم السند أو المرجع">
    </div>
    
    <div class="form-group">
      <label class="form-label">ربط بفاتورة (اختياري)</label>
      <input type="number" class="input" id="v-invoice" placeholder="معرف الفاتورة">
    </div>`;

  const modal = openModal({
    title: 'إضافة سند جديد',
    bodyHTML: body,
    footerHTML: `<button class="btn btn-secondary" id="v-cancel">إلغاء</button><button class="btn btn-primary" id="v-save">${ICONS.check} حفظ</button>`
  });

  const typeSel = modal.element.querySelector('#v-type');
  const custGroup = modal.element.querySelector('#v-cust-group');
  const suppGroup = modal.element.querySelector('#v-supp-group');

  typeSel.addEventListener('change', () => {
    const val = typeSel.value;
    custGroup.style.display = val === 'receipt' ? 'block' : 'none';
    suppGroup.style.display = val === 'payment' ? 'block' : 'none';
  });

  modal.element.querySelector('#v-cancel').onclick = () => modal.close();

  modal.element.querySelector('#v-save').onclick = async () => {
    const type = typeSel.value;
    const amount = parseFloat(modal.element.querySelector('#v-amount').value);
    if (!amount || amount <= 0) return showToast('المبلغ مطلوب', 'error');

    const payload = {
      type,
      amount,
      date: modal.element.querySelector('#v-date').value,
      description: modal.element.querySelector('#v-desc').value.trim(),
      reference: modal.element.querySelector('#v-ref').value.trim(),
      customer_id: type === 'receipt' ? (modal.element.querySelector('#v-customer').value || null) : null,
      supplier_id: type === 'payment' ? (modal.element.querySelector('#v-supplier').value || null) : null,
      invoice_id: modal.element.querySelector('#v-invoice').value || null,
      voucher: true
    };

    try {
      await apiCall('/payments?voucher=1', 'POST', payload);
      modal.close();
      showToast('تم حفظ السند بنجاح', 'success');
      loadVouchers();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };
}

async function deleteVoucher(id) {
  if (!await confirmDialog('هل أنت متأكد من حذف هذا السند؟ سيتم عكس أي تأثير على الأرصدة.')) return;
  try {
    await apiCall(`/payments?voucher=1&id=${id}`, 'DELETE');
    // إبطال المفاتيح المرتبطة لتحديث الفواتير والعملاء والموردين فوراً
    invalidate('invoices');
    invalidate('customers');
    invalidate('suppliers');
    showToast('تم الحذف بنجاح', 'success');
    loadVouchers();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function emptyState(title, subtitle) {
  return `<div class="empty-state">
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
    <h3>${title}</h3>
    <p>${subtitle}</p>
  </div>`;
}
