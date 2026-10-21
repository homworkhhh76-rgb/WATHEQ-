'use strict';
/* 1.8: stable mobile header, no-loss section rendering and illustrated submenus.
   Animations follow the screen refresh rate; no hardcoded frame timers. */
const moreSectionsV18 = [
 ['الأعمال','pos',[
  ['لوحة المتابعة','#dashboard','dashboard'],['الكاشير','#pos','pos'],['الطلبيات','#orders','orders'],['الأقساط','#installments','calendar']]],
 ['الأصناف','products',[
  ['إضافة صنف','add:products','plus'],['كل الأصناف','#products','products'],['المتغيرات والمجموعات','#catalog','layers'],['المخازن والجرد','#inventory','inventory'],['التصنيع والأصول','#manufacture','manufacture'],['سجل الهالك','#damage','damage']]],
 ['المبيعات','invoices',[
  ['إضافة بيع','new:sale','plus'],['كل المبيعات','#sales','invoices'],['مرتجع المبيعات','returns:sale','return'],['الفواتير والمرتجعات','#invoices','receipt']]],
 ['المشتريات','pos',[
  ['إضافة مشتريات','new:purchase','plus'],['كل المشتريات','#purchases','list'],['مرجع المشتريات','returns:purchase','return']]],
 ['المصاريف','cash',[
  ['إضافة مصروف','action:nativeExpense','plus'],['كل المصاريف','#expenses','cash'],['فئات المصاريف','action:expenseCategories','layers']]],
 ['المستخدمين','employees',[
  ['الموظفون','#employees','employees'],['العملاء والموردون','#parties','parties'],['المناديب','#reps','reps'],['مجموعات العملاء','#groups','users'],['رسائل العملاء','#messages','message']]],
 ['المحاسبة','accounts',[
  ['شجرة الحسابات','#accounts','accounts'],['سندات القبض والصرف','#vouchers','vouchers'],['معدلات الضرائب','#taxRates','percent'],['فتح وإغلاق المناوبة','action:shift','clock']]],
 ['التقارير','reports',[
  ['جميع التقارير','#reports','reports'],['الأرباح والخسائر','#profit','arrow'],['تقرير المتاجرة','report:trading','receipt'],['تقرير المخزون','report:inventoryDetail','inventory'],['تقرير المناديب','report:repDetail','reps']]],
 ['الإعدادات','settings',[
  ['إعدادات المؤسسة','#settings','settings'],['بيانات المؤسسة','action:company','store'],['تصميم الطباعة','action:printDesign','print'],['نسخة احتياطية','action:backup','backup'],['سجل العمليات','action:audit','list']]]
];
const moreSVGPathsV18={
 calendar:'M7 3v4m10-4v4M4 10h16M5 5h14v16H5z M9 15h2m3 0h2',
 layers:'M12 2 2 8l10 6 10-6z M2 12l10 6 10-6 M2 16l10 6 10-6',
 damage:'M12 2v8m0 4v8 M4 12h16 M5 5l14 14 M19 5 5 19',
 return:'M9 7 4 12l5 5 M5 12h9a6 6 0 0 0 0-12',
 receipt:'M5 2h14v20l-3-2-4 2-4-2-3 2z M8 7h8 M8 12h8 M8 17h5',
 list:'M9 5h12 M9 12h12 M9 19h12 M3 5h2 M3 12h2 M3 19h2',
 users:'M15 19c0-3 2-5 5-5M6 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M2 21v-3c0-2 2-4 4-4h7c2 0 4 2 4 4v3 M17 3a4 4 0 0 1 0 8',
 message:'M3 4h18v13H8l-5 4z M7 9h10 M7 13h7',
 percent:'M5 19 19 5 M7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4 M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4',
 clock:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M12 6v6l4 3',
 store:'M3 9 5 3h14l2 6v12H3z M3 9h18 M8 21v-8h8v8',
 print:'M6 9V3h12v6 M6 18H4V9h16v9h-2 M6 15h12v6H6z M17 12h.01',
 backup:'M4 10V5h16v5 M4 17v4h16v-4 M12 3v14m-4-4 4 4 4-4',
 orders:'M5 3h14v18H5z M9 8h7 M9 12h7 M9 16h5',
};
const moreChevronV18='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m14 5-7 7 7 7"/></svg>';
const moreSubIconV18=key=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${moreSVGPathsV18[key]||paths[key]||paths.invoices}"/></svg>`;
function moreItemV18(label,target,illustration){
 const contents=`<span class="more-item-right"><span class="more-item-icon">${moreSubIconV18(illustration)}</span><span class="more-item-label">${esc(label)}</span></span><span class="more-item-arrow">${moreChevronV18}</span>`;
 if(target[0]==='#')return `<a href="${target}">${contents}</a>`;
 if(target.startsWith('report:'))return `<a href="#reports" data-select-report="${esc(target.slice(7))}">${contents}</a>`;
 return `<button type="button" data-native-link="${esc(target)}">${contents}</button>`;
}
const desktopGroupedMenuV18=groupedMenu;
const expandedMoreV18=new Set();
groupedMenu=function(desktop=false){
 if(desktop)return desktopGroupedMenuV18(true);
 return moreSectionsV18.map(([title,sectionIcon,children],index)=>{
  const opened=expandedMoreV18.has(index);
  return `<section class="more-group menu-accordion v18-accordion${opened?' is-open':''}" data-menu-group="${index}"><button type="button" class="more-summary" data-toggle-menu="${index}" aria-expanded="${opened}" aria-controls="more-panel-${index}"><span class="category-icon tone-${index}">${icon(sectionIcon)}</span><b>${esc(title)}</b><span class="round-chevron">${sectionChevronSvg}</span></button><div class="more-collapse" id="more-panel-${index}" ${opened?'':'inert'}><div class="more-links">${children.map(([label,target,i])=>moreItemV18(label,target,i)).join('')}</div></div></section>`;
 }).join('');
};
// v1.7's accordion listener runs first and updates aria-expanded.
document.addEventListener('click',e=>{
 const toggle=e.target.closest('[data-toggle-menu]');if(!toggle)return;
 const id=Number(toggle.dataset.toggleMenu);
 if(toggle.getAttribute('aria-expanded')==='true')expandedMoreV18.add(id);
 else expandedMoreV18.delete(id);
});
let lastRenderedRouteV18='';
const renderBeforeSmoothV18=render;
render=function(){
 const changed=lastRenderedRouteV18!==route;
 const scrollYBefore=window.scrollY;
 document.body.classList.toggle('v18-steady-render',!changed);
 renderBeforeSmoothV18();
 if(!S)return;
 lastRenderedRouteV18=route;
 // Rebuilding cards must not move the viewport when editing a record on the same page.
 if(!changed&&Math.abs(window.scrollY-scrollYBefore)>3&&document.activeElement?.tagName!=='INPUT'){
  window.scrollTo({top:scrollYBefore,behavior:'instant'});
 }
};
if(S)render();
