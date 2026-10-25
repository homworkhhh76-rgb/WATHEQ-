'use strict';
(()=>{
 const panes=['products','cart','payment'],selectors={products:'.catalog-panel',cart:'.cart',payment:'.review-panel'};
 const enabled=()=>innerWidth<1024&&route==='pos'&&!$('#modal')?.open;
 const motion=()=>!matchMedia('(prefers-reduced-motion:reduce)').matches;
 let drag=null,animations=[];
 function cancel(){animations.forEach(a=>a.cancel());animations=[];document.querySelectorAll('.w54-swipe-layer').forEach(x=>x.remove());$('.pos')?.classList.remove('w54-swiping')}
 function change(next,dx=0){
  const root=$('.pos'),old=posPane;if(!root||!panes.includes(next)||next===old)return;
  cancel();const from=root.querySelector(selectors[old]),to=root.querySelector(selectors[next]);if(!from||!to)return;
  const width=root.clientWidth,dir=panes.indexOf(next)>panes.indexOf(old)?1:-1;
  const clone=motion()?from.cloneNode(true):null;
  if(clone){clone.removeAttribute('id');clone.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));clone.setAttribute('aria-hidden','true');clone.inert=true;clone.classList.add('w54-swipe-layer');clone.style.height=from.offsetHeight+'px'}
  from.style.transform='';posPane=next;root.dataset.pane=next;document.body.classList.toggle('w35-review-open',next==='payment');
  document.querySelectorAll('.cashier-tabs [data-native-pane]').forEach(b=>{const selected=b.dataset.nativePane===next;b.classList.toggle('active',selected);b.setAttribute('aria-selected',String(selected))});
  if(clone){root.classList.add('w54-swiping');root.append(clone);const opts={duration:280,easing:'cubic-bezier(.22,.75,.2,1)'};
   const outgoing=clone.animate([{transform:`translate3d(${dx}px,0,0)`,opacity:1},{transform:`translate3d(${dir*width}px,0,0)`,opacity:.3}],opts);
   const incoming=to.animate([{transform:`translate3d(${-dir*width+dx}px,0,0)`,opacity:.65},{transform:'translate3d(0,0,0)',opacity:1}],opts);
   animations=[outgoing,incoming];incoming.onfinish=()=>{clone.remove();root.classList.remove('w54-swiping');animations=[]};
  }
 }
 document.addEventListener('click',e=>{const b=e.target.closest('[data-native-pane]');if(!enabled()||!b)return;e.preventDefault();e.stopImmediatePropagation();change(b.dataset.nativePane)},true);
 document.addEventListener('pointerdown',e=>{if(!enabled()||!e.isPrimary||e.pointerType==='mouse'||e.target.closest('input,select,textarea,.category-strip,.cart-controls,button:not(.product),.native-menu'))return;const root=e.target.closest('.pos');if(!root)return;cancel();drag={id:e.pointerId,x:e.clientX,y:e.clientY,root,panel:root.querySelector(selectors[posPane]),dx:0,active:false}}, {passive:true});
 document.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.active){if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){drag=null;return}if(Math.abs(dx)<12)return;drag.active=true;drag.panel?.setPointerCapture?.(e.pointerId)}
  drag.dx=dx;const index=panes.indexOf(posPane),edge=(dx>0&&index===2)||(dx<0&&index===0);if(motion()&&drag.panel)drag.panel.style.transform=`translate3d(${edge?dx*.16:dx}px,0,0)`;
 },{passive:true});
 let suppress=false;
 function end(e){if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;if(!d.active)return;suppress=true;setTimeout(()=>suppress=false,350);const i=panes.indexOf(posPane),next=i+(d.dx>0?1:-1);if(e.type!=='pointercancel'&&Math.abs(d.dx)>Math.min(70,d.root.clientWidth*.18)&&next>=0&&next<3)change(panes[next],d.dx);else{if(motion()&&d.panel)d.panel.animate([{transform:`translate3d(${d.dx}px,0,0)`},{transform:'translate3d(0,0,0)'}],{duration:180,easing:'ease-out'});if(d.panel)d.panel.style.transform=''}}
 document.addEventListener('pointerup',end,{passive:true});document.addEventListener('pointercancel',end,{passive:true});
 document.addEventListener('click',e=>{if(suppress&&e.target.closest('.pos')){e.preventDefault();e.stopImmediatePropagation();suppress=false}},true);
 window.W54Swipe={change};
})();
