'use strict';
(()=>{
 const mobile=()=>innerWidth<1024&&!matchMedia('(prefers-reduced-motion:reduce)').matches;
 let last=null,pending=null,ticket=0,modalTicket=0;
 const running=new Set();
 function play(el,frames,delay=0){if(!el?.animate)return;const a=el.animate(frames,{duration:260,delay,easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'});running.add(a);const done=()=>running.delete(a);a.onfinish=done;a.oncancel=done}
 function cards(root,directional=false){
  const selector='.panel,.stat,.kpi,.native-chart,.card,.document-card,.product-list-card,.w25-party-card,.w27-expense-card,.more-group,.w28-section,.w28-party-section,.w24-rep-editor section,.form-section,.r22-chart,.w29-account';
  let nodes=[...root.querySelectorAll(selector)].filter(el=>!el.parentElement.closest(selector)&&el.getBoundingClientRect().height>0);
  if(!nodes.length)nodes=[...root.children].filter(el=>el.getBoundingClientRect().height>0);
  nodes.slice(0,24).forEach((el,i)=>play(el,directional?[{opacity:.3},{opacity:1}]:[{opacity:.3,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],Math.min(i*22,110)));
 }
 document.addEventListener('click',e=>{
  const link=e.target.closest?.('#bottomNav a[href^="#"]');if(!link||!mobile())return;
  const target=link.hash.slice(1),current=[...document.querySelectorAll('#bottomNav a[href^="#"]')].find(a=>a.hash.slice(1)===route);
  if(!current||target===route){pending=null;return}
  const a=current.getBoundingClientRect(),b=link.getBoundingClientRect();pending={target,direction:b.left+b.width/2>a.left+a.width/2?1:-1};
 },true);
 const base=render;
 render=function(...args){const changed=!!S&&last!==route;const direction=changed&&pending?.target===route?pending.direction:0;const result=base.apply(this,args);if(!S)return result;
  if(changed){last=route;pending=null;const id=++ticket;running.forEach(a=>a.cancel());requestAnimationFrame(()=>{if(id!==ticket||!mobile())return;const root=document.getElementById('content');if(!root)return;if(direction)play(root,[{opacity:.5,transform:`translateX(${-direction*32}px)`},{opacity:1,transform:'translateX(0)'}]);cards(root,!!direction)})}
  return result;
 };
 const oldModal=modal;
 modal=function(...args){const result=oldModal.apply(this,args),id=++modalTicket;requestAnimationFrame(()=>{if(id!==modalTicket||!mobile()||!document.getElementById('modal')?.open)return;cards(document.getElementById('modalBody'))});return result};
 window.addEventListener('resize',()=>{if(!mobile())running.forEach(a=>a.cancel())},{passive:true});
 if(S)render();
})();
