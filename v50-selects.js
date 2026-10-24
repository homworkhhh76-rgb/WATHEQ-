'use strict';
(()=>{
 let active=null,serial=0;
 const close=(focus=false)=>{if(!active)return;const a=active;active=null;a.popup.remove();a.button.setAttribute('aria-expanded','false');if(focus&&a.button.isConnected)a.button.focus()};
 function open(select,button){
  if(active?.select===select){close();return}close();if(select.disabled)return;
  const popup=document.createElement('div');popup.className='w50-popup';popup.id='w50-options-'+(++serial);
  const search=document.createElement('input');search.type='search';search.placeholder=select.id==='customer-select'?'ابحث عن العميل…':'بحث في الخيارات…';search.setAttribute('aria-label',search.placeholder);
  const list=document.createElement('div');list.className='w50-options';list.setAttribute('role','listbox');popup.append(search,list);document.body.append(popup);
  button.setAttribute('aria-expanded','true');button.setAttribute('aria-controls',popup.id);active={select,button,popup};
  function draw(){list.replaceChildren();const q=search.value.trim().toLocaleLowerCase();Array.from(select.options).forEach((option,index)=>{if(option.hidden||!option.textContent.toLocaleLowerCase().includes(q))return;const item=document.createElement('button');item.type='button';item.className='w50-option';item.setAttribute('role','option');item.setAttribute('aria-selected',String(option.selected));item.disabled=option.disabled||option.parentElement.disabled===true;item.textContent=option.textContent+(option.selected?' ✓':'');item.onclick=()=>{select.selectedIndex=index;close(true);select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));refresh(select)};list.append(item)});if(!list.children.length){const empty=document.createElement('div');empty.className='w50-empty';empty.textContent='لا توجد نتائج';list.append(empty)}}
  draw();search.addEventListener('input',draw);
  const r=button.getBoundingClientRect(),width=Math.min(Math.max(r.width,230),innerWidth-16),space=innerHeight-r.bottom-12,above=space<180&&r.top>space;
  popup.style.width=width+'px';popup.style.left=Math.max(8,Math.min(r.right-width,innerWidth-width-8))+'px';
  list.style.maxHeight=Math.max(60,Math.min(210,(above?r.top-12:space)-62))+'px';
  if(above)popup.style.bottom=(innerHeight-r.top+5)+'px';else popup.style.top=(r.bottom+5)+'px';search.focus();
  popup.addEventListener('keydown',e=>{const items=Array.from(list.querySelectorAll('button:not(:disabled)'));const i=items.indexOf(document.activeElement);if(e.key==='Escape'){e.preventDefault();close(true)}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();items[(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus()}else if(e.key==='Tab')close()});
 }
 function refresh(select){const b=select.parentElement?.querySelector('.w50-select-button');if(!b)return;const text=select.selectedOptions[0]?.textContent||'اختر';if(b.firstChild.textContent!==text)b.firstChild.textContent=text;if(b.disabled!==select.disabled)b.disabled=select.disabled}
 function enhance(){
  if(active&&!active.select.isConnected)close();
  document.querySelectorAll('select').forEach(select=>{
   if(select.multiple)return;
   if(!select.classList.contains('w50-native')){
    const wrap=document.createElement('span');wrap.className='w50-select-wrap';if(select.style.width)wrap.style.width=select.style.width;if(select.style.flex)wrap.style.flex=select.style.flex;
    select.before(wrap);wrap.append(select);select.classList.add('w50-native');select.tabIndex=-1;
    const b=document.createElement('button');b.type='button';b.className='w50-select-button';b.setAttribute('aria-haspopup','listbox');b.setAttribute('aria-expanded','false');b.setAttribute('aria-label',select.getAttribute('aria-label')||select.closest('label')?.textContent.trim()||select.parentElement.parentElement.querySelector('label')?.textContent.trim()||'اختيار');b.innerHTML='<span></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>';wrap.append(b);b.onclick=()=>open(select,b);b.onkeydown=e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();open(select,b)}};select.addEventListener('change',()=>refresh(select));select.addEventListener('focus',()=>b.focus());
   }refresh(select);
  });
 }
 let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;enhance()})}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','selected']});
 document.addEventListener('pointerdown',e=>{if(active&&!active.popup.contains(e.target)&&!active.button.contains(e.target))close()},true);
 window.addEventListener('resize',()=>close());window.addEventListener('blur',()=>close());document.addEventListener('scroll',e=>{if(active&&!active.popup.contains(e.target))close()},true);enhance();
})();
