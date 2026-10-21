'use strict';
/* WATHEQ 3.5: cashier multi-account payments, scoped date filters,
   warranty ledger, stable company branding, attachments and print footer. */

/* Store the actual logo image in the synchronized company settings. A Telegram
   getFile URL is temporary: unlike product attachments, a brand logo must
   remain renderable without requesting an expiring file URL. */
if(window.WatheeqMedia?.prepare){
 const w35UploadMedia=WatheeqMedia.prepare;
 WatheeqMedia.prepare=async function(state){
  const draft=ERP.clone(state),keep={};
  for(const k of ['logo','logoMono'])if(/^data:image\//.test(draft.settings?.[k]||'')){
   keep[k]=draft.settings[k];draft.settings[k]='';
  }
  const result=await w35UploadMedia(draft);
  Object.assign(result.settings,keep);
  return result;
 };
}

/* Narrow, independently selectable payment rows. No control is mounted outside
   the Review & Pay panel and no payment input floats above the action dock. */
let w35SplitRows=[];
function w35CashAccounts(){return S.accounts.filter(a=>a.parent==='110'&&!S.accounts.some(x=>x.parent===a.id))}
function w35MakeSplit(){const cash=w35CashAccounts(),unused=cash.find(a=>!w35SplitRows.some(r=>r.account===a.id));return {account:unused?.id||cash[0]?.id||posCash,currency:S.settings.currency,amount:''}}
function w35GetSplits(){
 return w35SplitRows.map((p,i)=>{
  const amount=E.dec(String(p.amount||'0'));
  if(!Number.isSafeInteger(amount)||amount<0)throw Error('مبلغ غير صالح في وسيلة الدفع '+(i+1));
  if(!amount)return null;
  if(!w35CashAccounts().some(a=>a.id===p.account))throw Error('اختر صندوقاً أو بنكاً صالحاً');
  if(!S.currencies.some(c=>c.id===p.currency))throw Error('اختر عملة دفع صالحة');
  return {account:p.account,currency:p.currency,rate:w31Rate(p.currency,p.account),amount};
 }).filter(Boolean);
}
function w35PreviewPayments(){
 const el=$('#w35PaymentSummary');if(!el)return;
 try{
  const total=w34Total(),rates=posMode==='multi'?w35GetSplits():[];
  const paid=E.sum(rates,p=>E.md(p.amount,p.rate,1000000));
  el.innerHTML=`<span>إجمالي الفاتورة <b>${money(total)} ${esc(S.settings.currency)}</b></span><span>المدفوع <b>${money(paid)} ${esc(S.settings.currency)}</b></span><span class="${paid>total?'w35-overpaid':''}">المتبقي <b>${money(Math.max(0,total-paid))} ${esc(S.settings.currency)}</b></span>`;
 }catch(e){el.textContent=e.message}
}
function w35SplitHtml(){return w35SplitRows.map((p,i)=>`<div class="w35-split-row" data-w35-split="${i}"><div class="w35-split-head"><strong>وسيلة الدفع ${i+1}</strong><button type="button" class="w35-remove-split" data-w35-remove="${i}" ${w35SplitRows.length===1?'disabled':''} aria-label="حذف وسيلة الدفع ${i+1}">✕</button></div><div class="w35-split-grid">${select('الصندوق / البنك','w35SplitAccount'+i,w35CashAccounts(),p.account)}${select('العملة','w35SplitCurrency'+i,S.currencies,p.currency)}${field('المبلغ','w35SplitAmount'+i,p.amount,'number','min="0" step="0.01" inputmode="decimal"')}</div></div>`).join('')}
function w35PayTarget(){return $('.pos .review-panel')||$('.pos .cart')}
w34PaymentUI=function(){
 $$('.installment-mode').forEach(x=>x.remove());
 const panel=w35PayTarget();if(!panel)return;
 let modes=panel.querySelector('.payment-modes')||$('.pos .payment-modes');
 if(modes&&!modes.querySelector('[data-posmode="installment"]'))modes.insertAdjacentHTML('beforeend','<button type="button" data-posmode="installment">تقسيط</button>');
 if(modes&&!panel.contains(modes))panel.append(modes);
 let box=$('#w34InlinePay');if(!box){box=document.createElement('section');box.id='w34InlinePay'}
 box.classList.add('w35-payment-details');
 /* Old versions insert the payment inputs between POS cards. Move that exact
    element rather than creating a second instance. */
 if(modes)modes.after(box);else panel.append(box);
 let html='';
 if(posMode==='multi'){
  if(!w35SplitRows.length){w35SplitRows=[{account:posCash,currency:S.settings.currency,amount:''}];w35SplitRows.push(w35MakeSplit());}
  html=`<div class="w35-payment-title"><b>توزيع المبلغ على الصناديق والبنوك</b><small>أضف أي عدد من الحسابات وحدد مبلغ كل حساب</small></div><div id="w35SplitList">${w35SplitHtml()}</div><button type="button" class="w35-add-split" id="w35AddSplit">＋ إضافة صندوق / بنك آخر</button><div id="w35PaymentSummary" class="w35-payment-summary"></div>`;
 } else if(['partial','installment'].includes(posMode)){
  html=`<div class="w35-pay-standard">${select('عملة الدفع','w34Currency',S.currencies,w34Pay.currency||S.settings.currency)}${field(posMode==='installment'?'الدفعة الأولى':'المبلغ المدفوع','w34Amount',w34Pay.amount,'number','min="0" step="0.01" inputmode="decimal"')}${posMode==='installment'?field('عدد الأقساط','w34Count',w34Pay.count||3,'number','min="1" max="120"')+field('أول استحقاق','w34Date',w34Pay.date||today(),'date'):''}</div>`;
 }else if(posMode==='cash')html=`<div class="w35-pay-standard">${select('عملة الدفع','w34Currency',S.currencies,w34Pay.currency||S.settings.currency)}</div>`;
 box.innerHTML=html;
 box.querySelectorAll('[name^=w35Split]').forEach(el=>{
  const m=el.name.match(/^w35Split(Account|Currency|Amount)(\d+)$/);if(!m)return;
  const key={Account:'account',Currency:'currency',Amount:'amount'}[m[1]],index=Number(m[2]);
  el.addEventListener('input',()=>{if(w35SplitRows[index])w35SplitRows[index][key]=el.value;w35PreviewPayments()});
  el.addEventListener('change',()=>{if(w35SplitRows[index])w35SplitRows[index][key]=el.value;w35PreviewPayments()});
 });
 box.querySelector('#w35AddSplit')?.addEventListener('click',()=>{
  if(w35SplitRows.length>=20){toast('الحد الأقصى 20 حساب دفع');return}
  w35SplitRows.push(w35MakeSplit());w34PaymentUI();
  box.querySelector('[name="w35SplitAmount'+(w35SplitRows.length-1)+'"]')?.focus({preventScroll:true});
 });
 box.querySelectorAll('[data-w35-remove]').forEach(button=>button.addEventListener('click',()=>{
  if(w35SplitRows.length<=1)return;w35SplitRows.splice(Number(button.dataset.w35Remove),1);w34PaymentUI();
 }));
 for(const [key,k]of [['w34Currency','currency'],['w34Amount','amount'],['w34Count','count'],['w34Date','date']]){
  const el=box.querySelector('[name='+key+']');if(el)el.addEventListener('input',()=>{w34Pay[k]=el.value});
 }
 $$('.pos [data-posmode]').forEach(b=>{b.classList.toggle('active',b.dataset.posmode===posMode);b.onclick=()=>{posMode=b.dataset.posmode;w34PaymentUI()}});
 w35PreviewPayments();enhanceFields();
};
const w35OriginalCheckout=actions.checkout;
actions.checkout=async()=>{
 if(posMode!=='multi')return w35OriginalCheckout();
 if(w34Selling)return;
 try{
  WatheeqPermissions.require('pos','create');if(!w31Active()){shiftDialog();return}
  if(!cart.length)throw Error('أضف صنفاً أولاً');
  const total=w34Total(),payments=w35GetSplits();
  if(!payments.length)throw Error('أدخل مبلغ الدفع في صندوق أو بنك واحد على الأقل');
  const paid=E.sum(payments,p=>E.md(p.amount,p.rate,1000000));
  if(paid>total)throw Error('مجموع الدفعات أكبر من إجمالي الفاتورة');
  if(paid<total&&!posParty)throw Error('اختر العميل لتسجيل المبلغ المتبقي على حسابه');
  const input={id:E.uid(),kind:'sale',source:'pos',date:today(),warehouse:session.getItem('posWarehouse')||'main',party:posParty||'',currency:S.settings.currency,rate:1000000,lines:E.clone(cart),payments};
  w34Selling=true;await mutate(s=>E.post(s,input),'تم البيع وترحيل الفاتورة');
  cart=[];persistCart();w35SplitRows=[];w34Pay.amount='';w34Pay.secondAmount='';render();
 }catch(e){error(e)}finally{w34Selling=false}
};
const w35PosRender=render;
render=function(){w35PosRender();if(!S)return;document.body.classList.toggle('w35-review-open',route==='pos'&&$('.pos')?.dataset.pane==='payment');if(route==='pos'){
 const target=w35PayTarget(),fields=$('.pos .pos-payment-fields');
 if(target&&fields&&!target.contains(fields))target.insertBefore(fields,target.firstChild);
 /* Payment controls belong inside the review card at any width. */
 if(target&&$('#w34InlinePay')&&!target.contains($('#w34InlinePay')))target.append($('#w34InlinePay'));
 }};

