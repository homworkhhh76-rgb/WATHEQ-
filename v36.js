'use strict';
/* WATHEEQ v3.6 — laptop top navigation and Cash Top-inspired POS.
   Sales are still posted exclusively through the existing, audited ERP checkout.
   No Cash Top storage, credentials, database or financial calculation is imported. */
(() => {
 const isLaptop = () => window.matchMedia('(min-width:1024px)').matches;
 const accessible = k => !window.WatheeqAuth || !WatheeqAuth.can || WatheeqAuth.can(k);
 const navGroups = [
  ['الأعمال','shopping-cart',['dashboard','pos','sales','purchases','invoices','orders','expenses','vouchers','employees']],
  ['الأصناف والمخزون','package',['products','catalog','inventory','damage','manufacture','stockCurrent']],
  ['المحاسبة','wallet',['accounts','installments','taxRates','profit']],
  ['الأطراف','users',['parties','reps','groups','messages']],
  ['التقارير','chart',['reports','trading','popular','popularProducts','cashierRecords']],
  ['الإعدادات','settings',['settings','more']]
 ];
 const saleIcon = (which) => {
  const paths = {
   'shopping-cart':'M3 4h2l2.3 11.3h11l2.4-8.1H6M9 20h.01M18 20h.01',
   package:'M12 2 21 7v10l-9 5-9-5V7l9-5Zm-9 5 9 5 9-5M12 12v10',
   wallet:'M4 5h15v15H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm16 5h2v6h-7a3 3 0 0 1 0-6h5Z',
   users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
   chart:'M3 3v18h18M7 15l5-5 4 3 5-7',
   settings:'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1 1 0 0 0 .2 1.1l.1.1-2 2-.1-.1a1 1 0 0 0-1.1-.2 8 8 0 0 1-1.5.6 1 1 0 0 0-.7.9V20h-3v-.6a1 1 0 0 0-.7-.9 8 8 0 0 1-1.5-.6 1 1 0 0 0-1.1.2l-.1.1-2-2 .1-.1a1 1 0 0 0 .2-1.1 8 8 0 0 1-.6-1.5 1 1 0 0 0-.9-.7H4v-3h.7a1 1 0 0 0 .9-.7 8 8 0 0 1 .6-1.5 1 1 0 0 0-.2-1.1L6 6.4l2-2 .1.1a1 1 0 0 0 1.1.2 8 8 0 0 1 1.5-.6 1 1 0 0 0 .7-.9V3h3v.6a1 1 0 0 0 .7.9 8 8 0 0 1 1.5.6 1 1 0 0 0 1.1-.2l.1-.1 2 2-.1.1a1 1 0 0 0-.2 1.1 8 8 0 0 1 .6 1.5 1 1 0 0 0 .9.7h.6v3h-.6a1 1 0 0 0-.9.7Z'
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="${paths[which]||paths.package}"/></svg>`;
 };
 let lastSelected=null,selectedUnit={},lastScanAt=0;
 const oldBarcode=addBarcode;
 addBarcode=function(code){
  const safe=String(code||'').trim();
  if(!safe)return false;
  // A successful scanner Enter must never trigger a sale at the same time.
  lastScanAt=Date.now();
  const result=oldBarcode(safe);
  if(result){const p=S.products.find(p=>!p.archived&&p.units.some(u=>u.barcode===safe));if(p)lastSelected=p.id;}
  return result;
 };
 const oldPosPage=posPage;
 posPage=function(){
  if(!isLaptop())return oldPosPage();
  const warehouse=session.getItem('posWarehouse')||S.settings.defaultWarehouse||'main';
  const ps=S.products.filter(p=>!p.archived&&match(p)&&(!posCategory||p.category===posCategory));
  const groups=[...new Set(S.products.filter(p=>!p.archived).map(p=>p.category).filter(Boolean))];
  const selectedIndex=cart.findIndex(x=>x.product===lastSelected);
  const focusLine=selectedIndex<0?cart.length-1:selectedIndex;
  const line=cart[focusLine],lineProduct=line&&find('products',line.product);
  const net=E.sum(cart,l=>E.md(l.qty,l.price,1000)-(l.discount||0));
  const tax=E.sum(cart,l=>E.md(E.md(l.qty,l.price,1000)-(l.discount||0),find('products',l.product)?.tax||0,10000));
  const grand=net+tax;
  const count=cart.reduce((sum,l)=>sum+l.qty/1000,0);
  return `<div class="w36-pos-shell">
   <div class="w36-posbar">
    <div class="w36-control w36-qty"><label>الكمية</label><button type="button" data-w36-decrease aria-label="تقليل الكمية">−</button><input id="w36QuickQty" inputmode="decimal" aria-label="الكمية المختارة" value="${line?qnum(line.qty):'1'}" ${!line?'disabled':''}><button type="button" data-w36-increase aria-label="زيادة الكمية">＋</button></div>
    <label class="w36-control w36-quick-unit"><span>الوحدة</span><select id="w36QuickUnit" ${!line?'disabled':''}>${lineProduct?lineProduct.units.map((u,j)=>`<option value="${j}" ${j===line.unit?'selected':''}>${esc(u.name)}</option>`).join(''):'<option>—</option>'}</select></label>
    <label class="w36-control w36-quick-price"><span>السعر</span><input id="w36QuickPrice" inputmode="decimal" value="${line?num(line.price):'0'}" ${!line?'disabled':''}></label>
    <label class="w36-control w36-cash"><span>صندوق الدفع</span><select id="w36QuickCash">${options(S.accounts.filter(a=>a.parent==='110'&&!S.accounts.some(x=>x.parent===a.id)),posCash)}</select></label>
   </div>
   <div class="cashier-tabs w36-hidden-legacy" hidden></div>
   <div class="pos w36-pos" data-pane="products">
    <section class="panel catalog-panel w36-catalog">
     <div class="w36-catalog-top"><h2>كافة الأصناف <small>(${ps.length})</small></h2><div class="pos-search">${icon('search')}<input id="search" autocomplete="off" placeholder="ابحث عن صنف بالاسم أو الكود أو الباركود [F2]" value="${esc(query)}"></div><select id="posWarehouse" title="المستودع" aria-label="المستودع">${options(S.warehouses,warehouse)}</select></div>
     <div class="category-strip"><button type="button" data-category="" class="${!posCategory?'active':''}">كافة الأصناف (${S.products.filter(p=>!p.archived).length})</button>${groups.map(group=>`<button type="button" data-category="${esc(group)}" class="${posCategory===group?'active':''}">${esc(group)}</button>`).join('')}</div>
     <div class="products w36-products">${ps.slice(0,150).map(p=>{
      const unitIndex=selectedUnit[p.id]??0,validIndex=p.units[unitIndex]?unitIndex:0;
      const inCart=cart.some(l=>l.product===p.id),stock=E.stock(S,p.id,warehouse);
      return `<article class="product w36-product ${inCart?'w36-in-cart':''} ${lastSelected===p.id?'w36-selected':''}" tabindex="0" role="button" data-cart="${esc(p.id)}" data-w36-product="${esc(p.id)}" aria-label="أضف ${esc(p.name)} إلى الفاتورة">
       <div class="product-visual">${p.image?`<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`:`<div class="package-art">${icon('products')}</div>`}<span class="w36-product-stock">${p.type==='service'?'خدمة':qty(stock.qty)+' متوفر'}</span></div>
       <div class="product-detail"><b>${esc(p.name)}</b><strong>${money(E.priceFor(S,p.id,validIndex,posParty))} <small>${esc(S.settings.currency)}</small></strong>
       <div class="w36-card-bottom"><select data-w36-product-unit="${esc(p.id)}" aria-label="وحدة ${esc(p.name)}">${p.units.map((u,j)=>`<option value="${j}" ${j===validIndex?'selected':''}>${esc(u.name)}</option>`).join('')}</select><span>${esc(p.code||'')}</span></div></div></article>`}).join('')||'<div class="empty">لا توجد أصناف مطابقة</div>'}</div>
     ${ps.length>150?'<p class="muted">استخدم البحث لعرض المزيد من الأصناف.</p>':''}
    </section>
    <section class="panel cart w36-cart">
     <div class="panel-title w36-cart-head"><h2>الفاتورة الحالية</h2><span class="badge">${cart.length} بند</span></div>
     <div class="w36-cart-metadata">${select('العميل','posCustomer',S.parties.filter(p=>['customer','both'].includes(p.type)),posParty,true)}</div>
     <div class="w36-cart-table-head"><span>الصنف</span><span>الوحدة</span><span>الكمية</span><span>السعر</span><span>الإجمالي</span><span></span></div>
     <div class="cart-list w36-cart-list">${cart.map((l,i)=>{const p=find('products',l.product);if(!p)return '';return `<div class="cart-item w36-cart-row ${i===focusLine?'w36-active-row':''}" data-w36-line="${i}"><div class="cart-name"><b>${esc(p.name)}</b></div><select data-cart-unit="${i}" aria-label="الوحدة">${p.units.map((u,j)=>`<option value="${j}" ${j===l.unit?'selected':''}>${esc(u.name)}</option>`).join('')}</select><div class="w36-line-qty"><button type="button" data-w36-row-minus="${i}" aria-label="نقص">−</button><input data-cart-qty="${i}" aria-label="الكمية" value="${qnum(l.qty)}" inputmode="decimal"><button type="button" data-w36-row-plus="${i}" aria-label="زيادة">＋</button></div><input data-cart-price="${i}" aria-label="السعر" value="${num(l.price)}" inputmode="decimal"><strong>${money(E.md(l.qty,l.price,1000)-(l.discount||0))}</strong><button type="button" data-cart-delete="${i}" aria-label="حذف البند">×</button></div>`}).join('')||'<div class="empty">امسح باركود صنف أو اختر صنفاً من القائمة</div>'}</div>
     <div class="w36-cart-bottom review-panel">
       <div class="payment-modes">${[['cash','نقدي'],['credit','آجل'],['partial','جزئي'],['multi','دفع متعدد'],['installment','أقساط']].map(([k,l])=>`<button type="button" data-posmode="${k}" class="${posMode===k?'active':''}">${l}</button>`).join('')}</div>
       <div class="w36-summary"><div><span>الضريبة</span><b>${money(tax)}</b></div><div><span>الإجمالي</span><strong>${money(grand)} ${esc(S.settings.currency)}</strong></div><div><span>عدد القطع</span><b>${count.toLocaleString('en-US',{maximumFractionDigits:3})}</b></div></div>
       <div class="w36-bottom-actions"><button type="button" class="primary checkout" data-action="checkout">${icon('save')} بيع وحفظ [Enter]</button><button type="button" data-action="suspend">تعليق الفاتورة</button><button type="button" data-action="drafts">المعلّقة</button><button type="button" data-action="clearCart">إلغاء الفاتورة [Esc]</button></div>
     </div>
    </section>
   </div>
  </div>`;
 };
 // Add a selected product in its selected unit, not always unit zero.
 function focusCartProduct(product, unit=0){
  if(!S || !accessible('pos'))return;
  lastSelected=product;
  try{addCart(product,unit)}catch(e){error(e)}
 }
 function adjustLine(index, step){
  if(index<0||!cart[index])return;
  const l=cart[index],p=find('products',l.product);
  // Fractional items use .001 unit; whole items use one.
  const inc=p?.units[l.unit]?.decimal?1:1000;
  l.qty=Math.max(inc,l.qty+step*inc);
  lastSelected=l.product;persistCart();render();
 }
 function selectedLine(){let i=cart.findIndex(x=>x.product===lastSelected);return i>=0?i:cart.length-1}
 function updateQuick(field,value){
  const i=selectedLine();if(i<0)return;
  const l=cart[i];
  try{
   if(field==='qty'){const v=E.dec(value,3);if(v<=0)throw Error('الكمية يجب أن تكون أكبر من صفر');l.qty=v;}
   if(field==='price'){const v=E.dec(value);if(v<0)throw Error('السعر غير صالح');l.price=v;}
   if(field==='unit'){l.unit=Number(value);l.price=E.priceFor(S,l.product,l.unit,posParty);}
   persistCart();render();
  }catch(e){error(e);render()}
 }
 document.addEventListener('click',e=>{
  if(!isLaptop()||route!=='pos'||!S)return;
  const target=e.target,product=target.closest('[data-w36-product]');
  if(product&&!target.closest('select,option,button,input')){e.preventDefault();e.stopImmediatePropagation();focusCartProduct(product.dataset.w36Product,selectedUnit[product.dataset.w36Product]??0);return;}
  const minus=target.closest('[data-w36-row-minus],[data-w36-row-plus],[data-w36-decrease],[data-w36-increase]');
  if(minus){e.preventDefault();e.stopImmediatePropagation();const i=minus.hasAttribute('data-w36-row-minus')?Number(minus.dataset.w36RowMinus):minus.hasAttribute('data-w36-row-plus')?Number(minus.dataset.w36RowPlus):selectedLine();adjustLine(i,minus.hasAttribute('data-w36-decrease')||minus.hasAttribute('data-w36-row-minus')?-1:1);return;}
  const selected=target.closest('[data-w36-line]');if(selected&&!target.closest('input,button,select')){lastSelected=cart[Number(selected.dataset.w36Line)]?.product;render();}
 },true);
 document.addEventListener('change',e=>{
  if(!isLaptop()||route!=='pos'||!S)return;
  const el=e.target;
  if(el.matches('[data-w36-product-unit]')){selectedUnit[el.dataset.w36ProductUnit]=Number(el.value);const p=find('products',el.dataset.w36ProductUnit);const art=el.closest('.w36-product');const price=art?.querySelector('strong');if(p&&price)price.innerHTML=`${money(E.priceFor(S,p.id,Number(el.value),posParty))} <small>${esc(S.settings.currency)}</small>`;}
  else if(el.id==='w36QuickQty')updateQuick('qty',el.value);
  else if(el.id==='w36QuickPrice')updateQuick('price',el.value);
  else if(el.id==='w36QuickUnit')updateQuick('unit',el.value);
  else if(el.id==='w36QuickCash'){posCash=el.value;const other=$('[name=posCash]');if(other)other.value=posCash;}
 },true);
 // The existing capture-phase hardware barcode listener handles scan bursts.
 // A normal Enter commits a sale; scanner's Enter only adds the scanned item.
 document.addEventListener('keydown',e=>{
  if(!isLaptop()||route!=='pos'||!S||$('#modal').open||!$('#choicePage').hidden)return;
  if(e.key==='Enter'&&e.target.matches?.('article[data-w36-product]')){e.preventDefault();e.stopImmediatePropagation();const product=e.target.dataset.w36Product;focusCartProduct(product,selectedUnit[product]??0);return;}
  if(e.key==='Enter'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!['INPUT','TEXTAREA','SELECT','BUTTON'].includes(e.target.tagName)&&!e.target.isContentEditable){
   // Scanner dispatches its own Enter after the barcode buffer is consumed.
   if(Date.now()-lastScanAt<650)return;
   e.preventDefault();e.stopImmediatePropagation();try{actions.checkout()}catch(err){error(err)}return;
  }
  if(e.key==='Escape'&&!e.ctrlKey&&!e.altKey&&!e.metaKey){
   if(e.target.closest?.('#w36Nav'))return;
   if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT')return;
   e.preventDefault();e.stopImmediatePropagation();actions.clearCart();
  }
 },true);
 const oldEdit=editEntity;
 editEntity=function(table,id){
  const result=oldEdit(table,id);
  if(table==='products'){
   const input=$('#modalBody [name=archived]');
   // New items and new variants must be active unless explicitly archived.
   if(input&&!id)input.value='';
  }
  return result;
 };
 function topNav(){
  let main=document.querySelector('main > header');if(!main)return;
  if(!$('#w36Nav')){
   const brand=document.createElement('a');brand.id='w36Brand';brand.href='#dashboard';brand.innerHTML=`<span>و</span><b>الوثيق</b>`;
   const title=document.createElement('b');title.id='w36HeaderTitle';
   const navBar=document.createElement('nav');navBar.id='w36Nav';navBar.setAttribute('aria-label','التنقل الرئيسي');
   main.prepend(brand,title,navBar);
  }
  const pageLabel=nav.find(([k])=>k===route)?.[1]||document.querySelector('#crumb')?.textContent||'الرئيسية';
  $('#w36HeaderTitle').textContent=route==='pos'?'الكاشير':pageLabel;
  const assigned=new Set();
  $('#w36Nav').innerHTML=navGroups.map(([label,ico,keys],index)=>{
   const pages=keys.map(k=>nav.find(x=>x[0]===k)).filter(p=>p&&accessible(p[0])&&!assigned.has(p[0]));pages.forEach(p=>assigned.add(p[0]));
   if(!pages.length)return '';
   return `<div class="w36-menu ${pages.some(p=>p[0]===route)?'w36-menu-current':''}"><button type="button" class="w36-menu-trigger" aria-haspopup="true" aria-expanded="false" aria-controls="w36-menu-${index}">${saleIcon(ico)}<span>${label}</span><svg class="w36-down" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><div class="w36-dropdown" id="w36-menu-${index}" role="menu">${pages.map(([k,name])=>`<a role="menuitem" href="#${esc(k)}" class="${k===route?'active':''}">${icon(k)}<span>${esc(name)}</span></a>`).join('')}</div></div>`;
  }).join('');
 }
 document.addEventListener('click',e=>{
  const trigger=e.target.closest?.('.w36-menu-trigger');
  if(trigger){const menu=trigger.closest('.w36-menu');const open=menu.classList.contains('w36-open');$$('#w36Nav .w36-menu').forEach(m=>{m.classList.remove('w36-open');m.querySelector('.w36-menu-trigger')?.setAttribute('aria-expanded','false')});menu.classList.toggle('w36-open',!open);trigger.setAttribute('aria-expanded',String(!open));return;}
  if(!e.target.closest?.('#w36Nav'))$$('#w36Nav .w36-menu').forEach(m=>{m.classList.remove('w36-open');m.querySelector('.w36-menu-trigger')?.setAttribute('aria-expanded','false')});
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape')$$('#w36Nav .w36-menu').forEach(m=>{m.classList.remove('w36-open');m.querySelector('.w36-menu-trigger')?.setAttribute('aria-expanded','false')})});
 function tidyMenus(){
  // Product variants are managed in the product edit form, not via three dots.
  $$('#nativeActionMenu [data-variant],#w25Menu [data-variant]').forEach(x=>x.remove());
  $$('#nativeActionMenu button,#w25Menu button').filter(x=>x.textContent.trim()==='إضافة متغير').forEach(x=>x.remove());
 }
 let timed=false;
 const watchMenu=new MutationObserver(()=>{if(timed)return;timed=true;queueMicrotask(()=>{timed=false;tidyMenus()})});
 watchMenu.observe(document.body,{childList:true,subtree:true});
 const previousRender=render;
 render=function(){
  previousRender();if(!S)return;
  topNav();
  document.body.classList.toggle('w36-desktop',isLaptop());
  if(!isLaptop())return;
  // Remove duplicated page titles, preserving filters, adds and exports.
  const header=document.querySelector('main > header');
  let actionsBar=$('#w36PageActions');if(!actionsBar){actionsBar=document.createElement('div');actionsBar.id='w36PageActions';header.append(actionsBar)}
  actionsBar.replaceChildren();
  const head=$('#content .page-head');
  if(head){
   const buttons=head.querySelectorAll(':scope > .actions > *,:scope > button');
   buttons.forEach(b=>actionsBar.appendChild(b));
   head.remove();
  }
  // Sections with their own filters retain filter controls, but no duplicate page heading.
  if(route==='pos'){
   const oldDock=$('#w33PosDock');if(oldDock)oldDock.remove();
   $$('#content .cashier-tabs').forEach(el=>el.remove());
   // Older POS decorators unpack the payment panel into the cart and wrap buttons
   // in a fixed dock. Restore the Cash Top ordering after those decorators run.
   const cartPanel=$('.w36-cart');
   if(cartPanel){
    $$('.w36-cart .r22-cart-head,.w36-cart .w26-order,.w36-cart .w26-paybar:not(.w36-bottom-actions .w26-paybar)').forEach(el=>el.remove());
    const actionsArea=cartPanel.querySelector('.w36-bottom-actions');
    const fixed=actionsArea?.querySelector('.w26-paybar');
    if(fixed)fixed.replaceWith(...Array.from(fixed.childNodes));
    // The legacy fixed bar changed text buttons to icon-only; restore full labels.
    const labels={checkout:'بيع وحفظ [Enter]',suspend:'تعليق',drafts:'المعلّقة',clearCart:'إلغاء الفاتورة [Esc]'};
    for(const [action,label]of Object.entries(labels)){
     const b=actionsArea?.querySelector(`[data-action="${action}"]`);
     if(b){b.textContent=label;b.setAttribute('aria-label',label);}
    }
    let bottom=cartPanel.querySelector('.w36-cart-bottom');
    if(!bottom){bottom=document.createElement('div');bottom.className='w36-cart-bottom review-panel';cartPanel.appendChild(bottom)}
    for(const selector of ['.payment-modes','#w34InlinePay','.w36-summary','.w36-bottom-actions']){
     const el=cartPanel.querySelector(selector);if(el)bottom.appendChild(el);
    }
   }
   // Existing checkout renderer sets the payment mode for every screen.
   if(typeof w34PaymentUI==='function')w34PaymentUI();
   const cust=$('.w36-cart [name=posCustomer]');if(cust)cust.onchange=()=>{posParty=cust.value;cart=cart.map(l=>({...l,price:E.priceFor(S,l.product,l.unit,posParty)}));persistCart();render()};
   const store=$('#posWarehouse');if(store)store.onchange=()=>{session.setItem('posWarehouse',store.value);render()};
   $$('.w36-pos [data-category]').forEach(b=>b.onclick=()=>{posCategory=b.dataset.category;render()});
   if(!cart.length)lastSelected=null;
  }
  tidyMenus();
 };
 if(S)render();
})();
