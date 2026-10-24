/* v4.5 header positioning retained for the v4.6 cashier. */
'use strict';
(()=>{
 const header=document.querySelector('main > header');
 if(!header)return;
 const measure=()=>{const height=Math.ceil(header.getBoundingClientRect().height)||60;const value=height+'px';if(document.body.style.getPropertyValue('--w45-header-h')!==value)document.body.style.setProperty('--w45-header-h',value)};
 let scheduled=false;
 const queue=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;measure()})};
 window.addEventListener('resize',queue,{passive:true});
 if(typeof ResizeObserver==='function')new ResizeObserver(queue).observe(header);
 queue();
})();
