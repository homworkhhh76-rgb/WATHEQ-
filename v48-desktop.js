'use strict';
/* Watheeq 4.8: user-supplied desktop dashboard and navbar, connected to the ERP engine.
   Mobile retains its original rendering; no hard-coded company figures. */
(()=>{
 const desktop=()=>window.matchMedia('(min-width:1024px)').matches;
 const iconSvg=(path)=>`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
 const icons={home:'M3 12l9-9 9 9M5 10v11h14V10M9 21v-7h6v7',cart:'M3 3h2l3 12h11l2-9H6M9 21h.01M18 21h.01',products:'M12 2l9 5v10l-9 5-9-5V7l9-5zM3 7l9 5 9-5M12 12v10',cash:'M3 5h18v14H3zM16 12a4 4 0 01-8 0 4 4 0 018 0z',reports:'M3 3v18h18M7 17v-6M12 17V7M17 17V9',save:'M5 3h14l2 2v16H3V3h2zm3 0v6h8V3M7 21v-9h10v9',sales:'M12 3v18M8 7h6a3 3 0 010 6h-4a3 3 0 000 6h6',due:'M7 3h9l5 5v13H7a3 3 0 01-3-3V6a3 3 0 013-3zm8 0v6h6M9 13h8M9 17h8',purchase:'M5 9h14l2 12H3L5 9zm3 0V7a4 4 0 018 0v2',profit:'M3 17l6-6 4 4 8-9M15 6h6v6',calendar:'M4 5h16v16H4zM8 3v4M16 3v4M4 10h16',branch:'M4 21V4a2 2 0 012-2h12a2 2 0 012 2v17M2 21h20M9 7h1M15 7h1M9 12h1M15 12h1M9 21v-5h6v5',search:'M11 19a8 8 0 110-16 8 8 0 010 16zm6-2 5 5',shortcut:'M4 6h16M4 12h16M11 18h9',shield:'M12 2l9 4v5c0 6-4 9-9 11-5-2-9-5-9-11V6l9-4z',clock:'M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2'};
 const ico=k=>iconSvg(icons[k]||icons.home);
 const amount=v=>Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
 const safe=v=>esc(String(v??''));
 const sum=values=>values.reduce((a,b)=>a+(Number(b)||0),0);
 function series(annual){
  const now=new Date(today()+'T12:00:00');
  const keys=annual?Array.from({length:12},(_,i)=>now.getFullYear()+'-'+String(i+1).padStart(2,'0')):Array.from({length:30},(_,i)=>{const d=new Date(now);d.setDate(d.getDate()-(29-i));return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')});
  const docs=periodDocs(keys[0]+(annual?'-01':''),keys[keys.length-1]+(annual?'-31':''));
  return {keys,values:keys.map(key=>sum(docs.filter(d=>String(d.date||'').startsWith(key)).map(d=>{try{return chartAmount(d,'sales')}catch{return 0}})))};
 }
 function chartSvg(keys,values,annual){
  const W=580,H=195,x0=43,x1=565,top=15,bottom=163;
  const min=Math.min(0,...values),max=Math.max(1,...values),y=v=>bottom-(v-min)/(max-min)*(bottom-top);
  const g=Array.from({length:4},(_,i)=>{const yy=top+i*(bottom-top)/3;return `<line x1="${x0}" y1="${yy}" x2="${x1}" y2="${yy}" stroke="#eef2f7" stroke-width="1"/>`}).join('');
  const tick=(v)=>safe(Number(v/100).toLocaleString('en-US',{maximumFractionDigits:0}));
  if(annual){const bw=24;return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="صافي المبيعات السنوي" preserveAspectRatio="none">${g}${keys.map((key,i)=>{const x=x0+((i+.5)/12)*(x1-x0),value=values[i],zero=y(0),barY=Math.min(zero,y(value)),h=Math.max(1,Math.abs(y(value)-zero));return `<rect x="${x-bw/2}" y="${barY}" width="${bw}" height="${h}" rx="5" fill="${value===Math.max(...values)&&value>0?'#f59e0b':'#fbbf24'}"><title>${safe(key)}: ${amount(value/100)}</title></rect><text x="${x}" y="188" text-anchor="middle" font-size="10" fill="#94a3b8">${safe(key.slice(5))}</text>`}).join('')}<text x="3" y="15" font-size="10" fill="#94a3b8">${tick(max)}</text></svg>`}
  const pts=values.map((v,i)=>[x0+(i/(values.length-1))*(x1-x0),y(v)]);
  const path=pts.map(([x,yy],i)=>`${i?'L':'M'}${x.toFixed(2)} ${yy.toFixed(2)}`).join(' ');
  const area=path+` L${x1} ${y(0)} L${x0} ${y(0)} Z`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="صافي المبيعات آخر 30 يوماً" preserveAspectRatio="none"><defs><linearGradient id="w48BlueFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#2563eb" stop-opacity=".25"/><stop offset="100%" stop-color="#2563eb" stop-opacity="0"/></linearGradient></defs>${g}<path d="${area}" fill="url(#w48BlueFill)"/><path d="${path}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${pts.map(([x,yy],i)=>`<circle cx="${x}" cy="${yy}" r="3.2" fill="white" stroke="#2563eb" stroke-width="1.8"><title>${safe(keys[i])}: ${amount(values[i]/100)}</title></circle>`).join('')}${keys.map((k,i)=>(i%7===0||i===keys.length-1)?`<text x="${pts[i][0]}" y="188" text-anchor="middle" font-size="10" fill="#94a3b8">${safe(k.slice(5))}</text>`:'').join('')}<text x="3" y="15" font-size="10" fill="#94a3b8">${tick(max)}</text></svg>`;
 }
 function metric(label,value,color,shape){return `<article class="w48-metric w48-card"><div class="w48-metric-head"><span>${label}</span><span class="w48-metric-icon ${color}">${ico(shape)}</span></div><b class="w48-metric-value">${amount(value/100)}</b><small>${safe(S.settings.currency)}</small></article>`}
 function profit(label,value,color,shape){return `<div class="w48-profit w48-card"><span class="w48-profit-icon ${color}">${ico(shape)}</span><div><span>${label}</span><strong>${amount(value/100)} <small>${safe(S.settings.currency)}</small></strong></div></div>`}
 function chart(title,annual,seriesData){const vals=seriesData.values,keys=seriesData.keys,total=sum(vals),peak=Math.max(...vals,0),best=vals.some(x=>x!==0)?keys[vals.indexOf(peak)]:'—';return `<section class="w48-chart w48-card"><div class="w48-chart-cover ${annual?'purple':''}"><div class="w48-chart-title"><div><h4>${title}</h4><p>${filter.branch?safe(name('branches',filter.branch)):'كل الفروع'} - ${safe(S.settings.currency)}</p></div><span>${ico('reports')}</span></div><div class="w48-chart-summary"><div><small>الإجمالي</small><b>${amount(total/100)}</b></div><div><small>${annual?'أفضل شهر':'المتوسط اليومي'}</small><b>${annual?best:amount(total/100/30)}</b></div><div><small>أعلى قيمة</small><b>${amount(peak/100)}</b></div></div></div><div class="w48-chart-canvas">${chartSvg(keys,vals,annual)}</div></section>`}
 const previousDashboard=dashboard;
 dashboard=function(){
  if(!desktop())return previousDashboard();
  const f=E.financials(S,filter),ds=S.docs.filter(docFilter),purch=sum(ds.map(d=>{try{return chartAmount(d,'purchases')}catch{return 0}})),due=sum(S.docs.filter(d=>d.kind==='sale'&&!d.reversed).map(d=>{try{return E.outstanding(S,d)}catch{return 0}})),last30=series(false),year=series(true),from=filter.from||S.settings.yearStart||today().slice(0,4)+'-01-01',to=filter.to||today();
  return `<div class="w48-dashboard" dir="rtl">
   <main class="w48-dash-grid"><aside class="w48-quick w48-card"><h3>الأزرار السريعة ${ico('shortcut')}</h3><div class="w48-quick-items"><a href="#pos" class="w48-quick-item"><span class="blue">${ico('cart')}</span>نقطة البيع POS</a><a href="#products" class="w48-quick-item"><span class="green">${ico('products')}</span>الأصناف</a><button data-action="nativeExpense" class="w48-quick-item"><span class="amber">${ico('cash')}</span>المصروفات</button><a href="#reports" class="w48-quick-item"><span class="rose">${ico('reports')}</span>التقارير المالية</a><button data-action="backup" class="w48-quick-item"><span class="indigo">${ico('save')}</span>نسخة احتياطية</button></div></aside>
    <div class="w48-dash-main"><div class="w48-metrics">${metric('صافي المبيعات',f.sales,'cyan','sales')}${metric('مبيعات مستحقة',due,'indigo','due')}${metric('صافي المشتريات',purch,'rose','purchase')}${metric('المصروفات',f.expenses,'amber','cash')}</div><div class="w48-charts">${chart('صافي المبيعات - آخر 30 يوماً',false,last30)}${chart('صافي المبيعات - السنة الحالية',true,year)}</div><div class="w48-profits">${profit('إجمالي الربح',f.gross,'cyan','profit')}${profit('صافي الربح',f.net,'rose','reports')}</div></div>
   </main></div>`;
 };
 function header(){
  if(!S)return;
  const el=document.querySelector('main > header'),brand=document.getElementById('w36Brand'),navEl=document.getElementById('w36Nav');if(!el||!brand||!navEl)return;
  if(!desktop()){document.body.classList.remove('w48-desktop');return}
  document.body.classList.add('w48-desktop');
  if(!brand.classList.contains('w48-brand')){
   brand.classList.add('w48-brand');brand.innerHTML='<span class="w48-brand-text">الوثيق</span>';
  }
  if(!navEl.querySelector('.w48-home')){
   const link=document.createElement('a');link.className='w48-home';link.href='#dashboard';link.innerHTML=`${ico('home')}<span>الرئيسية</span>`;navEl.prepend(link);
  }
  navEl.querySelector('.w48-home')?.classList.toggle('active',route==='dashboard');
  let controls=document.getElementById('w48HeaderExtra');
  if(!controls){
   controls=document.createElement('div');controls.id='w48HeaderExtra';controls.className='w48-tools';controls.innerHTML=`<button type="button" data-w48-tool="search" aria-label="بحث" title="بحث">${ico('search')}</button><button type="button" data-w48-tool="shortcuts" aria-label="اختصارات" title="اختصارات">${ico('shortcut')}</button><button type="button" data-w48-tool="language" title="إعدادات اللغة">عربي</button>`;
   const tools=el.querySelector('.header-tools');el.insertBefore(controls,tools);
  }

 }
 const previousRender=render;
 render=function(...args){const result=previousRender.apply(this,args);if(S)header();return result};
 document.addEventListener('click',e=>{
  const b=e.target.closest?.('[data-w48-tool],#w48Profile');if(!b)return;
  if(b.id==='w48Profile'){document.getElementById('w33Account')?.click();return}
  const tool=b.dataset.w48Tool;
  if(tool==='search'){location.hash='#products';requestAnimationFrame(()=>document.getElementById('search')?.focus())}
  else if(tool==='language'){location.hash='#settings'}
  else if(tool==='shortcuts'){modal('اختصارات الوثيق',`<div class="w48-shortcut-list"><a href="#pos">نقطة البيع</a><a href="#products">الأصناف</a><a href="#invoices">الفواتير</a><a href="#reports">التقارير</a><a href="#settings">الإعدادات</a></div>`,null)}
 });
 if(S)render();
})();
