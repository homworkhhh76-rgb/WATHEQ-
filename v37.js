'use strict';
/* WATHEEQ 3.7 — stable blue desktop menus and sale controls above the cart.
   Reuses the existing payment UI and ERP posting; no financial algorithm changes. */
(()=>{
 const laptop=()=>window.matchMedia('(min-width:1024px)').matches;
 function node(className, parent){let el=parent.querySelector('.'+className);if(!el){el=document.createElement('div');el.className=className;parent.append(el)}return el}
 function relocateCheckout(){
  if(!laptop()||typeof route==='undefined'||route!=='pos')return;
  const shell=document.querySelector('#content .w36-pos-shell');if(!shell)return;
  const bar=shell.querySelector('.w36-posbar');const cart=shell.querySelector('.w36-cart');if(!bar||!cart)return;
  bar.querySelectorAll('.w36-qty,.w36-quick-unit').forEach(el=>el.remove());
  const first=node('w37-main',bar),second=node('w37-secondary',bar),details=node('w37-detail',bar);
  const cash=bar.querySelector('.w36-cash');if(cash)first.append(cash);
  const customer=cart.querySelector('.w36-cart-metadata')||shell.querySelector('.w37-customer');
  if(customer){customer.classList.add('w37-customer','w36-control');first.append(customer)}
  const price=bar.querySelector('.w36-quick-price');if(price)first.append(price);
  const currency=node('w37-currency',first);currency.classList.add('w36-control');
  const summary=cart.querySelector('.w36-summary')||shell.querySelector('.w36-summary');
  if(summary){const host=node('w37-total',first);host.append(summary)}
  const commands=cart.querySelector('.w36-bottom-actions')||shell.querySelector('.w36-bottom-actions');
  if(commands){
   // v2.6 packs suspend/cancel into a legacy fixed payment bar, which is hidden
   // on desktops. Unwrap it before relocating so both controls remain clickable.
   commands.querySelectorAll('.w26-paybar').forEach(legacy=>legacy.replaceWith(...Array.from(legacy.childNodes)));
   for(const [action,label] of [['suspend','تعليق'],['drafts','المعلّقة'],['clearCart','إلغاء الفاتورة']]){
    const button=commands.querySelector(`[data-action="${action}"]`);
    if(button){button.textContent=label;button.setAttribute('aria-label',label)}
   }
   commands.classList.add('w37-actions');second.append(commands);
   const sell=commands.querySelector('[data-action=checkout]');if(sell){const host=node('w37-primary',first);host.append(sell)}
  }
  const modes=cart.querySelector('.payment-modes')||shell.querySelector('.payment-modes');
  if(modes){modes.classList.add('w37-payment-modes');second.prepend(modes);modes.querySelectorAll('[data-posmode]').forEach(b=>b.classList.toggle('active',b.dataset.posmode===posMode))}
  const box=document.querySelector('#w34InlinePay');
  if(box){
   box.classList.add('w37-paybox');details.append(box);
   const curr=box.querySelector('[name="w34Currency"]');const label=curr?.closest('label');
   currency.replaceChildren();
   if(label){currency.append(label)}
   else {const base=document.createElement('span');base.className='w37-currency-base';base.textContent=posMode==='multi'?'عملات متعددة':String(S?.settings?.currency||'');currency.append(base)}
   const standard=box.querySelector('.w35-pay-standard');if(standard&&!standard.children.length)standard.remove();
  }
  const obsolete=cart.querySelector('.w36-cart-bottom');if(obsolete&&!obsolete.children.length)obsolete.remove();
 }
 // The v3.5 payment editor can rebuild currency selectors and payment modes;
 // always rehome the newly generated controls without losing their listeners.
 const originalPayment=typeof w34PaymentUI==='function'?w34PaymentUI:null;
 if(originalPayment) w34PaymentUI=function(...args){const out=originalPayment.apply(this,args);relocateCheckout();return out};
 const previousRender=render;
 render=function(...args){
  const out=previousRender.apply(this,args);
  relocateCheckout();
  // Initial mode may be restored before the checkout widgets are fully mounted.
  // Refresh its financial inputs once after mounting, never changing amounts.
  if(laptop()&&route==='pos'&&posMode==='cash'&&!document.querySelector('.w37-currency [name="w34Currency"]')&&originalPayment){w34PaymentUI()}
  return out;
 };
 function placePopup(menu){
  if(!laptop()||!menu)return;
  const button=menu.querySelector('.w36-menu-trigger');if(!button)return;
  const rect=button.getBoundingClientRect();const width=Math.min(265,innerWidth-24);
  const right=Math.max(10,Math.min(innerWidth-width-10,innerWidth-rect.right));
  menu.style.setProperty('--w37-dropdown-top',Math.round(rect.bottom+5)+'px');
  menu.style.setProperty('--w37-dropdown-right',Math.round(right)+'px');
 }
 document.addEventListener('pointerover',e=>{const menu=e.target.closest?.('#w36Nav .w36-menu');if(menu)placePopup(menu)},true);
 document.addEventListener('focusin',e=>{const menu=e.target.closest?.('#w36Nav .w36-menu');if(menu)placePopup(menu)},true);
 document.addEventListener('click',e=>{const menu=e.target.closest?.('#w36Nav .w36-menu');if(menu)placePopup(menu)},true);
 window.addEventListener('resize',()=>{document.querySelectorAll('#w36Nav .w36-menu').forEach(placePopup)},{passive:true});
 window.addEventListener('scroll',()=>{document.querySelectorAll('#w36Nav .w36-menu.w36-open').forEach(placePopup)},{passive:true});
 if(typeof S!=='undefined'&&S)render();
})();
