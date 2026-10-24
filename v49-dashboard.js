'use strict';
/* v4.9: Desktop dashboard follows the provided dashboard markup and measurements.
   Only figures and chart points are populated from the existing Watheeq ERP state.
   The mobile dashboard, POS, printing, storage and accounting engine are unchanged. */
(() => {
  const desktop = () => window.matchMedia('(min-width:1024px)').matches;
  const prevDashboard = dashboard;
  const fmt = n => Number((Number(n)||0)/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const safe = v => esc(String(v ?? ''));
  const sum = a => a.reduce((s,v)=>s+(Number(v)||0),0);
  const svg = (d, cls='w-5 h-5') => `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${d}"/></svg>`;
  const I = {
    calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    branch: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    lightning: 'M13 10V3L4 14h7v7l9-11h-7z',
    cart: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z',
    product: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    wallet: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    backup: 'M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4',
    sales: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    due: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    purchase: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
    profit: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
  };
  const currency = () => safe(S.settings.currency || 'ILS');
  function series(annual){
    const now = new Date(today() + 'T12:00:00');
    const keys = annual ? Array.from({length:12},(_,i)=>`${now.getFullYear()}-${String(i+1).padStart(2,'0')}`) : Array.from({length:30},(_,i)=>{let d=new Date(now);d.setDate(now.getDate()-29+i);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')});
    const ds=periodDocs(keys[0]+(annual?'-01':''), keys[keys.length-1]+(annual?'-31':''));
    return {keys, values:keys.map(k=>sum(ds.filter(d=>String(d.date||'').startsWith(k)).map(d=>chartAmount(d,'sales'))))};
  }
  const quick = (title, href, action, color, ico) => {
    const a=href?'a':'button';const attrs=href?`href="${href}"`:`type="button" data-action="${action}"`;
    return `<${a} ${attrs} class="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-50\/70 border border-slate-100 hover:border-blue-200 transition group text-right w49-quick-button"><div class="w-9 h-9 rounded-lg bg-${color}-100 text-${color}-600 flex items-center justify-center font-bold shadow-sm group-hover:scale-110 transition">${svg(I[ico])}</div><span class="text-xs font-bold text-slate-700 group-hover:text-blue-700">${title}</span></${a}>`;
  };
  function metric(title,value,bg,color,ico){return `<div class="bg-white p-4 rounded-2xl border border-slate-200\/80 card-shadow relative overflow-hidden flex flex-col justify-between w49-metric">
    <div class="flex items-center justify-between mb-3"><span class="text-xs font-bold text-slate-500">${title}</span><div class="w-9 h-9 rounded-xl ${bg} ${color} flex items-center justify-center">${svg(I[ico])}</div></div>
    <div><div class="text-2xl font-black text-slate-900 tracking-tight">${fmt(value)}</div><div class="text-[10px] font-bold text-slate-400 mt-0.5">${currency()}</div></div></div>`}
  function chart(annual, data){
    const total=sum(data.values),highest=Math.max(0,...data.values),peak=highest?data.keys[data.values.indexOf(highest)]:'—';
    const accent=annual?'purple':'blue', heading=annual?'صافي المبيعات - السنة الحالية':'صافي المبيعات - آخر 30 يوماً';
    const cover=annual?'from-purple-600 to-violet-600':'from-blue-600 to-indigo-600';
    return `<div class="bg-white p-5 rounded-2xl border border-slate-200\/80 card-shadow flex flex-col justify-between w49-chart-card">
      <div class="bg-gradient-to-r ${cover} text-white p-4 rounded-xl shadow-md mb-4 w49-featured">
        <div class="flex justify-between items-center mb-3"><div><h4 class="font-extrabold text-sm">${heading}</h4><p class="text-[11px] text-${accent}-100 font-medium">${filter.branch?safe(name('branches',filter.branch)):'كل الفروع'} - ${currency()}</p></div>
        <div class="p-2 bg-white\/10 rounded-lg backdrop-blur">${svg(I.chart)}</div></div>
        <div class="grid grid-cols-3 gap-2 pt-2 border-t border-white\/20 text-center w49-chart-stats"><div><div class="text-[10px] text-${accent}-100 font-bold">الإجمالي</div><div class="text-base font-black">${fmt(total)}</div></div><div><div class="text-[10px] text-${accent}-100 font-bold">${annual?'أفضل شهر':'المتوسط اليومي'}</div><div class="text-base font-black">${annual?safe(peak):fmt(total/30)}</div></div><div><div class="text-[10px] text-${accent}-100 font-bold">أعلى قيمة</div><div class="text-base font-black">${fmt(highest)}</div></div></div>
      </div>
      <div class="h-48 w-full w49-canvas-wrap"><canvas id="${annual?'salesYearChart':'sales30DaysChart'}" role="img" aria-label="${heading}"></canvas></div>
    </div>`;
  }
  const profit = (label,v,bg,color,ico) => `<div class="bg-white p-4 rounded-2xl border border-slate-200\/80 card-shadow flex items-center justify-between w49-profit"><div class="flex items-center gap-3"><div class="w-12 h-12 rounded-2xl ${bg} ${color} flex items-center justify-center font-bold">${svg(I[ico],'w-6 h-6')}</div><div><span class="text-xs font-extrabold text-slate-500">${label}</span><div class="text-2xl font-black text-slate-900 tracking-tight">${fmt(v)} <span class="text-xs font-bold text-slate-400">${currency()}</span></div></div></div></div>`;
  dashboard = function(){
    if(!desktop())return prevDashboard();
    const financial=E.financials(S,filter),ds=S.docs.filter(docFilter);
    const purchases=sum(ds.map(d=>chartAmount(d,'purchases')));
    const due=sum(S.docs.filter(d=>d.kind==='sale'&&!d.reversed&&(!filter.branch||d.branch===filter.branch)).map(d=>E.outstanding(S,d)));
    const dateFrom=filter.from || S.settings.yearStart || today().slice(0,4)+'-01-01';
    const dateTo=filter.to || today();
    window.__w49ChartData={days:series(false),year:series(true)};
    return `<div class="w49-dashboard min-h-screen flex flex-col antialiased" dir="rtl">
      <div class="max-w-[1600px] w-full mx-auto p-4 md:p-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 w49-main-layout">
        <div class="lg:col-span-2 space-y-4 w49-sidebar"><div class="bg-white p-4 rounded-2xl border border-slate-200\/80 card-shadow"><h3 class="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center justify-between"><span>الأزرار السريعة</span>${svg(I.lightning,'w-4 h-4 text-slate-400')}</h3>
          <div class="space-y-2 w49-quick-list">${quick('نقطة البيع POS','#pos',null,'blue','cart')}${quick('الأصناف','#products',null,'emerald','product')}${quick('المصروفات',null,'nativeExpense','amber','wallet')}${quick('التقارير المالية','#reports',null,'rose','chart')}${quick('نسخة احتياطية',null,'backup','indigo','backup')}</div></div></div>
        <div class="lg:col-span-10 space-y-6 w49-center">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w49-metrics">
            ${metric('صافي المبيعات',financial.sales,'bg-cyan-100','text-cyan-600','sales')}
            ${metric('مبيعات مستحقة',due,'bg-indigo-100','text-indigo-600','due')}
            ${metric('صافي المشتريات',purchases,'bg-rose-100','text-rose-500','purchase')}
            ${metric('المصروفات',financial.expenses,'bg-amber-100','text-amber-600','wallet')}
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 w49-charts">${chart(false,window.__w49ChartData.days)}${chart(true,window.__w49ChartData.year)}</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w49-profits">
            ${profit('إجمالي الربح',financial.gross,'bg-cyan-100','text-cyan-600','profit')}
            ${profit('صافي الربح',financial.net,'bg-rose-100','text-rose-500','chart')}
          </div>
        </div>
      </div>
    </div>`;
  };
  // Chart drawing only; avoids loading external libraries in the offline accounting app.
  // Data, units, typography, gradient, point size, axes and tooltips follow the supplied Chart.js configuration.
  function drawChart(canvas, obj, annual){
    if(!canvas||!obj)return;
    const box=canvas.getBoundingClientRect();const width=Math.max(270,box.width),height=Math.max(130,box.height),scale=Math.min(2.5,devicePixelRatio||1);
    canvas.width=Math.ceil(width*scale);canvas.height=Math.ceil(height*scale);
    const c=canvas.getContext('2d');if(!c)return;
    c.setTransform(scale,0,0,scale,0,0);c.clearRect(0,0,width,height);c.direction='ltr';
    const padL=40,padR=10,padTop=10,padBottom=27,plotWidth=width-padL-padR,plotH=height-padTop-padBottom;
    const keys=obj.keys,values=obj.values.map(n=>n/100),min=Math.min(0,...values),max=Math.max(1,...values),range=Math.max(0.1,max-min),px=i=>padL+((i+.5)/keys.length)*plotWidth, y=v=>padTop+((max-v)/range)*plotH;
    c.font='9px Cairo, sans-serif';c.textAlign='right';c.fillStyle='#94a3b8';c.lineWidth=1;
    for(let j=0;j<=4;j++){const value=min+(max-min)*(4-j)/4,yy=padTop+j*plotH;c.strokeStyle='#f1f5f9';c.beginPath();c.moveTo(padL,yy);c.lineTo(width-padR,yy);c.stroke();c.fillText(value.toLocaleString('en-US',{maximumFractionDigits:0}),padL-5,yy+3)}
    c.textAlign='center';c.fillStyle='#94a3b8';
    if(annual){const bw=Math.min(16,plotWidth/18);keys.forEach((k,i)=>{const xx=px(i),zero=y(0),yy=y(values[i]);c.fillStyle='#f59e0b';c.beginPath();c.roundRect(xx-bw/2,Math.min(zero,yy),bw,Math.max(1,Math.abs(yy-zero)),Math.min(6,bw/2));c.fill();c.fillStyle='#94a3b8';c.fillText(k.slice(-2),xx,height-7)});}
    else {const x=i=>padL+(i/(keys.length-1))*plotWidth,coords=values.map((v,i)=>[x(i),y(v)]);let g=c.createLinearGradient(0,padTop,0,padTop+plotH);g.addColorStop(0,'rgba(37,99,235,.25)');g.addColorStop(1,'rgba(37,99,235,0)');c.beginPath();coords.forEach(([xx,yy],i)=>i?c.lineTo(xx,yy):c.moveTo(xx,yy));c.lineTo(coords.at(-1)[0],y(0));c.lineTo(coords[0][0],y(0));c.closePath();c.fillStyle=g;c.fill();c.beginPath();coords.forEach(([xx,yy],i)=>i?c.lineTo(xx,yy):c.moveTo(xx,yy));c.strokeStyle='#2563eb';c.lineWidth=2.5;c.lineJoin='round';c.stroke();coords.forEach(([xx,yy])=>{c.beginPath();c.arc(xx,yy,3,0,2*Math.PI);c.fillStyle='#2563eb';c.fill();c.beginPath();c.arc(xx,yy,1.2,0,2*Math.PI);c.fillStyle='white';c.fill()});keys.forEach((k,i)=>{if(i%5===0||i===29){c.fillStyle='#94a3b8';c.fillText(k.slice(5),x(i),height-7)}})}
    let pop=canvas.parentElement.querySelector('.w49-chart-tooltip');if(!pop){pop=document.createElement('div');pop.className='w49-chart-tooltip';canvas.parentElement.append(pop)}
    canvas.onpointermove=ev=>{const r=canvas.getBoundingClientRect();let n=annual?Math.floor(((ev.clientX-r.left-padL)/plotWidth)*keys.length):Math.round(((ev.clientX-r.left-padL)/plotWidth)*(keys.length-1));n=Math.min(keys.length-1,Math.max(0,n));pop.textContent=`${keys[n]}: ${values[n].toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;pop.style.left=Math.min(r.width-105,Math.max(3,ev.clientX-r.left-40))+'px';pop.style.top='5px';pop.style.display='block'};
    canvas.onpointerleave=()=>{pop.style.display='none'};
  }
  function updateCharts(){if(!desktop() || route!=='dashboard'||!window.__w49ChartData || !document.querySelector('.w49-dashboard'))return;drawChart(document.getElementById('sales30DaysChart'),window.__w49ChartData.days,false);drawChart(document.getElementById('salesYearChart'),window.__w49ChartData.year,true)}
  const prevRender=render;
  render=function(...args){const r=prevRender.apply(this,args);if(route==='dashboard'&&desktop())requestAnimationFrame(updateCharts);return r};
  addEventListener('resize',()=>{if(route==='dashboard'&&desktop())requestAnimationFrame(updateCharts)},{passive:true});
  if(S)render();
})();
