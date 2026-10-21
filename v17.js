'use strict';
/* 1.7: faithful compact header, animated sections, and optimistic POS availability.
   Cart reservations are display-only; persisted inventory changes ONLY when invoiced. */
const sectionChevronSvg='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m7 10 5 5 5-5"/></svg>';
const sectionsBase=groupedMenu;
groupedMenu=function(desktop=false){
 if(desktop)return sectionsBase(true);
 return menuGroups.map(([title,i,children],index)=>`<section class="more-group menu-accordion" data-menu-group="${index}"><button type="button" class="more-summary" data-toggle-menu="${index}" aria-expanded="false" aria-controls="more-panel-${index}"><span class="category-icon tone-${index}">${icon(i)}</span><b>${esc(title)}</b><span class="round-chevron">${sectionChevronSvg}</span></button><div class="more-collapse" id="more-panel-${index}" inert><div class="more-links">${children.map(([l,t])=>menuLink(l,t)).join('')}</div></div></section>`).join('');
};
document.addEventListener('click',e=>{
 const toggle=e.target.closest('[data-toggle-menu]');
 if(!toggle)return;
 const section=toggle.closest('.menu-accordion'),expanded=toggle.getAttribute('aria-expanded')==='true';
 toggle.setAttribute('aria-expanded',String(!expanded));section.classList.toggle('is-open',!expanded);
 const panel=section.querySelector('.more-collapse');
 if(!expanded)panel.removeAttribute('inert');else panel.setAttribute('inert','');
});

// These values use the system's milli-unit representation (1000 = one base unit).
function reservedBaseQty(productId,except=-1){
 const product=S?.products.find(p=>p.id===productId);
 if(!product)return 0;
 return cart.reduce((sum,line,index)=>{
  if(index===except||line.product!==productId)return sum;
  const unit=product.units[line.unit];
  return sum+(unit&&Number.isSafeInteger(line.qty)&&line.qty>0?E.md(line.qty,unit.factor,1000):0);
 },0);
}
function availableAfterCart(productId,warehouse){
 const product=S?.products.find(p=>p.id===productId);
 if(!product)return 0;
 if(product.type==='service')return Infinity;
 return E.stock(S,productId,warehouse).qty-reservedBaseQty(productId);
}
function enoughForCart(productId,unit,amount,except=-1){
 const product=S?.products.find(p=>p.id===productId);
 if(!product||!product.units[unit]||!Number.isSafeInteger(amount)||amount<=0)return false;
 if(product.type==='service')return true;
 const warehouse=session.getItem('posWarehouse')||'main';
 const need=E.md(amount,product.units[unit].factor,1000);
 return E.stock(S,productId,warehouse).qty>=reservedBaseQty(productId,except)+need;
}
const baseAddCart=addCart;
addCart=function(id,unit=0){
 if(!enoughForCart(id,unit,1000)){
  toast('الكمية المتبقية لا تكفي لإضافة هذا الصنف');
  return false;
 }
 baseAddCart(id,unit);
 return true;
};
const baseAddBarcode=addBarcode;
addBarcode=function(code){
 for(const product of S.products.filter(p=>!p.archived)){
  const unit=product.units.findIndex(u=>u.barcode===code);
  if(unit>=0&&!enoughForCart(product.id,unit,1000)){
   toast('نفدت الكمية المتاحة لهذا الباركود');return false;
  }
 }
 return baseAddBarcode(code);
};
// Validate changed units/quantities before the original handler can save an invalid cart.
document.addEventListener('change',e=>{
 const el=e.target,index=el.dataset?.cartQty??el.dataset?.cartUnit;
 if(index===undefined)return;
 const line=cart[Number(index)];if(!line)return;
 let unit=line.unit,amount=line.qty;
 try{
  if(el.dataset.cartUnit!==undefined)unit=Number(el.value);
  else amount=E.dec(el.value,3);
 }catch{amount=-1}
 if(!enoughForCart(line.product,unit,amount,Number(index))){
  e.preventDefault();e.stopImmediatePropagation();
  toast('الكمية المطلوبة أكبر من المتاح بالمخزن، أو غير صالحة');render();
 }
},true);
function updateCartStockBadges(){
 if(route!=='pos'||!S)return;
 const warehouse=session.getItem('posWarehouse')||'main';
 document.querySelectorAll('.product[data-cart]').forEach(card=>{
  const product=S.products.find(p=>p.id===card.dataset.cart),badge=card.querySelector('.stock-pill');
  if(!product||!badge)return;
  if(product.type==='service'){
   badge.textContent='خدمة';badge.classList.remove('empty-stock');card.disabled=false;
   card.classList.remove('out-of-stock');card.querySelector('.out-label')?.remove();return;
  }
  const rest=Math.max(0,availableAfterCart(product.id,warehouse));
  badge.textContent=qty(rest);
  badge.title='المتاح بعد خصم الأصناف الموجودة في السلة';
  badge.classList.toggle('empty-stock',rest<=0);
  card.disabled=rest<1000;card.classList.toggle('out-of-stock',rest<1000);
  let label=card.querySelector('.out-label');
  if(rest<1000&&!label){label=document.createElement('span');label.className='out-label';card.querySelector('.product-visual')?.append(label)}
  if(label){if(rest<=0)label.textContent='نفدت الكمية المتاحة';else label.textContent='المتبقي أقل من وحدة';if(rest>=1000)label.remove()}
 });
}
function syncReferenceHeader(){
 const bar=document.querySelector('.header-tools');if(!bar)return;
 // Right to left: identity, saved state, language, theme, typography.
 const brand=bar.querySelector('.top-brand');
 if(brand){brand.title=S.settings.company;brand.setAttribute('aria-label',S.settings.company)}
 let language=document.getElementById('languageBtn');
 if(!language){
  language=document.createElement('button');language.type='button';language.id='languageBtn';
  language.className='icon-btn';language.title='اللغة';language.setAttribute('aria-label','اللغة العربية وإعدادات الخط');
  language.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5h12M9 3v2m-3 4c1.1 3.8 4 6.8 7.5 9M13 5c-1 6-4.3 10-10 12"/><path d="m14 21 4-10 4 10m-6.5-3h5"/></svg><span class="language-indicator" aria-hidden="true"></span>';
  language.onclick=appearanceOptions;bar.append(language);
 }
 const typography=bar.querySelector('#typographyBtn');
 if(typography){typography.textContent='AA';typography.title='تكبير الخط';typography.setAttribute('aria-label','إعدادات حجم الخط');typography.classList.add('header-aa')}
 const theme=bar.querySelector('#themeBtn');
 if(theme){if(!theme.dataset.v17Theme){theme.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>';theme.dataset.v17Theme='1'}theme.title='الوضع الليلي والنهاري'}
 const storage=bar.querySelector('#storageState');
 if(storage){if(!storage.querySelector('.sync-check'))storage.innerHTML='<span class="sync-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4 10-10"/></svg></span>';storage.title='البيانات محفوظة على الجهاز'}
}
const renderBlueV17=render;
render=function(){
 renderBlueV17();if(!S)return;
 syncReferenceHeader();updateCartStockBadges();
};
if(S)render();
