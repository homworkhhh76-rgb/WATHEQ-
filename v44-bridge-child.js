'use strict';
/* This script is deliberately separate from original text.html. It replaces
 * demo data with the ERP state, leaving original CSS, HTML, dimensions, and
 * original rendering templates untouched (apart from Cairo + Back). */
(()=>{
 // The iframe is purely presentation. Never read parent JS globals: browsers
 // isolate file:// origins (including TrebEdit) even between sibling HTML files.
 const embedded=window.parent!==window;
 if(!embedded){
  window.addEventListener('DOMContentLoaded',()=>{
   const grid=document.getElementById('products-grid');
   if(grid)grid.innerHTML='<div style="padding:18px;grid-column:1/-1;text-align:center;color:#be123c;font-weight:700">هذه الشاشة تعرض أصناف شركة الوثيق فقط. افتح index.html وسجّل الدخول ثم اختر الكاشير.</div>';
   const badge=document.querySelector('.status-pill');if(badge)badge.textContent='غير متصل بقاعدة الشركة';
   document.querySelectorAll('.btn-pay-submit,.btn-new-inv').forEach(b=>b.disabled=true);
  });
  return;
 }
 let activeSnapshot=null,sequence=0;
 const replies=new Map();
 function send(command,...args){
  window.parent.postMessage({type:'watheeq:pos-cmd',command,args},'*');
  return true;
 }
 function request(command,...args){
  const id=++sequence;
  return new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>{replies.delete(id);reject(Error('انتهت مهلة استجابة كاشير الوثيق؛ راجع اتصال البرنامج'))},15000);
   replies.set(id,{resolve,reject,timeout});
   window.parent.postMessage({type:'watheeq:pos-cmd',command,args,requestId:id},'*');
  });
 }
 const bridge={
  snapshot:()=>activeSnapshot,
  receipt:()=>activeSnapshot?.receipt,
  checkout:data=>request('checkout',data),
  back:()=>send('back'),returnInvoice:()=>send('returnInvoice'),
  customer:id=>send('customer',id),addCustomer:()=>send('addCustomer'),
  warehouse:id=>send('warehouse',id),currency:id=>send('currency',id),
  cash:id=>send('cash',id),priceGroup:m=>send('priceGroup',m),negative:v=>send('negative',v),
  discount:(v,k)=>send('discount',v,k),addProduct:(id,unit)=>send('addProduct',id,unit),
  scan:v=>send('scan',v),change:(i,k,v)=>send('change',i,k,v),adjust:(i,n)=>send('adjust',i,n),
  remove:i=>send('remove',i),newInvoice:()=>send('newInvoice'),clear:()=>send('clear'),
  hold:()=>send('hold'),holds:()=>send('holds'),camera:()=>send('camera'),
  setPay:m=>send('setPay',m),payments:rows=>send('payments',rows),print:()=>send('print')
 };
 window.addEventListener('message',event=>{
  if(event.source!==window.parent)return;
  const msg=event.data||{};
  if(msg.type==='watheeq:pos-sync'){activeSnapshot=msg.data;sync(msg.data)}
  if(msg.type==='watheeq:pos-notice')notify(msg.message,msg.kind);
  if(msg.type==='watheeq:pos-reply'){
   const entry=replies.get(msg.requestId);if(!entry)return;
   clearTimeout(entry.timeout);replies.delete(msg.requestId);
   if(msg.ok)entry.resolve(msg.result);else entry.reject(Error(msg.message||'تعذر إتمام العملية'));
  }
 });
 demoProducts.splice(0,demoProducts.length);categories.splice(0,categories.length);
 let state=null, syncing=false;
 const $=id=>document.getElementById(id);
 const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const placeholder='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80"><rect width="120" height="80" fill="#f8fafc"/><g fill="none" stroke="#cbd5e1" stroke-width="3"><rect x="45" y="22" width="30" height="36" rx="3"/><path d="M45 35h30M55 22v36"/></g></svg>');
 const safeImage=v=>{const s=String(v||'');return (/^https?:\/\//i.test(s)||/^data:image\/(png|jpe?g|webp|gif|svg\+xml);/i.test(s))?escapeHTML(s):placeholder};
 const currSym=id=>({ILS:'₪',USD:'$',JOD:'د.أ',EUR:'€'})[id]||id||'₪';
 const amount=v=>Number(v||0).toFixed(2);
 const options=(list,value,empty='')=>(empty?`<option value="">${escapeHTML(empty)}</option>`:'')+list.map(x=>`<option value="${escapeHTML(x.id)}" ${String(x.id)===String(value)?'selected':''}>${escapeHTML(x.name)}</option>`).join('');
 function decoratePayment(){if(!state)return;const acc=state.cashAccounts||[];
  if(currentPayMethod==='cash'){
   const el=$('pay-panel-content')?.querySelector('select.form-control');if(el){el.innerHTML=options(acc,state.cash);el.id='real-cash-account';}
  }
  if(currentPayMethod==='partial'){
   const box=$('partial-paid');if(box&&!box.dataset.initialized){box.value=amount(state.totals.total/(state.rate||1)/2);box.dataset.initialized='1';calcPartial()}
  }
  if(currentPayMethod==='multi')renderMultiPayRows();
  if(currentPayMethod==='installment')calcInstallments();
 }
 function setOptions(id,html){const el=$(id);if(el&&el.innerHTML!==html)el.innerHTML=html}
 function sync(data){if(!data || !Array.isArray(data.products) || !Array.isArray(data.cart)){
  notify('لم تُحمّل بيانات الشركة من نظام الوثيق. لا يمكن استخدام كاشير تجريبي.');
  return;
 }
 const before=state;state=data;syncing=true;try{
  const currentSearch=$('product-search')?.value||'';
  const currentCat=currentCategory;
  demoProducts.splice(0,demoProducts.length,...data.products.map(p=>({
   id:p.id,code:escapeHTML(p.code),name:escapeHTML(p.name),category:p.category?('watheeqcat'+data.categories.indexOf(p.category)):'',price:p.price,stock:p.stock,unit:escapeHTML(p.unit),
   units:p.units.map(u=>({...u,name:escapeHTML(u.name)})),img:safeImage(p.img)
  })));
  const categorySvg='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>';
  categories.splice(0,categories.length,{id:'all',name:'جميع الأصناف',icon:categorySvg},...data.categories.map((n,i)=>({id:'watheeqcat'+i,name:escapeHTML(n),icon:categorySvg})));
  if(!categories.some(c=>c.id===currentCat))currentCategory='all';
  currentCart.splice(0,currentCart.length,...data.cart.map(l=>({...l,name:escapeHTML(l.name),code:escapeHTML(l.code),img:safeImage(l.img),selectedUnit:escapeHTML(l.selectedUnit),units:l.units.map(u=>({...u,name:escapeHTML(u.name)}))})));
  setOptions('warehouse-select',options(data.warehouses,data.warehouse));
  setOptions('customer-select',options(data.customers,data.customer,'عميل نقدي افتراضي (نقدي)'));
  setOptions('currency-select',options(data.currencies,data.currency));
  // Display the active real company name without changing the copied layout.
  const brand=document.querySelector('.app-header .header-brand > span:not(.brand-badge)');
  if(brand)brand.textContent=(data.company||'الوثيق')+' | نقطة البيع';
  const group=document.querySelector('#products-grid');
  if(group && data.products.length===0)group.dataset.companyEmpty='true';
  else if(group)delete group.dataset.companyEmpty;
  if($('exchange-rate'))$('exchange-rate').value=Number(data.rate||1).toFixed(3);
  if($('inv-number-disp'))$('inv-number-disp').textContent=data.invoiceNumber||'جديدة';
  const hdr=document.querySelector('.app-header .header-info-group');
  if(hdr){const name=[...hdr.children].find(x=>x.textContent?.trim()==='أحمد المحاسب'||x.dataset?.watheeqOperator);if(name){name.dataset.watheeqOperator='1';name.textContent=data.operator||'المستخدم'}}
  const badge=document.querySelector('.status-pill');
  if(badge){badge.lastChild.textContent=data.online?' بيانات الشركة':' بيانات محلية';badge.style.color=data.online?'':'#fde68a';badge.title='البيانات من شركة '+(data.company||'الوثيق')+' — '+data.products.length+' صنف';}
  const hold=$('hold-count');if(hold)hold.textContent=data.held;
  const curr=$('curr-symbol');if(curr)curr.textContent=currSym(data.baseCurrency);
  const priceSel=document.querySelector('.invoice-meta-bar .form-group:nth-child(4) select');if(priceSel)priceSel.value=data.priceGroup==='wholesale'?'سعر الجملة':'سعر التجزئة';
  const disc=$('inv-discount');if(disc&&document.activeElement!==disc)disc.value=data.globalDiscount||0;
  if($('inv-discount-type'))$('inv-discount-type').value=data.discountKind||'val';
  // ERP tax is item-specific: keep the exact original tax field but show the actual effective rate.
  if($('tax-rate')){$('tax-rate').value=data.taxEffective; $('tax-rate').readOnly=true;$('tax-rate').title='الضريبة محسوبة من الأصناف الفعلية في برنامج الوثيق';}
  document.querySelectorAll('#cart-rows input[type=number]').forEach((field)=>{if(field.getAttribute('onchange')?.includes('updatePriceInput')){field.readOnly=!data.canEditPrice;field.title=data.canEditPrice?'':'ليس لديك صلاحية تعديل السعر'}});
  if($('allow-negative')){$('allow-negative').checked=data.allowNegative;$('allow-negative').disabled=!data.negativePermitted;$('allow-negative').title=data.negativePermitted?'بيع بالسالب وفق إعدادات المحرك':'البيع بالسالب غير متاح من النظام الحالي'}
  if(!before||JSON.stringify(before.categories)!==JSON.stringify(data.categories))renderCategories();
  if(!before||JSON.stringify(before.products)!==JSON.stringify(data.products)||before.warehouse!==data.warehouse)renderProducts();
  if(data.products.length===0){
   $('products-grid').innerHTML='<div style="grid-column:1/-1;text-align:center;padding:24px 12px;color:#64748b;font-weight:700">لا توجد أصناف مسجلة في بيانات هذه الشركة. أضف الأصناف من إدارة المخزون في الوثيق.</div>';
  }
  if(!before||JSON.stringify(before.cart)!==JSON.stringify(data.cart)||before.canEditPrice!==data.canEditPrice)rawRenderCart();fixTotals();
  if(currentPayMethod!==data.payMode){const tabs=[...document.querySelectorAll('.pay-tab')],modeIndex=['cash','credit','partial','multi','installment'].indexOf(data.payMode);rawSwitchPay(data.payMode||'cash',tabs[Math.max(0,modeIndex)]);}
  else document.querySelectorAll('.pay-tab').forEach((btn,i)=>btn.classList.toggle('active',i===['cash','credit','partial','multi','installment'].indexOf(data.payMode)));
  if(!before||before.payMode!==data.payMode)decoratePayment();
  if($('product-search')?.value!==currentSearch)$('product-search').value=currentSearch;
 }finally{syncing=false}}
 function fixTotals(){if(!state)return;const t=state.totals;
  for(const [id,val]of [['lbl-count',t.count],['lbl-qty',t.quantity],['lbl-discount',amount(t.discount)],['lbl-tax',amount(t.tax)],['lbl-grand-total',amount(t.total)]])if($(id))$(id).textContent=val;
  const cc=$('curr-symbol');if(cc)cc.textContent=currSym(state.baseCurrency);
  document.querySelectorAll('#cart-rows tr').forEach((tr,i)=>{const l=state.cart[i];if(l&&tr.cells[7])tr.cells[7].textContent=currSym(state.baseCurrency)+' '+amount(l.qty*l.price-l.discount)});
  if(currentPayMethod==='cash'&&$('cash-received')&&document.activeElement!==$('cash-received')){$('cash-received').value=amount(t.total/(state.rate||1));calcCashReturn()}
 }
 const rawRenderCart=window.renderCart;
 const rawSwitchPay=window.switchPayMethod;
 window.renderCart=function(){rawRenderCart();fixTotals()};
 window.calcCashReturn=function(){if(!state||!$('cash-received'))return;const due=state.totals.total/(state.rate||1),ret=Math.max(0,Number($('cash-received').value||0)-due);if($('cash-return-val'))$('cash-return-val').textContent=currSym(state.currency)+' '+amount(ret)};
 window.calcPartial=function(){if(!state||!$('partial-paid'))return;const paid=Number($('partial-paid').value||0)*(state.rate||1);if($('partial-rem'))$('partial-rem').value=currSym(state.baseCurrency)+' '+amount(Math.max(0,state.totals.total-paid))};
 window.calcInstallments=function(){if(!state||!$('inst-down'))return;const down=Number($('inst-down').value||0)*(state.rate||1),n=Math.max(1,Number($('inst-count')?.value||1));if($('inst-val'))$('inst-val').value=currSym(state.baseCurrency)+' '+amount(Math.max(0,state.totals.total-down)/n)};
 window.addToCartById=function(id){bridge.addProduct(id)};
 window.addToCart=function(p){if(p)bridge.addProduct(p.id)};
 window.changeQty=function(i,n){bridge.adjust(i,n)};
 window.updateQtyInput=function(i,v){bridge.change(i,'qty',v)};
 window.updatePriceInput=function(i,v){bridge.change(i,'price',v)};
 window.updateDiscountInput=function(i,v){bridge.change(i,'discount',v)};
 window.changeItemUnit=function(i,name){const item=state?.cart[i];const u=item?.units.find(x=>escapeHTML(x.name)===name||x.name===name);if(u)bridge.change(i,'unit',u.index)};
 window.removeItem=function(i){bridge.remove(i)};
 window.clearCart=function(){bridge.clear()};
 window.createNewInvoice=function(){bridge.newInvoice()};
 window.holdInvoice=function(){bridge.hold()};
 window.showHoldList=function(){bridge.holds()};
 window.goBackToWatheeq=function(){bridge.back()};
 window.setInvoiceType=function(type){if(type==='return'){bridge.returnInvoice();return}invoiceType=type;$('btn-sales').classList.add('active');$('btn-return').classList.remove('active')};
 window.updateCurrency=function(){bridge.currency($('currency-select').value)};
 window.switchPayMethod=function(method,btn){rawSwitchPay(method,btn);if(!syncing){bridge.setPay(method);decoratePayment()}else if(currentPayMethod===method)decoratePayment()};
 window.renderMultiPayRows=function(){const c=$('multi-pay-list');if(!c||!state)return;const acc=state.cashAccounts||[];
  c.innerHTML=multiPayAccounts.map((r,i)=>`<div style="display:flex; gap:4px; align-items:center;">
   <select class="form-control" style="flex:1.2" data-multi-account="${i}">${options(acc,r.account||acc[0]?.id)}</select>
   <input type="number" min="0" step="0.01" class="form-control" style="flex:1" data-multi-amount="${i}" value="${escapeHTML(r.amount??0)}" placeholder="المبلغ">
   ${i>0?`<button class="btn-delete-row" data-multi-delete="${i}" aria-label="حذف حساب" style="font-size:12px">✕</button>`:''}</div>`).join('');
  calcMultiPay();
 };
 window.addMultiPayRow=function(){if(multiPayAccounts.length>=20){alert('الحد الأقصى 20 حساب دفع');return}multiPayAccounts.push({id:Date.now(),account:state.cashAccounts.find(a=>!multiPayAccounts.some(r=>r.account===a.id))?.id||state.cashAccounts[0]?.id||'',curr:state.currency,amount:0});renderMultiPayRows();emitMulti()};
 function emitMulti(){bridge.payments(multiPayAccounts.map(r=>({account:r.account,currency:state.currency,amount:String(r.amount||0)})))}
 document.addEventListener('input',e=>{
  if(syncing)return;
  if(e.target.id==='inv-discount')bridge.discount(e.target.value,$('inv-discount-type').value);
  if(e.target.hasAttribute('data-multi-amount')){let r=multiPayAccounts[Number(e.target.dataset.multiAmount)];if(r){r.amount=Number(e.target.value||0);emitMulti();calcMultiPay()}}
 });
 document.addEventListener('change',e=>{
  if(syncing)return;
  if(e.target.id==='warehouse-select')bridge.warehouse(e.target.value);
  if(e.target.id==='customer-select')bridge.customer(e.target.value);
  if(e.target.id==='currency-select')bridge.currency(e.target.value);
  if(e.target.id==='inv-discount-type')bridge.discount($('inv-discount').value,e.target.value);
  if(e.target.id==='allow-negative')bridge.negative(e.target.checked);
  if(e.target.closest('.invoice-meta-bar .form-group:nth-child(4)'))bridge.priceGroup(e.target.selectedIndex===1?'wholesale':'retail');
  if(e.target.id==='real-cash-account')bridge.cash(e.target.value);
  if(e.target.hasAttribute('data-multi-account')){let r=multiPayAccounts[Number(e.target.dataset.multiAccount)];if(r){r.account=e.target.value;emitMulti()}}
 });
 document.addEventListener('click',e=>{
  if(e.target.closest('.input-with-btn .btn-mini-add')&&e.target.closest('.form-group')?.querySelector('#customer-select'))bridge.addCustomer();
  if(e.target.closest('[data-multi-delete]')){multiPayAccounts.splice(Number(e.target.closest('[data-multi-delete]').dataset.multiDelete),1);renderMultiPayRows();emitMulti()}
  const scanner=e.target.closest('.search-box-row > .btn-mini-add');if(scanner&&bridge.camera)bridge.camera();
 });
 document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='product-search'){const val=e.target.value.trim();if(val&&bridge.scan(val)){e.preventDefault();e.stopImmediatePropagation();e.target.value='';renderProducts()} }},true);
 window.submitInvoice=async function(){if(!state?.cart?.length){alert('السلة فارغة! يرجى إضافة منتجات قبل اعتماد البيع.');return}
  const data={method:currentPayMethod,currency:$('currency-select').value,account:$('real-cash-account')?.value||state.cash,received:Number($('cash-received')?.value??state.totals.total),paid:Number($('partial-paid')?.value||0),down:Number($('inst-down')?.value||0),count:Number($('inst-count')?.value||3),date:$('inst-date')?.value||''};
  if(data.method==='multi')data.rows=multiPayAccounts.map(r=>({account:r.account,currency:state.currency,amount:r.amount}));
  if(data.method==='credit'){data.due=$('pay-panel-content')?.querySelector('input[type=date]')?.value;data.note=$('pay-panel-content')?.querySelector('input[type=text]:not([readonly])')?.value}if(data.method==='partial')data.due=$('pay-panel-content')?.querySelector('input[type=date]')?.value;
  try{const ok=await bridge.checkout(data);if(ok){multiPayAccounts=[{id:1,account:state.cash,curr:state.currency,amount:0}];}}catch(e){notify(e.message)}
 };
 window.previewPrint=function(){
  if(!state?.cart?.length){notify('لا يوجد أصناف لطباعة الفاتورة');return}
  const info=bridge.receipt();const x=escapeHTML;
  const rows=info.lines.map(l=>{const subtotal=l.qty*l.price-l.discount,net=Math.max(0,subtotal),tax=net*l.tax/100;return `<div class="receipt-row" style="align-items:start;gap:7px"><span style="flex:1">${x(l.name)} <small>${x(l.unit)} × ${x(l.qty)}</small></span><strong>${amount(net+tax)}</strong></div>`}).join('');
  const t=info.totals,root=$('receipt-content');
  root.innerHTML=`<div class="receipt-header">${info.logo?`<img src="${safeImage(info.logo)}" alt="شعار المحل" style="max-width:68px;max-height:60px;display:block;object-fit:contain;margin:0 auto 5px">`:''}<h3>${x(info.company)}</h3><div>${x(info.address)}</div><div>${x(info.phone)}</div><div style="margin-top:5px">معاينة غير معتمدة · ${x(info.date)}</div><small>${x(info.customer)}</small></div><div class="receipt-row"><strong>الصنف / الكمية</strong><strong>الإجمالي</strong></div><div class="receipt-divider"></div>${rows}<div class="receipt-divider"></div><div class="receipt-row"><span>قبل الخصم</span><b>${amount(t.gross)}</b></div><div class="receipt-row"><span>الخصم</span><b>${amount(t.discount)}</b></div><div class="receipt-row"><span>الضريبة</span><b>${amount(t.tax)}</b></div><div class="receipt-divider"></div><div class="receipt-row" style="font-size:14px;font-weight:800"><span>الإجمالي ${x(info.currency)}</span><b>${amount(t.total)}</b></div><div style="text-align:center;padding:10px 0 2px">شكراً لزيارتكم</div>`;
  $('print-modal').style.display='flex';
 };
 // Once original file finishes its DOMContentLoaded initialization, install company data.
 window.addEventListener('DOMContentLoaded',()=>{
  $('product-search')?.setAttribute('autocomplete','off');
  multiPayAccounts=[{id:1,account:'',curr:'ILS',amount:0}];
  const badge=document.querySelector('.status-pill');if(badge)badge.textContent='جاري تحميل بيانات شركة الوثيق…';
  // Explicit ready signal: parent reads the SAME active company as the mobile cashier.
  window.parent.postMessage({type:'watheeq:pos-ready',version:'4.4'},'*');
 });
 // Display actionable ERP errors within the copied cashier without replacing its design.
 let notificationTimer;
 function notify(message,kind='error'){
  let el=$('watheeq-pos-notice');if(!el){el=document.createElement('div');el.id='watheeq-pos-notice';el.setAttribute('role','alert');el.style.cssText='position:fixed;left:16px;bottom:65px;max-width:min(480px,calc(100vw - 32px));background:#0f172a;color:white;padding:12px 18px;border-radius:8px;z-index:9999;box-shadow:0 4px 20px #0003;font-weight:700;font-size:13px';document.body.append(el)}
  el.style.borderRight='5px solid '+(kind==='success'?'#10b981':'#ef4444');el.textContent=String(message);el.hidden=false;
  clearTimeout(notificationTimer);notificationTimer=setTimeout(()=>{el.hidden=true},6500);
 }
 window.WATHEEQ_POS_CHILD={sync,notify,connected:()=>!!state,company:()=>state?.company||''};
})();
