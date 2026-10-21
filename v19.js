'use strict';
/* Rawan 1.9 — visual-reference operational reports and cashier shifts.
   Read totals from posted documents/ledger; write shift metadata through Store.run.
   Shift closure is a reconciliation record, never an automatic balancing journal. */
const v19Routes = {
 trading:'تقرير المتاجرة',stockCurrent:'تقرير مخزون الأصناف الحالي',popularProducts:'تقرير الأصناف الشائعة',cashierRecords:'سجلات الكاشير'
};
nav.push(...Object.entries(v19Routes).map(([key,title])=>[key,title,'']));
// The existing mobile accordion is preserved. Add a direct link for each independent page.
const v19Reports = moreSectionsV18.find(item=>item[0]==='التقارير');
if(v19Reports)v19Reports[2]=[
 ['تقرير المتاجرة','#trading','reports'],
 ['تقرير مخزون الأصناف الحالي','#stockCurrent','inventory'],
 ['تقرير الأصناف الشائعة','#popularProducts','arrow'],
 ['سجلات الكاشير','#cashierRecords','receipt'],
 ['الأرباح والخسائر','#profit','arrow'],
 ['جميع التقارير','#reports','list'],
 ['تقارير المناديب','report:repDetail','reps']
];
const v19Work = moreSectionsV18.find(item=>item[0]==='الأعمال');
if(v19Work){v19Work[2].push(['سجلات الكاشير','#cashierRecords','receipt']);}
const v19SVG={
 back:'M5 12h14m-7-7 7 7-7 7',reload:'M20 11a8 8 0 1 0-3 6M20 4v7h-7',
 filter:'M4 6h16M7 12h10M10 18h4',right:'m9 18 6-6-6-6',
 safe:'M4 4h16v16H4z M8 12h8 M12 8v8',flag:'M5 3v18 M5 4h14l-2 5 2 5H5',
 caution:'M12 3 2 21h20z M12 9v5m0 4h.01',receipt:'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6m-6 4h6m-6 4h4',
 green:'M4 12h16 M12 4l8 8-8 8', pause:'M8 5v14m8-14v14', play:'m9 5 11 7-11 7z',
 upload:'M12 20V4m-6 6 6-6 6 6',download:'M12 4v16m-6-6 6 6 6-6',
 list:'M5 6h15M5 12h15M5 18h15',menu:'M5 12h.01 M12 12h.01 M19 12h.01',
 close:'M5 5l14 14m0-14L5 19',cycle:'M19 8V4h-4M5 16v4h4M5 10a7 7 0 0 1 12-4l2 2M19 14a7 7 0 0 1-12 4l-2-2',
 cart:'M3 4h2l3 12h11l2-9H6 M9 21h.01 M18 21h.01',
 bag:'M4 8h16v13H4z M8 9V6a4 4 0 0 1 8 0v3',cash:'M3 6h18v13H3z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
 bank:'M2 10h20M4 10v10m5-10v10m6-10v10m5-10v10M2 21h20M12 3 2 8h20z',
 chart:'M4 20V4m0 16h16M8 15l4-4 3 3 5-7',box:'m12 2 9 5-9 5-9-5 9-5z M3 7v10l9 5 9-5V7 M12 12v10',
 print:'M6 9V4h12v5M6 18H4V9h16v9h-2M6 15h12v6H6'
};
const v19Icon=(name)=>`<svg class="v19-ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${v19SVG[name]||v19SVG.receipt}"/></svg>`;
const v19Amount=n=>`${money(n)} <small>${esc(S.settings.currency)}</small>`;
const v19Num=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:3}).format(n/1000);
let v19From='',v19To='',v19Branch='',v19Warehouse='',v19PopularSearch='';
const v19OnPeriod=(d)=>d.date>=(v19From||S.settings.yearStart);
function v19InPeriod(d){return v19OnPeriod(d)&&d.date<=(v19To||today())&&(!v19Branch||d.branch===v19Branch)}
function v19Original(d){return d.kind==='reverse'?S.docs.find(x=>x.id===d.original):d}
function v19Docs(){return S.docs.filter(d=>d.kind!=='close'&&v19InPeriod(d));}
function v19Frame(title,body,filter=false){
 const actions=`<button type="button" data-v19="refresh" aria-label="تحديث التقرير">${v19Icon('reload')}</button>${filter?`<button type="button" data-v19="filter" aria-label="تصفية التقرير">${v19Icon('filter')}</button>`:''}`;
 return `<div class="v19-report-shell"><div class="v19-pagebar"><div class="v19-page-actions">${actions}</div><h1>${esc(title)}</h1><a href="#more" aria-label="رجوع إلى الأقسام">${v19Icon('back')}</a></div><div class="v19-report-body">${body}</div></div>`;
}
function v19PeriodText(){return `<p class="v19-report-period">${esc(v19From||S.settings.yearStart)} — ${esc(v19To||today())} · ${esc(v19Branch?name('branches',v19Branch):'كل الفروع')}</p>`;}
function v19InnerTitle(label,ico,tone='neutral'){return `<div class="v19-section-title"><span class="v19-square-icon v19-tone-${tone}">${v19Icon(ico)}</span><h2>${esc(label)}</h2></div>`;}
function v19Row(label,n,ico,tone='neutral',highlight=false){return `<div class="v19-report-row"><span class="v19-square-icon v19-tone-${tone}">${v19Icon(ico)}</span><span class="v19-row-name">${esc(label)}</span><strong class="v19-value v19-amount-${tone}${highlight?' is-highlight':''}" dir="ltr">${v19Amount(n)}</strong></div>`;}
function v19Panel(label,ico,rows,tone='neutral'){return `<section class="v19-white-panel"><div class="v19-panel-head">${v19InnerTitle(label,ico,tone)}</div><div class="v19-panel-rows">${rows}</div></section>`;}
function v19CommerceData(){
 const t={sale:0,saleTax:0,saleReturn:0,saleReturnTax:0,purchase:0,purchaseTax:0,purchaseReturn:0,purchaseReturnTax:0};
 for(const d of v19Docs()){
  const o=v19Original(d);if(!o||!(o.kind in t))continue;
  let sign=d.kind==='reverse'?-1:1;
  t[o.kind]+=sign*(o.totalBase||0);
  t[o.kind+'Tax']+=sign*(o.taxBase||0);
 }
 const saleNet=t.sale-t.saleTax-(t.saleReturn-t.saleReturnTax),purchaseNet=t.purchase-t.purchaseTax-(t.purchaseReturn-t.purchaseReturnTax);
 // Outstanding is current per selected invoice, not a dated AR balance.
 const saleDue=E.sum(S.docs.filter(d=>d.kind==='sale'&&!d.reversed&&v19InPeriod(d)),d=>E.outstanding(S,d));
 const purchaseDue=E.sum(S.docs.filter(d=>d.kind==='purchase'&&!d.reversed&&v19InPeriod(d)),d=>E.outstanding(S,d));
 return {...t,saleNet,purchaseNet,saleDue,purchaseDue,spread:saleNet-purchaseNet};
}
function v19TradePage(){
 const t=v19CommerceData();
 const intro=`<section class="v19-white-panel v19-intro"><h2>نظرة عامة مالية</h2><div class="v19-green-card"><span class="v19-green-icon">${v19Icon('chart')}</span><div><p>الصافي (إجمالي البيع − إجمالي الشراء):</p><strong dir="ltr">${v19Amount(t.spread)}</strong></div></div><small>هذا فرق تجاري للمقارنة وليس صافي الربح؛ الربح يعتمد على تكلفة البضاعة المباعة والمصروفات.</small></section>`;
 const purchases=v19Panel('ملخص المشتريات','cart',v19Row('إجمالي المشتريات (بدون ضريبة)',t.purchase-t.purchaseTax,'cart')+v19Row('إجمالي المشتريات شامل الضريبة',t.purchase,'cart','orange')+v19Row('إجمالي مرتجع المشتريات',t.purchaseReturn,'download','green')+v19Row('المشتريات المستحقة حالياً',t.purchaseDue,'caution','red',true),'orange');
 const sales=v19Panel('ملخص المبيعات','cash',v19Row('إجمالي المبيعات (بدون ضريبة)',t.sale-t.saleTax,'cash')+v19Row('إجمالي المبيعات شامل الضريبة',t.sale,'cash','blue')+v19Row('إجمالي مرتجع المبيعات',t.saleReturn,'download','green')+v19Row('الفواتير المستحقة حالياً',t.saleDue,'caution','red',true),'blue');
 const tail=`<section class="v19-dark-summary">${v19InnerTitle('الملخص العام (المبيعات − المشتريات)','bank')}<div class="v19-dark-inner"><p>الصافي (إجمالي البيع − إجمالي الشراء):</p><strong dir="ltr">${v19Amount(t.spread)}</strong></div></section>`;
 return v19Frame('تقرير المتاجرة',v19PeriodText()+intro+purchases+sales+tail,true);
}
function v19StockRows(){let rows=[];for(const p of S.products){if(p.type==='service')continue;const stockWh=S.warehouses.filter(w=>(!v19Warehouse||w.id===v19Warehouse)&&(!v19Branch||w.branch===v19Branch));const q=E.sum(stockWh,w=>E.stock(S,p.id,w.id).qty),cost=E.sum(stockWh,w=>E.stock(S,p.id,w.id).value);if(v19Warehouse||v19Branch||q||cost)rows.push({product:p,qty:q,cost,sell:E.md(q,p.units[0].price,1000)});}return rows;}
function v19StockPage(){const rows=v19StockRows();return v19Frame('تقرير مخزون الأصناف الحالي',`<div class="v19-stock-total">${v19InnerTitle('المخزون الحالي','box','blue')}<span>${rows.length} صنف · قيمة المخزون بالتكلفة <b>${v19Amount(E.sum(rows,r=>r.cost))}</b></span></div><div class="v19-stock-list">${rows.map(({product:p,qty:q,cost,sell})=>`<article class="v19-stock-card"><div class="v19-stock-name"><h2>${esc(p.name)}</h2><small>SKU (رمز الصنف): ${esc(p.code||'—')}</small></div><div class="v19-stock-line"><span>المخزون الحالي</span><strong>${v19Num(q)} ${esc(p.units[0].name)}</strong></div><div class="v19-stock-line"><span>سعر البيع للوحدة</span><strong dir="ltr">${v19Amount(p.units[0].price)}</strong></div><div class="v19-stock-line"><span>متوسط تكلفة الوحدة</span><strong dir="ltr">${v19Amount(q?E.md(cost,1000,q):0)}</strong></div><div class="v19-stock-line v19-stock-bottom"><span>قيمة المخزون بالتكلفة</span><strong dir="ltr">${v19Amount(cost)}</strong></div></article>`).join('')||'<div class="v19-empty">لا توجد أصناف مخزنية مسجلة.</div>'}</div><p class="v19-footnote">الكمية والقيمة مستمدتان من حركات المخزون المرحلة. لا تشمل البضاعة الموجودة في السلة غير المرحلة.</p>`,true);}
function v19PopularData(){
 const map=new Map();for(const d of v19Docs()){
  const o=v19Original(d);if(!o||!['sale','saleReturn'].includes(o.kind))continue;
  const sign=(d.kind==='reverse'?-1:1)*(o.kind==='saleReturn'?-1:1);
  for(const l of o.lines||[]){if(!l.product)continue;let info=map.get(l.product)||{qty:0,net:0,invoiceIDs:new Set()};info.qty+=sign*(l.baseQty||0);info.net+=sign*(l.baseNet||0);if(o.kind==='sale'&&d.kind==='sale'&&!d.reversed)info.invoiceIDs.add(d.id);map.set(l.product,info)}
 }
 return [...map].map(([id,info])=>({id,product:find('products',id),...info})).sort((a,b)=>b.qty-a.qty||b.net-a.net);
}
function v19PopularPage(){let rows=v19PopularData();let matches=rows.filter(x=>!v19PopularSearch||((x.product?.name||'')+' '+(x.product?.code||'')).toLowerCase().includes(v19PopularSearch.toLowerCase()));return v19Frame('تقرير الأصناف الشائعة',v19PeriodText()+`<div class="v19-searchline">${v19Icon('filter')}<input data-v19-input="popular" value="${esc(v19PopularSearch)}" placeholder="بحث باسم الصنف أو SKU"></div>`+`<div class="v19-popular-list">${rows.map((x,i)=>`<article class="v19-popular-card" data-v19-search-text="${esc(((x.product?.name||'')+' '+(x.product?.code||'')).toLowerCase())}" ${v19PopularSearch&&!((x.product?.name||'')+' '+(x.product?.code||'')).toLowerCase().includes(v19PopularSearch.toLowerCase())?'hidden':''}><div class="v19-stock-name"><h2>${esc(x.product?.name||'صنف محذوف')} (SKU: ${esc(x.product?.code||'—')})</h2><small>الترتيب: #${i+1}</small></div><div class="v19-stock-line v19-stock-bottom"><span>صافي كمية المبيعات</span><strong class="v19-amount-green">${v19Num(x.qty)} ${esc(x.product?.units?.[0]?.name||'وحدة')}</strong></div><div class="v19-stock-line"><span>عدد فواتير البيع غير الملغاة</span><strong>${x.invoiceIDs.size}</strong></div><div class="v19-stock-line"><span>صافي المبيعات قبل الضريبة</span><strong dir="ltr">${v19Amount(x.net)}</strong></div></article>`).join('')}<div class="v19-empty v19-popular-empty" ${matches.length?'hidden':''}>لا توجد مبيعات مطابقة للفترة أو البحث.</div></div><p class="v19-footnote">الترتيب بصافي الكميات بعد المرتجعات والإلغاء. لا تقارن كميات أصناف ذات وحدات مختلفة كأنها وحدة واحدة.</p>`,true)}
function v19ShiftRows(sh){
 const from=Number.isInteger(sh.start)?sh.start:0,to=Number.isInteger(sh.end)?sh.end:S.docs.length;
 const docs=S.docs.slice(Math.max(0,from),Math.max(from,to)).filter(d=>!sh.closed||!d.created||d.created<=sh.closed);
 const moneyMove=(d)=>d.entries.filter(e=>e.account===sh.cash).reduce((n,e)=>n+e.debit-e.credit,0);
 const categories={cashSales:0,customerReceipts:0,otherIncome:0,refunds:0,expenses:0,supplierPayments:0,otherOut:0,creditSales:0,cardSales:0};
 let incoming=0,outgoing=0;
 for(const d of docs){const move=moneyMove(d),o=v19Original(d)||d;
  incoming+=Math.max(0,move);outgoing+=Math.max(0,-move);
  if(o.kind==='sale'){
   categories.cashSales+=move;
   const sign=d.kind==='reverse'?-1:1;
   categories.creditSales+=sign*Math.max(0,(o.totalBase||0)-(o.paidBase||0));
   categories.cardSales+=sign*E.sum(o.payments||[],p=>p.account!==sh.cash?E.md(p.amount,p.rate||1000000,1000000):0);
  }else if(o.kind==='receipt')categories.customerReceipts+=move;
  else if(o.kind==='saleReturn')categories.refunds+=Math.max(0,-move);
  else if(o.kind==='payment'){
   // Receipts and payments are accounted for in cash even when they affect creditors.
   categories.supplierPayments+=Math.max(0,-move);
  }else if(move>0)categories.otherIncome+=move;
  else if(move<0)categories.otherOut+=-move;
 }
 // A transfer/return may make sales negative; the ledger cash sum is authoritative.
 return {...categories,incoming,outgoing,expected:sh.opening+incoming-outgoing,docs};
}
function v19CashierRecordsPage(){const items=S.shifts.filter(sh=>(!v19From||sh.opened.slice(0,10)>=v19From)&&(!v19To||sh.opened.slice(0,10)<=v19To)&&(!v19CashierFilterEmployee||(v19CashierFilterEmployee.startsWith("name:")?sh.employee===v19CashierFilterEmployee.slice(5):sh.employeeId===v19CashierFilterEmployee))).slice().reverse();return v19Frame('سجلات الكاشير',v19PeriodText()+`<div class="v19-cashier-list">${items.map(sh=>`<button type="button" class="v19-shift-record" data-v19="details" data-shift-id="${esc(sh.id)}"><div class="v19-shift-record-top"><strong>${esc(sh.employee||'موظف غير محدد')}</strong><span class="${sh.closed?'v19-closed':'v19-open'}">${sh.closed?'مغلق':'مفتوح'}</span></div><div class="v19-shift-record-bottom"><span>فُتح في</span><time dir="ltr">${esc(new Date(sh.opened).toLocaleString('ar-PS'))}</time></div></button>`).join('')||'<div class="v19-empty">لا توجد سجلات ورديات بعد. افتح وردية من الكاشير لبدء السجل.</div>'}</div>`,true)}
function v19DetailsMarkup(sh){const totals=v19ShiftRows(sh);const val=(l,v)=>`<div class="v19-sheet-line"><span>${esc(l)}</span><strong dir="ltr">${v19Amount(v)}</strong></div>`;
 return `<section class="v19-shift-summary"><div class="v19-sheet-subhead">${v19InnerTitle('المقبوضات','download','green')}</div>${val('نقدية بداية الوردية',sh.opening)}${val('صافي البيع النقدي للصندوق',totals.cashSales)}${val('مقبوضات العملاء',totals.customerReceipts)}${val('حركات نقدية واردة أخرى',totals.otherIncome)}${val('إجمالي النقد الوارد بعد الفتح',totals.incoming)}<div class="v19-sheet-total">${val('المقبوضات مع نقد الفتح',sh.opening+totals.incoming)}</div></section><section class="v19-shift-summary"><div class="v19-sheet-subhead">${v19InnerTitle('المدفوعات والمبيعات غير النقدية','upload','red')}</div>${val('مبالغ مرتجعات البيع المدفوعة نقداً',totals.refunds)}${val('سندات الصرف والمدفوعات النقدية',totals.supplierPayments)}${val('حركات نقدية خارجة أخرى',totals.otherOut)}${val('مبيعات آجل خلال الوردية (لا تدخل الصندوق)',totals.creditSales)}${val('دفعات بحسابات أخرى (لا تدخل الصندوق)',totals.cardSales)}<div class="v19-sheet-total">${val('إجمالي النقد الخارج',totals.outgoing)}</div></section><div class="v19-shift-final"><span>النقدية المتوقعة في الدرج</span><strong dir="ltr">${v19Amount(sh.closed?sh.expected:totals.expected)}</strong></div>${sh.closed?`<div class="v19-sheet-actual">${val('النقد المعدود عند الإغلاق',sh.actual)}${val('فرق الصندوق',sh.diff)}${sh.note?`<p>ملاحظة الإغلاق: ${esc(sh.note)}</p>`:''}</div>`:''}`;
}
function v19OpenSheet(sh){document.querySelector('#v19ShiftSheet')?.remove();let root=document.createElement('div');root.id='v19ShiftSheet';root.className='v19-sheet-overlay';root.innerHTML=`<section class="v19-sheet" role="dialog" aria-modal="true" aria-label="تفاصيل الوردية الحالية"><div class="v19-sheet-head"><button data-v19="dismissSheet" aria-label="إغلاق">${v19Icon('close')}</button><h2>${sh.closed?'تفاصيل الوردية':'تفاصيل الوردية الحالية'}</h2></div><div class="v19-sheet-scroll"><p class="v19-sheet-employee">${esc(sh.employee)} · ${esc(name('accounts',sh.cash))}</p>${v19DetailsMarkup(sh)}</div>${sh.closed?'':`<button class="v19-sheet-close-shift" data-v19="closeShift">إغلاق الوردية</button>`}</section>`;document.body.append(root);root.onclick=e=>{if(e.target===root)root.remove()};}
function v19CloseShift(){const sh=S.shifts.find(x=>!x.closed&&(!window.WatheeqAuth||x.operatorId===WatheeqAuth.identity?.account?.id));if(!sh){toast('لا توجد وردية مفتوحة');return;}document.querySelector('#v19ShiftSheet')?.remove();const totals=v19ShiftRows(sh);
 modal('إغلاق الوردية',`<div class="v19-close-body"><div class="v19-close-amount"><span>المبلغ النقدي المتوقع بالصندوق</span><strong dir="ltr">${v19Amount(totals.expected)}</strong></div><label>إجمالي النقدية المعدودة<input type="number" name="actual" value="${num(totals.expected)}" min="0" step="0.01" required inputmode="decimal"></label><label>ملاحظة الإغلاق<textarea name="note" rows="3" placeholder="اكتب ملاحظة الإغلاق (اختياري)"></textarea></label><p>سيُحفظ الفرق في سجل الوردية. لن يتم إنشاء قيد تسوية أو تغيير رصيد الصندوق تلقائياً.</p></div>`,async f=>{const actual=E.dec(f.get('actual'));if(actual<0)throw Error('النقد المعدود لا يمكن أن يكون سالباً');await mutate(s=>{const current=s.shifts.find(x=>x.id===sh.id);if(!current||current.closed)throw Error('الوردية أُغلقت من قبل');if(s.shifts.some(x=>!x.closed&&x.id!==sh.id))throw Error('يوجد أكثر من وردية مفتوحة');let start=Number.isInteger(current.start)?current.start:0;let incoming=0,outgoing=0;for(const d of s.docs.slice(start)){for(const e of d.entries.filter(e=>e.account===current.cash)){incoming+=e.debit;outgoing+=e.credit;}}
 current.expected=current.opening+incoming-outgoing;current.actual=actual;current.diff=actual-current.expected;current.end=s.docs.length;current.closed=new Date().toISOString();current.note=String(f.get('note')||'').trim().slice(0,500);s.audit.push({id:E.uid(),time:current.closed,action:'إغلاق وردية الصندوق',ref:current.id,name:current.employee+' · فرق '+money(current.diff)});
 },'أُغلقت الوردية وحُفظ فرق الصندوق في السجل');},'تأكيد الإغلاق');
}
function v19CashierHeader(){const shift=S.shifts.find(x=>!x.closed&&(!window.WatheeqAuth||x.operatorId===WatheeqAuth.identity?.account?.id));return `<div class="v19-cashier-header"><button type="button" data-v19="toggleCashierMenu" aria-label="قائمة إجراءات الكاشير">${v19Icon('menu')}</button><button type="button" class="v19-employee-badge" data-v19="${shift?'details':'openShift'}" ${shift?`data-shift-id="${esc(shift.id)}"`: ''}><span class="v19-employee-store">${v19Icon('bank')}</span><b>${esc(shift?.employee||'افتح وردية')}</b></button><a href="#dashboard" aria-label="الرجوع للوحة المتابعة">${v19Icon('back')}</a></div>`}
function v19CashierMenu(){const options=[
 ['تعليق البيع','pause','suspend','orange'],['المبيعات المعلقة','play','drafts','green'],
 ['مدفوعات العملاء','upload','customerPayment','teal'],['مدفوعات الموردين','download','supplierPayment','red'],
 ['إضافة مصروف','cash','expense','teal'],['تفاصيل الوردية','receipt','shiftDetails','teal'],
 ['تحديث البيانات','cycle','refresh','blue'],['إغلاق الوردية','close','closeShift','red']];
 return `<div class="v19-cashier-menu" role="menu">${options.map(([title,ico,action,color],index)=>`<button role="menuitem" type="button" data-v19="${action}" class="v19-menu-${color} ${[2,6].includes(index)?'v19-group-break':''}">${v19Icon(ico)}<span>${title}</span></button>`).join('')}</div>`;
}
const v19PreviousRender=render;
render=function(){v19PreviousRender();if(!S)return;const r=route;const isReport=!!v19Routes[r];document.body.classList.toggle('v19-report-route',isReport);document.body.classList.toggle('v19-pos-route',r==='pos');if(isReport){const fn={trading:v19TradePage,stockCurrent:v19StockPage,popularProducts:v19PopularPage,cashierRecords:v19CashierRecordsPage}[r];$('#content').innerHTML=fn();}
 if(r==='pos'){$('#content').insertAdjacentHTML('afterbegin',v19CashierHeader());let head=$('#content .page-head');if(head)head.setAttribute('aria-hidden','true');}
};
function v19ToggleMenu(){let popup=$('#v19CashierPopup');if(popup){popup.remove();return;}let el=document.createElement('div');el.id='v19CashierPopup';el.innerHTML=v19CashierMenu();document.body.append(el);el.onclick=e=>{if(e.target===el)el.remove();};}
async function v19Refresh(){S=await Store.read();render();toast('تم تحديث البيانات المحلية');}
function v19Filters(){let inventory=route==='stockCurrent';modal('تصفية التقرير',`<div class="form-grid">${inventory?'':field('من تاريخ','from',v19From||S.settings.yearStart,'date')+field('إلى تاريخ','to',v19To||today(),'date')}${select('الفرع','branch',S.branches,v19Branch,true)}${inventory?select('المستودع','warehouse',S.warehouses,v19Warehouse,true):''}</div>`,async f=>{const start=f.get('from')||'',end=f.get('to')||'';if(start&&end&&start>end)throw Error('بداية الفترة بعد نهايتها');v19From=inventory?'':start;v19To=inventory?'':end;v19Branch=f.get('branch')||'';v19Warehouse=inventory?f.get('warehouse')||'':'';render()},'تطبيق');}
// Capture report/card menu actions without changing legacy doc processing.
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-v19]');if(!b)return;e.preventDefault();e.stopPropagation();const key=b.dataset.v19;
 try{
  if(!['toggleCashierMenu','dismissSheet'].includes(key))$('#v19CashierPopup')?.remove();
  if(key==='toggleCashierMenu')v19ToggleMenu();
  else if(key==='dismissSheet')$('#v19ShiftSheet')?.remove();
  else if(key==='filter')v19Filters();
  else if(key==='refresh')await v19Refresh();
  else if(key==='details'){const sh=S.shifts.find(x=>x.id===b.dataset.shiftId)||S.shifts.find(x=>!x.closed&&(!window.WatheeqAuth||x.operatorId===WatheeqAuth.identity?.account?.id));if(sh)v19OpenSheet(sh);else shiftDialog();}
  else if(key==='shiftDetails'){let sh=S.shifts.find(x=>!x.closed&&(!window.WatheeqAuth||x.operatorId===WatheeqAuth.identity?.account?.id));if(sh)v19OpenSheet(sh);else shiftDialog();}
  else if(key==='openShift')shiftDialog();
  else if(key==='closeShift')v19CloseShift();
  else if(key==='suspend'){await actions.suspend();}
  else if(key==='drafts')actions.drafts();
  else if(key==='customerPayment')voucher('receipt');
  else if(key==='supplierPayment')voucher('payment');
  else if(key==='expense')actions.nativeExpense();
 }catch(err){error(err)}
},true);
document.addEventListener('input',e=>{const x=e.target;if(x.matches('[data-v19-input="popular"]')){const pos=x.selectionStart;v19PopularSearch=x.value;render();const next=$('[data-v19-input="popular"]');next?.focus();next?.setSelectionRange(pos,pos)}},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#v19CashierPopup')?.remove();$('#v19ShiftSheet')?.remove()}},true);
// Upgrade incoming navigation while keeping original accounting report links usable.
document.addEventListener('click',e=>{let l=e.target.closest('[data-select-report]');if(!l)return;let pages={trading:'trading',popular:'popularProducts',inventoryDetail:'stockCurrent',cashierShifts:'cashierRecords'};const key=pages[l.dataset.selectReport];if(key){e.preventDefault();e.stopImmediatePropagation();location.hash=key;}},true);
if(S)render();
