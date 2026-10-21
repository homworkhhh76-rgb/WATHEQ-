'use strict';
// Desktop workspace; phone navigation remains independent.
const r22Wide=matchMedia('(min-width:1024px)');
const r22Render=render;
render=function(){r22Render();if(!S)return;
 const sidebar=$('#sidebar');let desk=$('#desktopNav');
 if(r22Wide.matches&&desk){sidebar.append(desk);desk.querySelectorAll('details').forEach(d=>d.open=true)}
 else if(desk&&desk.parentElement===sidebar)$('header').append(desk);
 sidebar.querySelectorAll('a[href]').forEach(a=>a.classList.toggle('active',a.hash==='#'+route));
 const charts=[...document.querySelectorAll('#content > .native-chart')];
 if(charts.length){const row=document.createElement('div');row.className='r22-charts';charts[0].before(row);charts.forEach(c=>row.append(c))}
 if(r22Wide.matches&&route==='pos'){
  $('#content>.page-head')?.removeAttribute('aria-hidden');
  const cartPanel=$('.pos .cart'),review=$('.pos .review-panel');
  if(cartPanel&&review){cartPanel.querySelector('[data-native-pane]')?.remove();review.querySelector('h2')?.remove();while(review.firstChild)cartPanel.append(review.firstChild);review.remove();
   const fields=cartPanel.querySelector('.pos-payment-fields');if(fields)cartPanel.prepend(fields);
   const modes=cartPanel.querySelector('.payment-modes');if(modes)fields?.after(modes);
   const head=document.createElement('div');head.className='r22-cart-head';head.innerHTML='<b>اسم الصنف</b><b>الوحدة</b><b>الكمية</b><b>السعر</b><b>الإجمالي</b>';cartPanel.querySelector('.cart-list')?.before(head);
  }
 }
};
r22Wide.addEventListener('change',()=>{if(S)render()});
// Only persisted reference lists offer creation, never fixed status/payment options.
function r22Entity(s){
 const k=s.name||s.id||'',label=s.closest('label')?.textContent||s.getAttribute('aria-label')||'';
 if(/unit/i.test(k)||s.hasAttribute('data-stockunit')||s.dataset.l==='unit')return null;
 if(/supplier/i.test(k))return ['parties','مورد جديد','supplier'];
 if(/Customer|customer/.test(k))return ['parties','عميل جديد','customer'];
 if(k==='party'||s.hasAttribute('data-party')){if(label.includes('المورد')&&!label.includes('العميل'))return ['parties','مورد جديد','supplier'];if(label.includes('العميل')&&!label.includes('المورد'))return ['parties','عميل جديد','customer'];return ['parties','عميل / مورد جديد','']}
 if(k==='product'||s.dataset.l==='product'||s.closest('#stockLines,#components'))return ['products','صنف جديد'];
 const maps={warehouse:['warehouses','مستودع جديد'],posWarehouse:['warehouses','مستودع جديد'],toWarehouse:['warehouses','مستودع جديد'],branch:['branches','فرع جديد'],rep:['reps','مندوب جديد'],employee:['employees','موظف جديد'],recipe:['recipes','وصفة جديدة'],asset:['assets','أصل جديد'],currency:['currencies','عملة جديدة'],account:['accounts','حساب جديد'],parent:['accounts','حساب جديد'],cash:['accounts','حساب جديد'],posCash:['accounts','حساب جديد'],targetAccount:['accounts','حساب جديد'],costCenter:['costCenters','مركز تكلفة جديد']};
 return maps[k]||(s.hasAttribute('data-a')||s.dataset.p==='account'?['accounts','حساب جديد']:null);
}
const r22OpenChoice=openChoice;
openChoice=function(s){r22OpenChoice(s);$('#r22ChoiceAdd')?.remove();const entity=r22Entity(s);if(!entity)return;const b=document.createElement('button');b.type='button';b.id='r22ChoiceAdd';b.className='primary';b.textContent='＋ '+entity[1];b.onclick=()=>r22Create(s,entity);$('.choice-search').after(b)};
const r22Parents=[];
function r22Create(source,entity){
 const parent=$('#modal'),body=$('#modalBody');
 const snapshot={source,entity,ids:new Set(S[entity[0]].map(x=>x.id)),open:parent.open,nodes:[...body.childNodes],save:modalSave,pending:pendingId,title:$('#modalTitle').textContent,submit:$('#submitModal').textContent,display:$('#submitModal').style.display,error:$('#modalError').textContent,mode:parent.dataset.paymentMode,scroll:body.scrollTop};
 snapshot.nodes.forEach(n=>n.remove());r22Parents.push(snapshot);
 closeChoice(false);history.replaceState({rawanPage:true},'');
 editEntity(entity[0]);$('#modalTitle').textContent=entity[1];
 if(entity[2]){const type=body.querySelector('[name=type]');if(type)type.value=entity[2]}
 const save=modalSave;modalSave=async f=>{const result=await save(f);if(result!==false)snapshot.created=S[entity[0]].find(x=>!snapshot.ids.has(x.id));return result};enhanceFields();
}
const r22Close=closeModal;
closeModal=function(){if(!r22Parents.length)return r22Close();const p=r22Parents.pop(),body=$('#modalBody');body.replaceChildren(...p.nodes);modalSave=p.save;pendingId=p.pending;$('#modalTitle').textContent=p.title;$('#submitModal').textContent=p.submit;$('#submitModal').style.display=p.display;$('#modalError').textContent=p.error;$('#modal').dataset.paymentMode=p.mode||'';body.scrollTop=p.scroll;
 if(!p.open){$('#modal').hidden=true;$('#modal').open=false;document.body.classList.remove('form-open');history.replaceState(null,'')}
 let source=p.source;if(!source.isConnected){source=source.id?document.getElementById(source.id):[...document.querySelectorAll('#content select')].find(s=>s.name===source.name)}
 if(p.created&&source){source.add(new Option(p.created.name,p.created.id));source.value=p.created.id;source.dispatchEvent(new Event('change',{bubbles:true}))}enhanceFields();source?.nextElementSibling?.focus();
};
// The original handlers captured the old close function; use the current one.
$('#closeModal').onclick=()=>closeModal();$('#cancelModal').onclick=()=>closeModal();
window.addEventListener('popstate',()=>{if(r22Parents.length&&!history.state?.rawanPage&&!history.state?.rawanChoice&&!history.state?.rawanScan){$('#modal').open=true;$('#modal').hidden=false;document.body.classList.add('form-open');closeModal();if($('#modal').open)history.replaceState({rawanPage:true},'')}});
if(S)render();
