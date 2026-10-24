'use strict';
/* v4.1: Show user's ORIGINAL text.html in an isolated same-origin frame on laptop.
 * The original DOM and CSS are not reconstructed or emulated. The adapter alone
 * connects real ERP stock, cart, customer, tax, accounts and accounting posting. */
(()=>{
 const laptop=()=>window.matchMedia('(min-width:1024px)').matches;
 const prevPos=posPage;
 let frame=null,category='',search='',priceGroup='retail',globalDiscount='',discountKind='val',allowNegative=false,activeTenant=null;
 let payMode='cash', payRows=[], selling=false, lastInvoiceNumber='جديدة';
 const cashAccounts=()=>S.accounts.filter(a=>a.parent==='110'&&!S.accounts.some(b=>b.parent===a.id));
 const products=()=>S.products.filter(p=>!p.archived);
 const normMoney=n=>Number((n/100).toFixed(2));
 const initialUnit=l=>find('products',l.product)?.units[l.unit];
 function resetGlobal(){for(const l of cart){if(l.w41GlobalDiscount){l.discount=Math.max(0,(l.discount||0)-l.w41GlobalDiscount);l.w41GlobalDiscount=0}}}
 function applyGlobal(){resetGlobal();const allowed=cart.map(l=>Math.max(0,E.md(l.qty,l.price,1000)-(l.discount||0))),total=allowed.reduce((a,b)=>a+b,0);if(!total)return;
  let amount=0;try{amount=E.dec(String(globalDiscount||'0'))}catch{};
  amount=Math.max(0,discountKind==='pct'?Math.round(total*Math.min(10000,amount)/10000):amount);amount=Math.min(amount,total);
  let distributed=0;cart.forEach((l,i)=>{const portion=i===cart.length-1?amount-distributed:Math.min(allowed[i],Math.floor(amount*allowed[i]/total));l.discount=(l.discount||0)+portion;l.w41GlobalDiscount=portion;distributed+=portion});
 }
 function totalInfo(){let gross=0,tax=0,discount=0,quantity=0;
  cart.forEach(l=>{const p=find('products',l.product);if(!p)return;const base=E.md(l.qty,l.price,1000);const d=Math.min(base,l.discount||0),net=base-d;gross+=base;discount+=d;tax+=E.md(net,p.tax||0,10000);quantity+=l.qty/1000});
  return {gross:normMoney(gross),tax:normMoney(tax),discount:normMoney(discount),quantity,total:normMoney(gross-discount+tax),count:cart.length};
 }
 const codePoint=(p)=>p?.units?.[0]?.barcode||p?.code||'';
 function snapshot(){if(!S)return null;const tenant=window.WatheeqAuth?.identity?.companyId||'';if(tenant!==activeTenant){activeTenant=tenant;globalDiscount='';discountKind='val';payRows=[];payMode='cash';priceGroup='retail';allowNegative=false;lastInvoiceNumber='جديدة'}const curr=w34Pay.currency||S.settings.currency,wh=session.getItem('posWarehouse')||S.settings.defaultWarehouse||S.warehouses[0]?.id||'main';
  const ps=products();const pr=ps.map((p,i)=>{const u=p.units[0]||{},st=p.type==='service'?999999:E.stock(S,p.id,wh).qty;
   const priceOf=(idx)=>{const unit=p.units[idx];return priceGroup==='wholesale'&&unit.wholesale>0?unit.wholesale:E.priceFor(S,p.id,idx,posParty)};
   return {id:i+1,code:p.code||u.barcode||'',name:p.name,category:p.category||'',stock:p.type==='service'?999999:st/(u.factor||1000),unit:u.name||'قطعة',price:normMoney(priceOf(0)),units:p.units.map((v,j)=>({name:v.name,rate:v.factor/1000,price:normMoney(priceOf(j)),index:j})),img:p.image||'',kind:p.type,barcode:codePoint(p)};
  });
  const ct=cart.map((l,i)=>{const p=find('products',l.product),u=p?.units[l.unit];return {id:i+1,product:l.product,code:p?.code||u?.barcode||'',name:p?.name||'',img:p?.image||'',selectedUnit:u?.name||'قطعة',unitIndex:l.unit,units:(p?.units||[]).map((x,j)=>({name:x.name,index:j,price:normMoney(priceGroup==='wholesale'&&x.wholesale>0?x.wholesale:E.priceFor(S,p.id,j,posParty))})),price:normMoney(l.price),discount:normMoney(l.discount||0),qty:l.qty/1000,stock:0};});
  const rate=w31Rate(curr,posCash);const tot=totalInfo();const operator=window.WatheeqAuth?.identity?.account?.name||window.WatheeqAuth?.identity?.account?.username||'المستخدم';
  return {products:pr,cart:ct,categories:[...new Set(ps.map(p=>p.category).filter(Boolean))],warehouses:S.warehouses.map(w=>({id:w.id,name:w.name})),warehouse:wh,
   customers:S.parties.filter(p=>!p.archived&&['customer','both'].includes(p.type)).map(p=>({id:p.id,name:p.name})),customer:posParty||'',
   currencies:S.currencies.map(c=>({id:c.id,name:c.name})),currency:curr,rate:rate/1000000,baseCurrency:S.settings.currency,cashAccounts:cashAccounts().map(a=>({id:a.id,name:a.name})),cash:posCash,
   printSize:S.settings.print||'80mm',payMode,discountKind,globalDiscount,priceGroup,allowNegative:allowNegative&&!!S.settings.negativeStock,negativePermitted:!!S.settings.negativeStock,canEditPrice:typeof w34Manager!=='function'||w34Manager()||!!w34Me()?.permissions?.canEditPrice,held:S.drafts.filter(d=>d.kind==='sale').length,invoiceNumber:cart.length?'جديدة':(lastInvoiceNumber==='جديدة'?'جديدة':'آخر فاتورة: '+lastInvoiceNumber),operator,company:S.settings.company,
   logo:S.settings.logoMono||S.settings.logo||'',phone:S.settings.phone||'',address:S.settings.address||'',online:navigator.onLine,totals:tot,
   taxEffective:tot.gross-tot.discount>0?Math.round(tot.tax/(tot.gross-tot.discount)*10000)/100:0,payRows:payRows.map(x=>({...x})),receipt:{number:lastInvoiceNumber,company:S.settings.company,phone:S.settings.phone||'',address:S.settings.address||'',logo:S.settings.logoMono||S.settings.logo||'',currency:S.settings.currency,customer:S.parties.find(x=>x.id===posParty)?.name||'عميل نقدي',date:today(),totals:tot,lines:cart.map(l=>{const p=find('products',l.product);return {name:p?.name||'',unit:p?.units[l.unit]?.name||'',qty:l.qty/1000,price:l.price/100,discount:(l.discount||0)/100,tax:(p?.tax||0)/100}})}};
 }
 // Coalesce multiple render/sync notifications within a frame. Only send when data changes.
 let lastSnapshotPayload='', refreshQueued=false;
 function refresh(force=false){
  if(!frame?.isConnected)return;
  if(force)lastSnapshotPayload='';
  if(refreshQueued)return;
  refreshQueued=true;
  requestAnimationFrame(()=>{
   refreshQueued=false;
   if(!frame?.isConnected)return;
   try{
    const payload=snapshot();if(!payload)return;
    const serial=JSON.stringify(payload);
    if(serial===lastSnapshotPayload)return;
    lastSnapshotPayload=serial;
    frame.contentWindow?.postMessage({type:'watheeq:pos-sync',data:payload},'*');
   }catch(e){console.warn('POS sync',e)}
  });
 }
 // Read the current company-specific IndexedDB state, not demo data or a stale cached view.
 async function refreshFromStore(){
  if(!window.WatheeqAuth?.identity||!S)return;
  const incoming=await Store.read();
  if(incoming && window.WatheeqAuth.identity){
   // Keep the ERP's local draft/cart state, which belongs to the same active login.
   if(incoming.revision!==S.revision || incoming.products.length!==S.products.length){S=incoming;}
  }
  refresh();
 }
 function errorToUser(e){const msg=e?.message||String(e);try{if(frame?.contentWindow)frame.contentWindow.postMessage({type:'watheeq:pos-notice',message:msg,kind:'error'},'*');else toast(msg)}catch{toast(msg)}console.warn('[POS]',msg)}
 function doChange(index,key,value){const l=cart[index];if(!l) return false;resetGlobal();const p=find('products',l.product);try{
   if(key==='price'&&typeof w34Manager==='function'&&!w34Manager()&&!w34Me()?.permissions?.canEditPrice)throw Error('ليس لديك صلاحية تعديل سعر البيع');
   if(key==='qty'){const n=E.dec(String(value),3);if(n<=0||!Number.isSafeInteger(n))throw Error('أدخل كمية صحيحة');if(!p.units[l.unit].decimal&&n%1000)throw Error('هذه الوحدة لا تسمح بكمية كسرية');if(p.type!=='service'){const wh=session.getItem('posWarehouse')||S.settings.defaultWarehouse||S.warehouses[0]?.id||'main';const used=cart.reduce((sum,x,j)=>sum+(j===index?E.md(n,p.units[l.unit].factor,1000):x.product===p.id?E.md(x.qty,p.units[x.unit].factor,1000):0),0);if(used>E.stock(S,p.id,wh).qty)throw Error('لا توجد كمية كافية من '+p.name)}l.qty=n}
   else if(key==='unit'){const n=Number(value);if(!p.units[n])throw Error('الوحدة غير موجودة');if(p.type!=='service'){const wh=session.getItem('posWarehouse')||S.settings.defaultWarehouse||S.warehouses[0]?.id||'main';const used=cart.reduce((sum,x,j)=>sum+(x.product===p.id?E.md(x.qty,p.units[j===index?n:x.unit].factor,1000):0),0);if(used>E.stock(S,p.id,wh).qty)throw Error('الكمية غير متوفرة بهذه الوحدة')}l.unit=n;l.price=priceGroup==='wholesale'&&p.units[n].wholesale>0?p.units[n].wholesale:E.priceFor(S,p.id,n,posParty)}
   else if(key==='price'){const n=E.dec(String(value));if(n<0)throw Error('السعر غير صحيح');l.price=n}
   else if(key==='discount'){const n=E.dec(String(value));if(n<0||n>E.md(l.qty,l.price,1000))throw Error('قيمة الخصم تتجاوز إجمالي البند');l.discount=n}
   applyGlobal();persistCart();render();return true;
  }catch(e){applyGlobal();errorToUser(e);refresh();return false}
 }
 function remainingStock(product,unitIdx,warehouse){
  const p=find('products',product);if(!p||p.type==='service')return Infinity;
  const st=E.stock(S,p.id,warehouse).qty, inCart=cart.filter(x=>x.product===product).reduce((sum,l)=>sum+E.md(l.qty,p.units[l.unit].factor,1000),0);
  return st-inCart-E.md(1000,p.units[unitIdx].factor,1000);
 }
 function addProduct(num,unit=0){
  const p=products()[Number(num)-1];if(!p||!p.units?.[unit])return false;
  const wh=session.getItem('posWarehouse')||S.settings.defaultWarehouse||S.warehouses[0]?.id||'main';
  if(remainingStock(p.id,unit,wh)<0){errorToUser(Error('الكمية المطلوبة تتجاوز المخزون المتاح: '+p.name));return false}
  resetGlobal();
  const price=priceGroup==='wholesale'&&p.units[unit].wholesale>0?p.units[unit].wholesale:E.priceFor(S,p.id,unit,posParty);
  // Reuse the same product-to-cart operation as the phone cashier.
  addCart(p.id,unit);
  const line=cart.find(l=>l.product===p.id&&l.unit===unit);
  if(line && priceGroup==='wholesale'&&p.units[unit].wholesale>0)line.price=price;
  applyGlobal();persistCart();render();return true;
 }
 function paySetup(data={}){payMode=data.method||payMode;posMode=payMode;w34Pay.currency=data.currency||w34Pay.currency||S.settings.currency;
  if(data.account&&cashAccounts().some(a=>a.id===data.account))posCash=data.account;
  if(payMode==='partial'){w34Pay.amount=String(data.paid??'0');}
  if(payMode==='installment'){w34Pay.amount=String(data.down??'0');w34Pay.count=String(data.count||3);w34Pay.date=data.date||today()}
  if(payMode==='credit'){w34Pay.amount='0'}
  if(payMode==='multi'){payRows=(data.rows||[]).map(r=>({account:r.account||posCash,currency:r.currency||w34Pay.currency,amount:String(r.amount||0)}));w35SplitRows=payRows.map(x=>({...x}));}
 }
 const bridge={
  snapshot,
  back:()=>{location.hash='#dashboard'},
  returnInvoice:()=>{location.hash='#invoices';toast('اختر الفاتورة الأصلية من سجل الفواتير للمرتجع')},
  customer:id=>{posParty=id||'';resetGlobal();cart.forEach(l=>{let p=find('products',l.product);if(p)l.price=priceGroup==='wholesale'&&p.units[l.unit].wholesale>0?p.units[l.unit].wholesale:E.priceFor(S,p.id,l.unit,posParty)});applyGlobal();persistCart();render()},
  addCustomer:()=>editEntity('parties'),
  warehouse:id=>{if(!S.warehouses.some(x=>x.id===id))return;session.setItem('posWarehouse',id);render()},
  currency:id=>{if(S.currencies.some(x=>x.id===id)){w34Pay.currency=id;refresh()}},
  cash:id=>{if(cashAccounts().some(x=>x.id===id)){posCash=id;refresh()}},
  priceGroup:mode=>{priceGroup=mode==='wholesale'?'wholesale':'retail';resetGlobal();cart.forEach(l=>{let p=find('products',l.product);if(p)l.price=priceGroup==='wholesale'&&p.units[l.unit].wholesale>0?p.units[l.unit].wholesale:E.priceFor(S,p.id,l.unit,posParty)});applyGlobal();persistCart();render()},
  negative:bool=>{if(bool&&!S.settings.negativeStock){allowNegative=false;errorToUser(Error('تفعيل البيع بالسالب غير مدعوم في محرك المخزون الحالي؛ لا يمكن اعتماد عملية تتجاوز الرصيد'));}else allowNegative=!!bool;refresh()},
  discount:(value,kind)=>{resetGlobal();globalDiscount=String(value||'0');discountKind=kind==='pct'?'pct':'val';applyGlobal();persistCart();render()},
  addProduct,scan:input=>{const code=String(input||'').trim(),p=products().find(x=>x.units.some(u=>u.barcode===code)||x.code===code);if(!p){errorToUser(Error('الباركود غير مسجل في أصناف الشركة'));return false}const unit=p.units.findIndex(u=>u.barcode===code);return addProduct(products().indexOf(p)+1,unit<0?0:unit)},
  change:doChange,
  adjust:(i,n)=>{const l=cart[i];if(!l)return;const p=find('products',l.product);const step=p?.units[l.unit]?.decimal?0.001:1;return doChange(i,'qty',String(Math.max(step,l.qty/1000+(n*step))))},
  remove:i=>{resetGlobal();cart.splice(i,1);applyGlobal();persistCart();render()},
  newInvoice:()=>{if(cart.length&&!confirm('فتح فاتورة جديدة وتفريغ السلة؟'))return;cart=[];globalDiscount='';w35SplitRows=[];persistCart();render()},
  clear:()=>{if(cart.length&&!confirm('هل تريد تفريغ السلة؟'))return;cart=[];globalDiscount='';persistCart();render()},
  hold:async()=>{if(!cart.length){toast('السلة فارغة');return}await actions.suspend();if(!cart.length){globalDiscount='';payRows=[];payMode='cash';posMode='cash';refresh()}},
  holds:()=>actions.drafts(),
  camera:()=>actions.camera(),
  setPay:method=>{payMode=method;posMode=method;refresh()},
  accounts:()=>cashAccounts().map(a=>({id:a.id,name:a.name})),
  payments:rows=>{payRows=rows.map(r=>({...r}));w35SplitRows=payRows.map(r=>({...r,amount:String(r.amount||'')}))},
  checkout:async data=>{
   if(selling)return false;
   selling=true;
   try{
    if(!S || !window.WatheeqAuth?.identity)throw Error('بيانات الشركة غير محمّلة؛ سجّل الدخول أولاً');
    WatheeqPermissions.require('pos','create');
    if(!cart.length)throw Error('أضف أصنافاً إلى السلة أولاً');
    const mode=data.method||payMode,currency=data.currency||S.settings.currency,account=data.account||posCash;
    if(!['cash','credit','partial','multi','installment'].includes(mode))throw Error('طريقة دفع غير معتمدة');
    if(!S.currencies.some(c=>c.id===currency))throw Error('عملة الدفع غير معتمدة');
    if(!cashAccounts().some(a=>a.id===account))throw Error('اختر صندوقاً أو بنكاً معتمداً في الوثيق');
    if(['credit','partial','installment'].includes(mode)&&!posParty)throw Error('اختر عميلاً لتسجيل الرصيد المتبقي عليه');
    const total=w34Total();
    if(total<=0)throw Error('إجمالي الفاتورة يجب أن يكون أكبر من صفر');
    if(mode==='cash'){
     const due=total/100/(w31Rate(currency,account)/1000000);
     if(Number(data.received??due)+0.005<due)throw Error('المبلغ المستلم أقل من الإجمالي؛ اختر الدفع الجزئي');
    }
    // Feed the exact state and exact multi-payment rows used by the PHONE cashier.
    posMode=payMode=mode;
    posCash=account;
    w34Pay.currency=currency;
    w34Pay.amount=mode==='credit'?'0':String(mode==='installment'?(data.down??0):(data.paid??0));
    if(mode==='installment'){
     const count=Number(data.count||3);
     if(!Number.isInteger(count)||count<1||count>120)throw Error('عدد الأقساط غير صحيح');
     w34Pay.count=String(count);w34Pay.date=data.date||today();
    }
    if(mode==='multi'){
     const rows=(data.rows||[]).map(row=>({account:row.account||account,currency:row.currency||currency,amount:String(row.amount||0)}));
     if(!rows.length||!rows.some(r=>Number(r.amount)>0))throw Error('أدخل مبلغاً في حساب دفع واحد على الأقل');
     for(const row of rows){
      if(!cashAccounts().some(a=>a.id===row.account))throw Error('حساب دفع غير صالح');
      if(!S.currencies.some(c=>c.id===row.currency))throw Error('عملة دفع غير صالحة');
     }
     w35SplitRows=rows;payRows=rows;
    }
    // Do NOT post a second ERP invoice implementation. This is the SAME checkout
    // function that the mobile cashier's Sell button executes, including shift,
    // permissions, installments, journal entries, debt and inventory logic.
    const originalCart=cart.length;
    const oldIds=new Set(S.docs.map(d=>d.id));
    let checkoutProblem='';const previousError=error;
    try{
     error=function(e){checkoutProblem=e?.message||String(e);return previousError(e)};
     await actions.checkout();
    }finally{error=previousError}
    const posted=S.docs.find(d=>!oldIds.has(d.id)&&d.kind==='sale');
    if(!posted){
     if(checkoutProblem)throw Error(checkoutProblem);
     if(!w31Active())throw Error('افتح الوردية قبل اعتماد الفاتورة');
     throw Error(originalCart?'لم تُعتمد الفاتورة؛ راجع بيانات الدفع والوردية':'لم تُعتمد الفاتورة');
    }
    lastInvoiceNumber=posted.number||posted.id;
    globalDiscount='';discountKind='val';payRows=[];payMode=posMode='cash';w35SplitRows=[];
    render();
    try{frame?.contentWindow?.postMessage({type:'watheeq:pos-notice',message:'تم اعتماد الفاتورة '+lastInvoiceNumber,kind:'success'},'*')}catch{}
    return true;
   }catch(e){errorToUser(e);return false}
   finally{selling=false}
  },
  receipt:()=>({number:lastInvoiceNumber,company:S.settings.company,phone:S.settings.phone||'',address:S.settings.address||'',logo:S.settings.logoMono||S.settings.logo||'',currency:S.settings.currency,customer:S.parties.find(x=>x.id===posParty)?.name||'عميل نقدي',date:today(),totals:totalInfo(),lines:cart.map(l=>{const p=find('products',l.product);return {name:p?.name||'',unit:p?.units[l.unit]?.name||'',qty:l.qty/1000,price:l.price/100,discount:(l.discount||0)/100,tax:(p?.tax||0)/100}})}),
  print:()=>{
   const t=totalInfo();if(!cart.length){toast('لا يوجد أصناف لطباعة الفاتورة');return}
   const escSafe=x=>esc(String(x??''));
   const rows=cart.map(l=>{const p=find('products',l.product);return `<tr><td>${escSafe(p?.name||'')}</td><td>${escSafe(qnum(l.qty))} ${escSafe(p?.units[l.unit]?.name||'')}</td><td>${money(E.md(l.qty,l.price,1000)-(l.discount||0))}</td></tr>`}).join('');
   const content=`<div class="receipt"><div style="text-align:center">${S.settings.logo?`<img alt="شعار المحل" style="width:65px;max-height:65px;object-fit:contain" src="${escSafe(S.settings.logoMono||S.settings.logo)}">`:''}</div><h2 style="text-align:center">${escSafe(S.settings.company)}</h2><div class="center">${escSafe(S.settings.address)} · ${escSafe(S.settings.phone)}</div><p class="center">معاينة فاتورة غير معتمدة — ${escSafe(today())}</p><table><thead><tr><th>الصنف</th><th>الكمية</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table><div class="totals"><b>المجموع: ${t.total.toFixed(2)} ${escSafe(S.settings.currency)}</b></div></div>`;
   printHTML(content);
  }
 };
 window.WatheeqPOSBridge=bridge;
 posPage=function(){return laptop()?'<div id="w41-pos-placeholder" aria-hidden="true"></div>':prevPos()};
 const prevRender=render;
 render=function(...args){const result=prevRender.apply(this,args);const wanted=laptop()&&route==='pos'&&!!S;
  if(wanted){if(!frame){frame=document.createElement('iframe');frame.id='w41-exact-pos';frame.title='نقطة البيع — التصميم الأصلي';frame.setAttribute('aria-label','شاشة نقطة البيع');frame.style.cssText='position:fixed;inset:0;width:100vw;height:100dvh;border:0;background:#f1f5f9;z-index:90;display:block';frame.src='./pos-v44.html';
    frame.onload=()=>{lastSnapshotPayload='';refreshFromStore().catch(e=>{console.error('[Watheeq POS] Data load:',e);errorToUser(e)})};document.body.append(frame)}else refresh()}
  else if(frame){frame.remove();frame=null;lastSnapshotPayload=''}
  document.body.classList.toggle('w41-pos-active',wanted);return result;};
 const style=document.createElement('style');style.textContent='@media(min-width:1024px){body.w41-pos-active{overflow:hidden!important}body.w41-pos-active #w40-pos{display:none!important}body.w41-pos-active #modal:not([hidden]),body.w41-pos-active #choicePage:not([hidden]),body.w41-pos-active #busyIndicator:not([hidden]),body.w41-pos-active #v19ShiftSheet{z-index:1005!important}body.w41-pos-active #toast{z-index:1008!important}}@media print{#w41-exact-pos{display:none!important}}';document.head.append(style);
 window.addEventListener('resize',()=>{if(S&&route==='pos')render()},{passive:true});
 // Most ERP mutations call render, but window-focus/cloud sync can also change data asynchronously.
 window.addEventListener('online',refresh);window.addEventListener('offline',refresh);
 // Child can load before/after the parent becomes ready; always deliver current company data.
 // The original POS page is an isolated design-only view. postMessage also works
 // in TrebEdit's file:// device emulator, where parent frame property access fails.
 const commands=new Set(['back','returnInvoice','customer','addCustomer','warehouse','currency','cash',
  'priceGroup','negative','discount','addProduct','scan','change','adjust','remove',
  'newInvoice','clear','hold','holds','camera','setPay','payments','checkout','print']);
 window.addEventListener('message',async event=>{
  if(!frame||event.source!==frame.contentWindow||route!=='pos'||!S)return;
  const data=event.data||{};
  if(data.type==='watheeq:pos-ready'){
   try{await refreshFromStore()}catch(e){errorToUser(e);refresh()}
   return;
  }
  if(data.type!=='watheeq:pos-cmd'||!commands.has(data.command))return;
  const id=data.requestId;
  try{
   const result=await bridge[data.command](...(Array.isArray(data.args)?data.args:[]));
   if(id!==undefined)frame?.contentWindow?.postMessage({type:'watheeq:pos-reply',requestId:id,ok:true,result:result??null},'*');
  }catch(e){
   errorToUser(e);
   if(id!==undefined)frame?.contentWindow?.postMessage({type:'watheeq:pos-reply',requestId:id,ok:false,message:e?.message||String(e)},'*');
  }
 });
 window.addEventListener('watheeq:remote',()=>{if(frame)refreshFromStore().catch(errorToUser)});
 window.addEventListener('watheeq:sync',()=>{if(frame)refresh()});
 if(S)render();
})();
