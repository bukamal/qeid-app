export function enhanceSearchSelects(root) {
  root.querySelectorAll('select.item-select, #inv-entity').forEach(select => {
    if (select.dataset.searchEnhanced) return;
    select.dataset.searchEnhanced = '1';

    const wrap = document.createElement('div');
    wrap.className = 'search-select-wrap';
    const input = document.createElement('input');
    input.className = 'input search-select-input';
    input.placeholder = select.id === 'inv-entity' ? 'ابحث عن العميل / المورد...' : 'ابحث عن الصنف...';
    const list = document.createElement('div');
    list.className = 'search-select-results';

    select.style.display = 'none';
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(input);
    wrap.appendChild(list);
    wrap.appendChild(select);

    function render(q='') {
      list.innerHTML = '';
      const opts = [...select.options].filter(o => o.textContent.includes(q));
      opts.slice(0,20).forEach(o => {
        if (!o.value) return;
        const row = document.createElement('div');
        row.className = 'search-select-option';
        row.textContent = o.textContent;
        row.onclick = () => {
          select.value = o.value;
          input.value = o.textContent;
          select.dispatchEvent(new Event('change', {bubbles:true}));
          list.innerHTML='';
        };
        list.appendChild(row);
      });
    }

    input.addEventListener('input', ()=>render(input.value));
    input.addEventListener('focus', ()=>render(input.value));
    document.addEventListener('click', e=>{
      if(!wrap.contains(e.target)) list.innerHTML='';
    });

    const current = select.selectedOptions[0];
    if(current && current.value) input.value=current.textContent;
  });
}


// Phase UX-2: remote search ready. Endpoints accept ?q= query.
