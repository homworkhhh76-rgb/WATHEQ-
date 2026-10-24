'use strict';
(()=>{
 const close=()=>document.querySelectorAll('#w36Nav .w36-open').forEach(m=>{m.classList.remove('w36-open');m.querySelector('button').setAttribute('aria-expanded','false')});
 document.addEventListener('click',e=>{if(e.target.closest?.('#w36Nav .w36-dropdown a'))close()});
 document.addEventListener('keydown',e=>{
  const menu=e.target.closest?.('#w36Nav .w36-menu');if(!menu)return;
  const trigger=menu.querySelector('button'),links=Array.from(menu.querySelectorAll('a'));
  if(e.key==='Escape'){close();trigger.focus()}
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!menu.classList.contains('w36-open'))trigger.click();const i=links.indexOf(document.activeElement);links[(i+(e.key==='ArrowDown'?1:-1)+links.length)%links.length]?.focus()}
 });window.addEventListener('blur',close);window.addEventListener('hashchange',close);
})();
