/* WATHEQ v4.6 — route-only compositor animations; exact original POS UI kept */
'use strict';
(()=>{
 const content=document.getElementById('content');
 if(!content)return;
 const isDesktop=()=>matchMedia('(min-width:1024px)').matches;
 let lastRoute=typeof route==='string'?route:null;
 let transition=null;
 function closeMenus(){
  document.querySelectorAll('#w36Nav .w36-menu.w36-open').forEach(menu=>{
   menu.classList.remove('w36-open');
   menu.querySelector('.w36-menu-trigger')?.setAttribute('aria-expanded','false');
  });
 }
 // Capture occurs before the router's hashchange and any render wrappers.
 // Works also when clicking the link of the current page (no hashchange).
 document.addEventListener('click',event=>{
  const target=event.target;
  if(!target?.closest)return;
  if(target.closest('#w36Nav .w36-dropdown a'))queueMicrotask(closeMenus);
 },true);
 window.addEventListener('hashchange',closeMenus);
 function arrangeDashboard(){
  if(!isDesktop()||route!=='dashboard')return;
  const grid=content.querySelector('.w33-dashboard-grid');
  const stat=grid?.querySelector('.w33-dashboard-stats');
  const charts=grid?.querySelector('.w33-dashboard-charts');
  const quick=content.querySelector('.quick-grid');
  if(!grid||!stat||!charts||!quick)return;
  if(grid.classList.contains('w46-dash-layout'))return;
  grid.classList.remove('w45-dashboard-board');
  grid.classList.add('w46-dash-layout');
  const top=document.createElement('section');top.className='w46-dash-top';
  const actions=document.createElement('div');actions.className='w46-dash-quick';
  const label=document.createElement('h3');label.textContent='الأزرار السريعة';
  actions.append(label,quick);
  top.append(stat,actions);
  grid.prepend(top);
  // Charts intentionally remain as the next row — no rearrangement of their contents.
 }
 const baseRender=render;
 render=function(...args){
  const result=baseRender.apply(this,args);
  if(!S)return result;
  arrangeDashboard();
  const current=route;
  if(lastRoute===null){lastRoute=current;return result}
  if(lastRoute!==current){
   lastRoute=current;closeMenus();
   if(transition){try{transition.cancel()}catch{}transition=null}
   if(current!=='pos'&&!window.matchMedia('(prefers-reduced-motion:reduce)').matches&&content.animate){
    // WAAPI opacity-only animation: no manual offsetWidth or layout flush;
    // no repeated animation during cart updates or cloud synchronization.
    // No replayed page animation: retain stable content during navigation.

   }
  }
  return result;
 };
})();
