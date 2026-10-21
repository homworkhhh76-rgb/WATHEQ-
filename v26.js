'use strict';
paths.refresh='M20 7v5h-5 M4 17v-5h5 M6 7a7 7 0 0 1 12-1l2 6 M4 12l2 6a7 7 0 0 0 12-1';
// Fixed controls live outside animated page containers.
function w26Decorate(){
 $('#w26Floating')?.remove();const floats=document.createElement('div');floats.id='w26Floating';document.body.append(floats);
 document.querySelectorAll('#content .w24-add-product').forEach(b=>floats.append(b));
 if(route==='pos'){
  floats.innerHTML='<button type="button" class="primary w26-scan" data-action="camera">'+icon('barcode')+' مسح الباركود</button>';
  document.querySelectorAll('.cart,.review-panel').forEach(panel=>{const pay=panel.querySelector('[data-action=checkout],[data-native-pane=payment]');if(!pay)return;const bar=document.createElement('div');bar.className='w26-paybar';pay.before(bar);bar.append(pay);for(const [action,label,ic] of [['suspend','تعليق الفاتورة','pause'],['clearCart','تفريغ الفاتورة','trash']]){let b=panel.querySelector(`[data-action=${action}]`);if(!b){b=document.createElement('button');b.type='button';b.dataset.action=action}b.innerHTML=action==='suspend'?'<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="4"/></svg>':icon(ic);b.title=label;b.setAttribute('aria-label',label);bar.append(b)}});
  const list=$('.cart-list');if(list)w26OrderControl(list);
 }
 document.querySelectorAll('[data-w25-refresh]').forEach(b=>{b.innerHTML=icon('refresh')+'<span>تحديث القائمة</span>';b.onclick=async e=>{e.stopPropagation();b.disabled=true;try{const result=await Store.read();S=result.state||result;render()}catch(err){error(err)}finally{b.disabled=false}}});
 document.querySelectorAll('#content .panel,#content .stat,#content .native-chart,#content .quick-grid>*,#content .kpi,#content .product-list-card,#content .document-card,#content .w25-party-card,#content .product,#content .more-group').forEach((el,i)=>{el.classList.add('w26-enter');el.style.setProperty('--w26-delay',Math.min(i,7)*35+'ms')});
}
function w26OrderControl(list){if(list.previousElementSibling?.classList.contains('w26-order'))return;const b=document.createElement('button');b.type='button';b.className='w26-order';let reverse=session.getItem('invoiceReverse')==='1';const apply=()=>{list.classList.toggle('w26-reverse',reverse);b.textContent=reverse?'↑ ترتيب البنود: من أسفل لأعلى':'↓ ترتيب البنود: من أعلى لأسفل'};b.onclick=()=>{reverse=!reverse;session.setItem('invoiceReverse',reverse?'1':'0');apply()};list.before(b);apply()}
const w26Render=render;render=function(){w26Render();if(S)w26Decorate()};
// Empty optional relationships are retained only when they mean no parent or no filter.
function w26Defaults(){if(/تصفية|فلتر/.test($('#modalTitle').textContent))return;document.querySelectorAll('#modalBody select').forEach(s=>{if(s.value||s.name==='variantOf'||s.name==='taxRateId'||s.closest('.filter-form')||s.dataset.w26Default)return;const option=[...s.options].find(o=>o.value&&!o.disabled);if(!option)return;s.dataset.w26Default='1';s.value=option.value;s.dispatchEvent(new Event('change',{bubbles:true}))});enhanceFields()}
const w26Modal=modal;modal=function(...args){const result=w26Modal(...args);queueMicrotask(()=>{if($('#modal').open)w26Defaults()});return result};
const w26Edit=editEntity;editEntity=function(t,id){w26Edit(t,id);if(t==='parties'||t==='customerGroups'){for(const n of ['priceGroup','group'])$('#modalBody [name='+n+']')?.closest('label')?.remove();const cap=$('#modalBody [name=creditLimit]')?.closest('label')?.querySelector('.field-caption');if(cap)cap.textContent='الحد الإئتماني'}if(t==='products'){const input=$('#modalBody [name=variantLabel]');if(input){input.type='hidden';input.closest('label').hidden=true}}};
const w26Invoice=invoice;invoice=function(...args){const result=w26Invoice(...args);const list=$('#invoiceLines');if(list)w26OrderControl(list);return result};
const w26Expense=actions.nativeExpense;actions.nativeExpense=actions.expense=expenseForm=function(){w26Expense();$('#modalBody [name=beneficiary]')?.closest('label')?.remove();$('#modalBody [name=expenseLocation]')?.closest('section')?.remove()};
groupsPage=function(){return heading('مجموعات العملاء','',`<button class="primary" data-add="customerGroups">إضافة مجموعة عملاء</button>`)+`<section class="panel">${table(['المجموعة',''],S.customerGroups.map(g=>[g.name,editCell('customerGroups',g.id)]),true)}</section>`};businessPages.groups=groupsPage;
const w26More=nativeMore;nativeMore=function(){return w26More().replaceAll('مجموعات الأسعار والعملاء','مجموعات العملاء')};
if(S)render();
