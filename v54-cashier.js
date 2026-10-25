'use strict';
(()=>{
 window.WatheeqCashierKind='sale';
 const purchase=()=>window.WatheeqCashierKind==='purchase',bridge=window.WatheeqPOSBridge;
 window.w54PurchasePrice=(p,i)=>{
  const wh=session.getItem('posWarehouse')||S.settings.defaultWarehouse||'main',st=E.stock(S,p.id,wh),u=p.units[i];
  if(Number.isSafeInteger(u.buyPrice)&&u.buyPrice>=0)return u.buyPrice;
  if(Number.isSafeInteger(u.cost)&&u.cost>=0)return u.cost;
  return st.qty>0?E.md(st.value,u.factor,st.qty):0;
 };
 let savedSale=null,savedPurchase=null,tenant=null;
 const capture=()=>({cart:E.clone(cart),party:posParty,mode:posMode,pay:{...w34Pay},rows:E.clone(w35SplitRows),discount:bridge.discountState()});
 function kind(next){
  const company=window.WatheeqAuth?.identity?.companyId||'';
  if(company!==tenant){tenant=company;savedSale=savedPurchase=null;window.WatheeqCashierKind='sale';bridge.snapshot();try{savedPurchase=JSON.parse(session.getItem('watheeq-purchase-state-'+company)||'null')}catch{}}
  if(next===window.WatheeqCashierKind)return;
  if(purchase())savedPurchase=capture();else savedSale=capture();
  window.WatheeqCashierKind=next;
  const state=purchase()?savedPurchase:savedSale;
  cart=state?.cart||[];posParty=state?.party||'';posMode=state?.mode||'cash';
  Object.assign(w34Pay,state?.pay||{amount:'',currency:S.settings.currency});w35SplitRows=state?.rows||[];
  bridge.restoreDiscount(state?.discount.value,state?.discount.kind);bridge.setPay(posMode);posPane='products';query='';persistCart();
 }
 window.w54OpenCashier=next=>{WatheeqPermissions.require(next==='purchase'?'purchases':'pos','create');kind(next);if($('#modal').open){$('#modal').hidden=true;$('#modal').open=false;document.body.classList.remove('form-open');history.replaceState(null,'')}location.hash='#pos';route='pos';render()};
 const newDocument=newDoc;newDoc=function(k){if(purchase())kind('sale');return newDocument(k)};
 document.addEventListener('click',e=>{if(e.target.closest('a[href="#pos"]')&&S)kind('sale')},true);
 const saveCart=persistCart;persistCart=function(){if(purchase()){session.setItem('watheeq-purchase-state-'+(window.WatheeqAuth?.identity?.companyId||''),JSON.stringify(capture()));return}saveCart()};
 const stockCheck=enoughForCart;enoughForCart=function(id,unit,amount,except){if(!purchase())return stockCheck(id,unit,amount,except);const u=find('products',id)?.units[unit];return !!u&&Number.isSafeInteger(amount)&&amount>0&&(u.decimal||amount%1000===0)};
 const oldAdd=addCart;addCart=function(id,unit=0){if(!purchase())return oldAdd(id,unit);const p=find('products',id);if(!p||p.archived||!p.units[unit])return;let l=cart.find(x=>x.product===id&&x.unit===unit);if(l)l.qty+=1000;else cart.push({product:id,unit,qty:1000,price:window.w54PurchasePrice(p,unit),discount:0});persistCart();render()};
 window.w54PurchaseCheckout=async(data={})=>{
  if(w34Selling)return false;
  WatheeqPermissions.require('purchases','create');
  if(!cart.length)throw Error('أضف أصنافاً إلى فاتورة الشراء');
  if(!S.parties.some(p=>p.id===posParty&&!p.archived&&['supplier','both'].includes(p.type)))throw Error('اختر المورد أولاً');
  const mode=data.method||posMode,currency=data.currency||w34Pay.currency||S.settings.currency,account=data.account||posCash;
  if(!['cash','credit','partial','multi'].includes(mode))throw Error('طريقة دفع غير صالحة للمشتريات');
  if(!S.currencies.some(c=>c.id===currency)||!w35CashAccounts().some(a=>a.id===account))throw Error('اختر عملة وحساب دفع صالحين');
  const total=w34Total();if(total<=0)throw Error('أدخل تكلفة الشراء للأصناف');
  let payments=[];
  if(mode==='multi'){if(data.rows)w35SplitRows=data.rows.map(r=>({...r,amount:String(r.amount||0)}));payments=w35GetSplits();if(!payments.length)throw Error('أدخل دفعة واحدة على الأقل')}
  else if(mode!=='credit'){const rate=w31Rate(currency,account),amount=mode==='cash'?E.md(total,1000000,rate):E.dec(String(data.paid??w34Pay.amount??'0'));if(amount<0)throw Error('المبلغ غير صحيح');if(amount)payments.push({account,currency,rate,amount})}
  const paid=E.sum(payments,p=>E.md(p.amount,p.rate,1000000));if(paid>total)throw Error('المدفوع أكبر من إجمالي الفاتورة');
  const input={id:E.uid(),kind:'purchase',source:'purchase-cashier',date:today(),due:data.due||today(),note:data.note||'',warehouse:session.getItem('posWarehouse')||S.settings.defaultWarehouse||'main',party:posParty,currency:S.settings.currency,rate:1000000,lines:E.clone(cart),payments};
  w34Selling=true;try{const doc=await mutate(s=>E.post(s,input),'تم حفظ المشتريات وتحديث المخزون وحساب المورد');cart=[];bridge.restoreDiscount('','val');w35SplitRows=[];w34Pay.amount='';persistCart();render();return doc}finally{w34Selling=false}
 };
 const checkout=actions.checkout;actions.checkout=async()=>{if(!purchase())return checkout();try{return await window.w54PurchaseCheckout()}catch(e){error(e)}};
 const hold=actions.suspend;actions.suspend=async()=>{if(!purchase())return hold();if(!cart.length)return;await mutate(s=>s.drafts.push({id:E.uid(),kind:'purchase',warehouse:session.getItem('posWarehouse')||'main',party:posParty,lines:E.clone(cart),saved:today()}),'تم تعليق فاتورة الشراء');cart=[];bridge.restoreDiscount('','val');persistCart();render()};
 document.addEventListener('change',e=>{
  if(!purchase())return;const x=e.target;
  if(x.dataset.cartUnit!==undefined){e.stopImmediatePropagation();const l=cart[Number(x.dataset.cartUnit)],p=find('products',l.product);l.unit=Number(x.value);l.price=window.w54PurchasePrice(p,l.unit);persistCart();render()}
 },true);
 const paymentUI=w34PaymentUI;w34PaymentUI=function(){paymentUI();const discount=document.querySelector('.pos .w54-discount'),details=document.querySelector('.pos #w34InlinePay');if(discount&&details)details.before(discount);if(purchase())document.querySelectorAll('.pos [data-posmode="installment"]').forEach(x=>x.remove())};
 const previous=render;
 render=function(...args){
  if(S&&route==='pos'){if(!cart.length)bridge.restoreDiscount('','val');bridge.recalculateDiscount();}
  const result=previous.apply(this,args);if(!S||route!=='pos')return result;
  if(innerWidth>=1024)return result;
  const root=$('.pos');if(!root)return result;
  root.classList.toggle('w54-purchase',purchase());
  if(purchase())document.querySelectorAll('#content [data-action=shift]').forEach(b=>{b.textContent='كاشير المشتريات';b.removeAttribute('data-action');b.disabled=true});
  if(purchase()){
   root.querySelectorAll('.product').forEach(b=>{b.disabled=false;b.classList.remove('out-of-stock');b.querySelector('.out-label')?.remove();const p=find('products',b.dataset.cart);if(p){const price=b.querySelector('.product-detail strong');if(price)price.textContent=money(window.w54PurchasePrice(p,0))+' '+S.settings.currency}});
   const customer=root.querySelector('[name=posCustomer]');if(customer){customer.innerHTML=options([{id:'',name:'اختر المورد'},...S.parties.filter(p=>!p.archived&&['supplier','both'].includes(p.type))],posParty);const label=customer.closest('label');if(label){const t=[...label.childNodes].find(n=>n.nodeType===3);if(t)t.textContent='المورد';const caption=label.querySelector('span');if(caption)caption.textContent='المورد'}customer.onchange=()=>{posParty=customer.value;persistCart()};}
   root.querySelectorAll('[data-posmode="installment"]').forEach(x=>x.remove());
   root.querySelectorAll('[data-action="checkout"]').forEach(b=>b.innerHTML=icon('save')+' حفظ المشتريات');
   const title=$('#content .page-heading h1,#content .page-title h1,#content h1');if(title)title.textContent='كاشير المشتريات';
  }
  const review=root.querySelector('.review-panel')||root.querySelector('.cart');
  if(review&&!review.querySelector('.w54-discount')){
   const state=bridge.discountState(),box=document.createElement('div');box.className='w54-discount';
   box.innerHTML='<label>خصم الفاتورة<input id="w54Discount" type="number" min="0" step="0.01" inputmode="decimal" value="'+esc(state.value||'0')+'"></label><label>نوع الخصم<select id="w54DiscountKind"><option value="val">مبلغ ثابت</option><option value="pct">نسبة %</option></select></label>';
   const details=review.querySelector('#w34InlinePay');if(details)details.before(box);else review.querySelector('.payment-modes')?.after(box);box.querySelector('select').value=state.kind;
   box.addEventListener('change',()=>bridge.discount(box.querySelector('input').value,box.querySelector('select').value));
  }
  return result;
 };
})();
