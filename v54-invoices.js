'use strict';
/* Invoice workspace: retain the original receipt renderer and action handlers. */
(()=>{
 const previousModal=modal;
 modal=function(...args){document.getElementById('modal')?.classList.remove('w54-invoice');return previousModal.apply(this,args)};
 const previousView=viewDoc;
 viewDoc=function(id){
  previousView(id);
  const d=find('docs',id),root=$('#modalBody');
  if(!d||!['sale','purchase','saleReturn','purchaseReturn'].includes(d.kind))return;
  $('#modal').classList.add('w54-invoice');
  const status=document.createElement('span');status.className='w54-status';
  status.textContent=d.reversed?'ملغاة':E.outstanding(S,d)>0?'مستحق':'مكتملة';$('#modal .modal-head').append(status);
  const row=root.querySelector('.file-actions');
  if(row){
   const section=document.createElement('section');section.className='w54-actions panel';
   section.innerHTML='<h3>إجراءات الفاتورة</h3><div class="w54-action-grid"></div><div class="w54-downloads"></div>';
   row.before(section);
   const specs=[['printdoc','طباعة / PDF','print'],['sharedoc','مشاركة النص','message'],['return','مرتجع','arrow'],['editinvoice','تعديل الفاتورة','edit'],['deleteinvoice','حذف الفاتورة','trash'],['reverse','عكس المستند','refresh'],['w28Image','تنزيل صورة PNG','download'],['w28Bluetooth','طباعة بلوتوث','print']];
   for(const b of [...row.querySelectorAll('button')]){
    const spec=specs.find(([k])=>b.dataset[k]!==undefined);
    if(spec){b.innerHTML=icon(spec[2])+'<span>'+spec[1]+'</span>';b.className='w54-action w54-'+spec[0];}
    section.querySelector(spec&&['w28Image','w28Bluetooth'].includes(spec[0])?'.w54-downloads':'.w54-action-grid').append(b);
   }row.remove();
  }
  const label=[...root.querySelectorAll('.section-label')].find(x=>x.textContent.includes('القيد المحاسبي'));
  if(label){const wrap=label.nextElementSibling,table=wrap?.querySelector('table');if(table){
   const debit=E.sum(d.entries,e=>e.debit||0),credit=E.sum(d.entries,e=>e.credit||0);
   const section=document.createElement('section');section.className='w54-journal panel';
   label.before(section);section.innerHTML='<div class="w54-journal-head"><h3>'+icon('accounts')+' القيد المحاسبي</h3><span>'+ (debit===credit?'متوازن':'غير متوازن')+'</span></div>';
   section.append(wrap);label.remove();
   const foot=document.createElement('tfoot');foot.innerHTML=`<tr><th>المجموع</th><td>${money(debit)}</td><td>${money(credit)}</td></tr>`;table.append(foot);
  }}
 };
 const m=modal;modal=function(...args){document.querySelectorAll('#modal .w54-status').forEach(x=>x.remove());return m.apply(this,args)};
 const previousReturn=returnDoc;
 returnDoc=function(id){previousReturn(id);const d=find('docs',id);if(!d)return;
  const all=document.createElement('button');all.type='button';all.className='w54-return-all';all.textContent='تحديد كامل الكمية المتاحة';
  $('#returnLines').before(all);all.onclick=()=>{
   for(const row of $$('#returnLines .return-row')){const i=Number(row.dataset.index),l=d.lines[i],p=find('products',l.product),used=E.sum(S.docs.filter(r=>r.original===id&&!r.reversed&&r.kind===(d.kind==='sale'?'saleReturn':'purchaseReturn')).flatMap(r=>r.lines).filter(r=>r.index===i),r=>r.baseQty);
    row.querySelector('select').value='0';row.querySelector('input').value=qnum(Math.max(0,l.baseQty-used));
   }$('#returnLines').dispatchEvent(new Event('input',{bubbles:true}));enhanceFields();
  };
 };
 const r=render;render=function(...args){const result=r.apply(this,args);document.querySelectorAll('[data-native-menu^="doc:"]').forEach(b=>{b.innerHTML='<span class="w54-dots" aria-hidden="true"><i></i><i></i><i></i></span>';b.setAttribute('aria-label','إجراءات الفاتورة');b.setAttribute('aria-haspopup','menu')});return result};
})();