/* Filter presets supplement the existing scoped filters; the existing save
   handler receives the same 'from' and 'to' dates, so reports stay consistent. */
function w35DateRange(preset){
 const dt=new Date(),y=dt.getFullYear(),m=dt.getMonth(),day=dt.getDate();
 const fmtLocal=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
 let start,end=new Date(y,m,day);
 if(preset==='day')start=new Date(y,m,day);
 if(preset==='week')start=new Date(y,m,day-(dt.getDay()+6)%7);
 if(preset==='month')start=new Date(y,m,1);
 if(preset==='year')start=new Date(y,0,1);
 return {from:fmtLocal(start),to:fmtLocal(end)};
}
const w35OrigModal=modal;
modal=function(title,html,save,submit){
 const isFilter=typeof title==='string'&&/(تصفية|فلترة|Filter)/i.test(title)&&typeof save==='function';
 if(isFilter){
  const hasFrom=/<input[^>]*name=["']from["']/.test(html||'');
  const hasTo=/<input[^>]*name=["']to["']/.test(html||'');
  const additional=`${hasFrom?'':field('من تاريخ','from',filter.from||'','date')}${hasTo?'':field('إلى تاريخ','to',filter.to||'','date')}`;
  html=`<div class="w35-date-filters"><b>الفترة الزمنية</b><div class="w35-periods">${[['day','يوم'],['week','أسبوع'],['month','شهر'],['year','سنة'],['custom','من تاريخ إلى تاريخ']].map(([k,l])=>`<button type="button" data-w35-period="${k}">${l}</button>`).join('')}</div>${additional?`<div class="form-grid w35-date-missing">${additional}</div>`:''}</div>`+html;
 }
 const output=w35OrigModal(title,html,save,submit);
 if(isFilter){
  const body=$('#modalBody');
  body.querySelectorAll('[data-w35-period]').forEach(b=>b.onclick=()=>{
   body.querySelectorAll('[data-w35-period]').forEach(x=>x.classList.toggle('active',x===b));
   if(b.dataset.w35Period==='custom'){
    body.querySelector('[name=from]')?.focus();return;
   }
   const dates=w35DateRange(b.dataset.w35Period);
   for(const key of ['from','to']){const input=body.querySelector('[name='+key+']');if(input){input.value=dates[key];input.dispatchEvent(new Event('change',{bubbles:true}))}}
  });
 }
 return output;
};
const w35OrigFilters=filters;
filters=function(){return w35OrigFilters()};
actions.filter=filters;
const w35PriorDocFilter=docFilter;
docFilter=function(d){
 if(!w35PriorDocFilter(d))return false;
 if(filter.shiftId&&['sale','saleReturn','purchase','purchaseReturn'].includes(d.kind)&&d.shiftId!==filter.shiftId)return false;
 return true;
};
/* Add shift choice specifically to sales and invoices filter dialogs. */
const w35FilteredModal=modal;
modal=function(title,html,save,submit){
 if(/تصفية.*(المبيعات|الفواتير)/.test(title||'')&&S?.shifts?.length&&!(html||'').includes('name="shiftId"')){
  const shifts=S.shifts.slice().reverse().map(sh=>({id:sh.id,name:(sh.employee||'وردية')+' · '+(sh.opened||'').slice(0,16).replace('T',' ')+' · '+name('accounts',sh.cash)}));
  html+=`<div class="form-grid w35-shift-filter">${select('الوردية','shiftId',shifts,filter.shiftId||'',true)}</div>`;
 }
 return w35FilteredModal(title,html,save,submit);
};
/* V20 calls its own modal('تصفية الفواتير'), but the sales page is independent. */
const w35FiltersForSales=actions.filter;
actions.filter=()=>{if(route==='sales'){
 const originalRoute=route;route='invoices';try{return w35FiltersForSales()}finally{route=originalRoute}
 }return w35FiltersForSales()};

/* Active product warranties with customer name, invoice and effective end date. */
function w35WarrantyEnd(start,months){
 const [year,month,day]=String(start).split('-').map(Number);
 if(!year||!month||!day||!Number.isInteger(months)||months<=0)return '';
 const first=new Date(Date.UTC(year,month-1+months,1));
 const days=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
 return `${first.getUTCFullYear()}-${String(first.getUTCMonth()+1).padStart(2,'0')}-${String(Math.min(day,days)).padStart(2,'0')}`;
}
function w35WarrantyEntries(){return S.docs.filter(d=>d.kind==='sale'&&!d.reversed).flatMap(d=>
 (d.lines||[]).flatMap((l,i)=>{
  const warranty=l.warranty||(S.warranties||[]).find(w=>w.id===find('products',l.product)?.warranty);
  const months=Number(warranty?.months||0),expiry=w35WarrantyEnd(d.date,months);
  if(!expiry)return [];
  const refunded=E.sum(S.docs.filter(x=>x.kind==='saleReturn'&&x.original===d.id&&!x.reversed).flatMap(x=>x.lines||[]).filter(x=>x.index===i),x=>x.baseQty||0);
  const remaining=(l.baseQty||0)-refunded;
  if(remaining<=0)return [];
  return [{doc:d,line:l,warranty,expiry,remaining,active:expiry>=today(),customer:name('parties',d.party),phone:find('parties',d.party)?.phone||''}];
 })).sort((a,b)=>b.expiry.localeCompare(a.expiry))}
function w35WarrantiesPage(){
 const items=w35WarrantyEntries(),active=items.filter(x=>x.active),expired=items.filter(x=>!x.active);
 const value=$('#w35WarrantySearch')?.value?.trim().toLowerCase()||'';
 const showExpired=$('#w35ExpiredToggle')?.checked||false;
 const matches=(showExpired?items:active).filter(x=>!value||[x.customer,x.phone,x.line.name,x.doc.number,x.warranty.name].join(' ').toLowerCase().includes(value));
 return `<div class="w35-warranty-stats"><div><span>الضمانات السارية</span><strong>${active.length}</strong></div><div><span>الضمانات المنتهية</span><strong>${expired.length}</strong></div></div><div class="w35-warranty-toolbar"><label>بحث باسم العميل أو الصنف أو رقم الفاتورة<input type="search" id="w35WarrantySearch" value="${esc(value)}" placeholder="ابحث في الضمانات..."></label><label class="w35-expired-switch"><input type="checkbox" id="w35ExpiredToggle" ${showExpired?'checked':''}> عرض الضمانات المنتهية</label></div><div id="w35WarrantyResults">${w35WarrantyRows(matches)}</div>`;
}
function w35WarrantyRows(items){return items.length?`<div class="w35-warranty-list">${items.map(x=>`<article class="w35-warranty-card"><div class="w35-warranty-header"><div><b>${esc(x.line.name)}</b><small>${esc(x.warranty.name||'ضمان المنتج')} · ${esc(x.warranty.months)} شهر</small></div><span class="${x.active?'active':'expired'}">${x.active?'ساري':'منتهي'}</span></div><div class="w35-warranty-meta"><div><small>العميل</small><strong>${esc(x.customer==='—'?'عميل نقدي':x.customer)}</strong>${x.phone?`<small>${esc(x.phone)}</small>`:''}</div><div><small>الفاتورة</small><strong>#${esc(x.doc.number)}</strong></div><div><small>تاريخ البيع</small><strong>${esc(x.doc.date)}</strong></div><div><small>ساري حتى</small><strong>${esc(x.expiry)}</strong></div></div><button type="button" data-view="${esc(x.doc.id)}">عرض الفاتورة</button></article>`).join('')}</div>`:'<div class="empty">لا توجد ضمانات مطابقة.</div>'}
actions.activeWarranties=()=>{
 modal('الضمانات السارية',w35WarrantiesPage(),null);
 const body=$('#modalBody');
 function update(){const q=body.querySelector('#w35WarrantySearch')?.value?.toLowerCase()||'',show=body.querySelector('#w35ExpiredToggle')?.checked;
  body.querySelector('#w35WarrantyResults').innerHTML=w35WarrantyRows(w35WarrantyEntries().filter(x=>(show||x.active)&&[x.customer,x.phone,x.line.name,x.doc.number,x.warranty.name].join(' ').toLowerCase().includes(q)));
 }
 body.querySelector('#w35WarrantySearch')?.addEventListener('input',update);
 body.querySelector('#w35ExpiredToggle')?.addEventListener('change',update);
};
const w35Catalog=catalogPage;
catalogPage=function(){return `<div class="w35-warranty-shortcut"><button type="button" data-action="activeWarranties" class="primary">${icon('invoices')} الضمانات السارية للعملاء</button></div>`+w35Catalog()};
const w35MasterList=masterList;
masterList=function(t){w35MasterList(t);if(t==='warranties')$('#modalBody')?.insertAdjacentHTML('afterbegin','<button type="button" class="primary w35-warranty-open" data-action="activeWarranties">عرض الضمانات السارية مع العملاء</button>')};

/* Employee login/permission control next to Add Employee, not above heading. */
const w35EmployeesBase=employeesPage;
employeesPage=function(){let html=w35EmployeesBase();
 html=html.replace(/^<div class="file-actions"><button[^>]*data-w34-users[^>]*>[\s\S]*?<\/button><\/div>/,'');
 if(w34Manager())html=html.replace(/(<button\b[^>]*data-add="employees"[^>]*>)/,'<button type="button" class="w35-employees-access" data-w34-users>حسابات الدخول والصلاحيات</button>$1');
 return html;
};
/* There is just one settings area in the menu, not a duplicate company page. */
for(const group of [typeof moreSectionsV18!=='undefined'?moreSectionsV18:[],typeof menuGroups!=='undefined'?menuGroups:[]])for(const section of group){
 if(Array.isArray(section?.[2]))section[2]=section[2].filter(item=>!(Array.isArray(item)&&item[0]==='بيانات المؤسسة'));
}

/* Receipts for debt collections credit the customer receivable account 120.
   Received funds debit the cash/bank account in ERP.post. */
const w35OpenVoucher=voucher;
voucher=function(kind){w35OpenVoucher(kind);if(kind!=='receipt')return;
 const body=$('#modalBody'),party=body.querySelector('[name=party]'),account=body.querySelector('[name=account]');
 if(!party||!account)return;
 const hint=document.createElement('div');hint.className='w35-receipt-hint';
 hint.innerHTML='<b>تحصيل دين العميل</b><p>المبلغ يدخل للصندوق أو البنك، ويُخصم من المبلغ المستحق على العميل.</p><div id="w35CustomerDebt"></div>';
 account.closest('label')?.after(hint);
 const draw=()=>{if(!party.value)return hint.querySelector('#w35CustomerDebt').textContent='اختر العميل لاستعراض رصيده';
  account.value='120';const debt=E.balance(S,'120',party.value),amount=E.dec(body.querySelector('[name=amount]')?.value||'0'),rate=E.dec(body.querySelector('[name=rate]')?.value||'1',6);
  const baseAmount=E.md(amount,rate,1000000);
  hint.querySelector('#w35CustomerDebt').textContent='ذمة العميل الحالية: '+money(debt)+' '+S.settings.currency+' · بعد القبض: '+money(debt-baseAmount)+' '+S.settings.currency;
 };
 party.addEventListener('change',draw);body.querySelector('[name=amount]')?.addEventListener('input',draw);body.querySelector('[name=rate]')?.addEventListener('input',draw);draw();
 const save=modalSave;modalSave=async f=>{if(f.get('party'))f.set('account','120');return save(f)};
};

/* Improve the same attachment control used by all receipt and payment vouchers. */
const w35AttachVoucher=voucher;
voucher=function(kind){w35AttachVoucher(kind);const box=$('#modalBody .w34-attachments');if(!box)return;
 box.classList.add('w35-attachment-uploader');
 const trigger=box.querySelector('label.primary');if(!trigger)return;
 trigger.className='w35-attach-picker';trigger.innerHTML=`<span class="w35-attach-icon">${icon('camera')}</span><span><b>إرفاق صور السند</b><small>اضغط لاختيار صورة أو أكثر · حتى 10 ميجابايت للصورة</small></span><span class="w35-attach-plus">＋</span><input id="w34VoucherFiles" type="file" accept="image/*" multiple>`;
 // Reinstall onChange because rewriting the label replaced its input node.
 const newInput=box.querySelector('#w34VoucherFiles');let selected=[];
 newInput.onchange=async e=>{try{const files=[...e.target.files];selected.push(...(await Promise.all(files.map(WatheeqMedia.fileData))));
  box.querySelector('#w34AttachmentPreview').innerHTML=selected.map((src,i)=>`<span class="w35-attachment-tile"><img src="${esc(src)}" alt="مرفق ${i+1}"><button type="button" data-w35-drop-image="${i}" aria-label="حذف الصورة">×</button></span>`).join('');
  newInput.value='';
 }catch(err){error(err)}};
 box.addEventListener('click',e=>{const b=e.target.closest('[data-w35-drop-image]');if(!b)return;selected.splice(Number(b.dataset.w35DropImage),1);box.querySelector('#w34AttachmentPreview').innerHTML=selected.map((src,i)=>`<span class="w35-attachment-tile"><img src="${esc(src)}" alt="مرفق ${i+1}"><button type="button" data-w35-drop-image="${i}" aria-label="حذف الصورة">×</button></span>`).join('')});
 /* The previous w34 voucher wrapper closes over a different image array.
    Interpose on the post input during save so removed previews are respected. */
 const previousSave=modalSave;
 modalSave=async f=>{
  const original=E.post;E.post=(s,input)=>original(s,['receipt','payment'].includes(input.kind)?{...input,attachments:selected}:input);
  try{return await previousSave(f)}finally{E.post=original}
 };
};

/* Consistent footer in all receipt/sale/purchase vouchers on screen and print. */
const w35ReceiptBase=receiptHTML;
receiptHTML=function(d){
 const html=w35ReceiptBase(d),t=document.createElement('template');t.innerHTML=html;
 const receipt=t.content.querySelector('.receipt');
 if(receipt&&!receipt.querySelector('.w35-print-credit'))receipt.insertAdjacentHTML('beforeend','<div class="w35-print-credit" dir="ltr">برنامج الوثيق المحاسبي 0597603119</div>');
 return t.innerHTML;
};

/* Larger thermal receipt typography, rendered directly at printer resolution.
   The bitmap is shared by browser print, PNG export and Bluetooth ESC/POS. */
const w35PreviousReceiptCanvas=w28ReceiptCanvas;
w28ReceiptCanvas=async function(d,width=1152){
 if(!d?.lines?.length)return w35PreviousReceiptCanvas(d,width);
 await document.fonts.ready;
 const base=576,scale=width/base,measure=document.createElement('canvas').getContext('2d'),ops=[];
 let y=18;
 function lines(value,maximum=525,size=24,bold=false){
  measure.font=(bold?'bold ':'')+size+'px Cairo, Arial';
  const result=[];let cur='';
  for(const word of String(value??'').split(/\s+/)){
   const next=cur?cur+' '+word:word;
   if(cur&&measure.measureText(next).width>maximum){result.push(cur);cur=word}else cur=next;
  }
  if(cur)result.push(cur);
  return result.length?result:[''];
 }
 function textAt(value,x,height,size=24,align='right',bold=false){ops.push({type:'text',value:String(value??''),x,y:height,size,align,bold})}
 function text(value,size=24,bold=false,alignment='right',x=552,max=525){
  for(const line of lines(value,max,size,bold)){textAt(line,x,y,size,alignment,bold);y+=size+9}
 }
 function center(value,size=24,bold=false){text(value,size,bold,'center',288,526)}
 function rule(){y+=5;ops.push({type:'rule',y});y+=14}
 let logo=null,logoHeight=0;
 if(S.settings.showLogo!==false&&S.settings.logo){
  try{
   logo=new Image();logo.crossOrigin='anonymous';logo.src=S.settings.logoMono||S.settings.logo;
   await logo.decode();logoHeight=Math.min(95,140*logo.height/logo.width);
   ops.push({type:'logo',logo,y,logoHeight});y+=logoHeight+12;
  }catch{logo=null}
 }
 center(S.settings.company||'الوثيق',35,true);
 for(const key of ['address','phone','email'])if(S.settings[key])center(S.settings[key],23);
 if(S.settings.taxNumber)center('الرقم الضريبي: '+S.settings.taxNumber,22);
 y+=9;center(E.labels[d.kind]||'فاتورة',30,true);y+=4;
 for(const line of ['رقم الفاتورة: '+(d.number||''),'التاريخ: '+(d.date||''),
  'العميل / الطرف: '+(name('parties',d.party)==='—'?'نقدي':name('parties',d.party))])text(line,24);
 rule();text('الأصناف',26,true);rule();
 for(let i=0;i<d.lines.length;i++){
  const l=d.lines[i];text((i+1)+'. '+(l.name||name('products',l.product)),28,true);
  const count=qty(l.qty||l.baseQty||0)+' '+(l.unitName||'');
  textAt('الكمية: '+count,552,y,23,'right');
  textAt('السعر: '+money(l.price||0),20,y,22,'left');y+=36;
  textAt('الإجمالي: '+money(l.total??l.cost??0),552,y,26,'right',true);y+=40;
  if(l.warranty?.months){text('الضمان: '+(l.warranty.name||'ضمان المنتج')+' · '+l.warranty.months+' شهر',21)}
  rule();
 }
 function total(label,value,large=false){
  const size=large?30:24;
  textAt(label,552,y,size,'right',large);
  textAt(value,16,y,size,'left',large);y+=size+16;
 }
 total('الإجمالي',money(d.total??d.totalBase)+' '+(d.currency||S.settings.currency),true);
 const tax=E.sum(d.lines,l=>l.tax||0);if(tax)total(S.settings.taxLabel||'الضريبة',money(tax));
 if(d.paidBase!==undefined){total('المدفوع',money(d.paidBase));total('المتبقي',money(d.reversed?0:E.outstanding(S,d)))}
 if(d.cashChange?.length)for(const p of d.cashChange)total('الباقي '+p.currency,money(p.amount));
 if(d.note){rule();text('ملاحظات: '+d.note,22)}
 y+=16;center(S.settings.receiptFooter||'شكراً لكم!',24);
 rule();textAt('برنامج الوثيق المحاسبي 0597603119',16,y,22,'left',true);y+=44;
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=Math.ceil((y+12)*scale);
 const ctx=canvas.getContext('2d',{alpha:false});ctx.scale(scale,scale);ctx.fillStyle='#fff';ctx.fillRect(0,0,base,y+12);
 ctx.fillStyle='#000';ctx.strokeStyle='#333';ctx.lineWidth=1.5;ctx.textBaseline='top';ctx.direction='rtl';
 for(const op of ops){
  if(op.type==='logo'){
   const w=op.logoHeight*op.logo.width/op.logo.height;
   try{ctx.drawImage(op.logo,(base-w)/2,op.y,w,op.logoHeight)}catch{}
  }else if(op.type==='rule'){
   ctx.beginPath();ctx.moveTo(15,op.y);ctx.lineTo(560,op.y);ctx.stroke();
  }else{
   ctx.font=(op.bold?'bold ':'')+op.size+'px Cairo, Arial';
   ctx.textAlign=op.align;ctx.fillText(op.value,op.x,op.y);
  }
 }
 return canvas;
};
