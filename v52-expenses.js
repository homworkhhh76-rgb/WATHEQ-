'use strict';
(()=>{
let mode='grid',cashFilter='';
const previous=expensesPage;
const expenseAmount=d=>E.sum(d.entries||[],e=>find('accounts',e.account)?.type==='expense'?(e.debit||0)-(e.credit||0):0);
function records(){return S.docs.filter(d=>d.kind==='payment'&&expenseAmount(d)>0&&docFilter(d)&&(!cashFilter||d.cash===cashFilter)&&match({...d,category:d.expenseCategoryName||name('expenseCategories',d.expenseCategory)})).slice().reverse()}
function analytics(){
 const dates=Array.from({length:30},(_,i)=>{const d=new Date(today()+'T12:00:00');d.setDate(d.getDate()-29+i);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')});
 const values=dates.map(date=>E.sum(S.docs.filter(d=>d.date===date&&docFilter(d)),d=>{const source=d.kind==='reverse'?find('docs',d.original):d;if(!source||source.kind!=='payment'||(cashFilter&&source.cash!==cashFilter)||!match({...source,category:source.expenseCategoryName||name('expenseCategories',source.expenseCategory)}))return 0;return expenseAmount(d)}));
 return {dates,values,total:E.sum(values),peak:Math.max(0,...values)};
}
function graph(a){const hi=Math.max(1,...a.values),lo=Math.min(0,...a.values),x=i=>14+i*572/29,y=v=>105-(v-lo)/(hi-lo)*86;
 return `<svg viewBox="0 0 600 132" role="img" aria-label="المصاريف اليومية آخر 30 يوماً"><polyline points="${a.values.map((v,i)=>x(i)+','+y(v)).join(' ')}" fill="none" stroke="white" stroke-width="2"/>${a.values.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="white" stroke="#2563eb"><title>${a.dates[i]}: ${money(v)} ${esc(S.settings.currency)}</title></circle>`).join('')}${a.dates.map((d,i)=>i%7===0||i===29?`<text x="${x(i)}" y="128" fill="#dbeafe" text-anchor="middle" font-size="10">${d.slice(5)}</text>`:'').join('')}</svg>`;
}
const controls=d=>`<button class="e52-delete" data-reverse="${d.id}" ${d.reversed?'hidden':''} title="إلغاء المصروف">${icon('trash')}</button><button class="e52-edit" data-w27-edit-expense="${d.id}" ${d.reversed?'hidden':''} title="تعديل">${icon('edit')}</button><button data-view="${d.id}" title="تفاصيل المصروف">${icon('invoices')}</button><button data-printdoc="${d.id}" title="طباعة">${icon('print')}</button>`;
expensesPage=function(){
 if(innerWidth<1024)return previous();
 const ds=records(),a=analytics(),cur=esc(S.settings.currency),n=ds.length;page=Math.max(1,Math.min(page,Math.ceil(n/50)||1));const shown=ds.slice((page-1)*50,page*50);
 const status=d=>`<span class="e52-status ${d.reversed?'cancelled':''}"><i></i>${d.reversed?'ملغى':'مدفوع'}</span>`;
 exportHeaders=['الرقم المرجعي','التاريخ','الصندوق','التصنيف','الحالة','المبلغ'];exportData=ds.map(d=>[d.reference||d.number,d.date,name('accounts',d.cash),d.expenseCategoryName||name('expenseCategories',d.expenseCategory)||'غير مصنف',d.reversed?'ملغى':'مدفوع',money(d.totalBase)]);
 const cat=d=>esc(d.expenseCategoryName||(d.expenseCategory?name('expenseCategories',d.expenseCategory):'غير مصنف'));
 return `<div class="e52"><div class="e52-toolbar"><div class="e52-title"><span>${icon('invoices')}</span><div><h1>إدارة المصاريف</h1><p>سجل ومتابعة المصروفات اليومية والشهرية</p></div></div><label class="e52-search">${icon('search')}<input id="search" placeholder="ابحث بالرقم المرجعي أو الملاحظات..." value="${esc(query)}"></label><div class="e52-tools"><label class="e52-cash"><select id="e52Cash" aria-label="تصفية حسب الصندوق"><option value="">كل الصناديق</option>${S.accounts.filter(c=>c.parent==='110').map(c=>`<option value="${esc(c.id)}" ${cashFilter===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><button data-action="filter" title="تصفية الفترة والفروع">${icon('filter')}</button><div class="e52-switch"><button data-e52-view="grid" class="${mode==='grid'?'active':''}">${icon('products')} كروت</button><button data-e52-view="table" class="${mode==='table'?'active':''}">${icon('more')} جدول</button></div><button class="e52-add" data-action="nativeExpense">${icon('plus')} إضافة مصروف</button></div></div>
 <section class="e52-analytics"><div class="e52-summary"><div class="e52-summary-head"><span class="e52-chart-icon">${icon('reports')}</span><div><h2>المصروفات • آخر 30 يوماً</h2><small>${filter.branch?esc(name('branches',filter.branch)):'كل الفروع'} • ${cur}</small></div><span class="e52-live">تحديث مباشر</span></div><div class="e52-metrics">${[['الإجمالي',cur+' '+money(a.total)],['المتوسط اليومي',money(Math.round(a.total/30))],['أعلى قيمة',money(a.peak)]].map(([label,val])=>`<div><p>${label}</p><strong>${val}</strong></div>`).join('')}</div></div><div class="e52-chart"><div><span>مرر على النقاط لعرض القيمة</span><b>${a.dates[0]} — ${a.dates[29]}</b></div>${graph(a)}</div></section>
 ${mode==='grid'?`<div class="e52-grid">${shown.map(d=>`<article class="e52-card"><div class="e52-card-top">${status(d)}<b>${cur} ${money(d.totalBase)}</b></div><div class="e52-details"><div><span>${icon('cash')}${esc(name('accounts',d.cash))}</span><span>${esc(d.date)}${icon('calendar')}</span></div><div><span>${icon('products')}${cat(d)}</span><span class="e52-ref">${esc(d.reference||d.number)}${icon('invoices')}</span></div>${d.note?`<p>${esc(d.note)}</p>`:''}</div><div class="e52-actions">${controls(d)}</div></article>`).join('')}</div>`:`<div class="e52-table"><table><thead><tr>${exportHeaders.slice(0,5).concat(['المبلغ','الإجراءات']).map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${shown.map(d=>`<tr><td class="e52-ref">${esc(d.reference||d.number)}</td><td>${esc(d.date)}</td><td>${esc(name('accounts',d.cash))}</td><td><span class="e52-category">${cat(d)}</span></td><td>${status(d)}</td><td class="e52-amount">${cur} ${money(d.totalBase)}</td><td><div class="e52-actions">${controls(d)}</div></td></tr>`).join('')}</tbody></table></div>`}
 ${n?'':`<div class="e52-empty">${icon('invoices')}<b>لا توجد مصروفات تطابق البحث</b><small>جرب تغيير كلمات البحث أو الفلترة</small></div>`}<div class="e52-pager"><span>عرض ${n?(page-1)*50+1:0} - ${Math.min(page*50,n)} من ${n}</span><div><button data-page="${page-1}" ${page<=1?'disabled':''}>السابق</button><span>${page} / ${Math.max(1,Math.ceil(n/50))}</span><button data-page="${page+1}" ${page*50>=n?'disabled':''}>التالي</button></div></div></div>`;
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-e52-view]');if(b){mode=b.dataset.e52View;render()}});
document.addEventListener('change',e=>{if(e.target.id==='e52Cash'){cashFilter=e.target.value;page=1;render()}});
const oldExpense=actions.nativeExpense;
actions.nativeExpense=function(...args){const out=oldExpense.apply(this,args);if(innerWidth>=1024){
 const root=$('#modal'),body=$('#modalBody');root.classList.add('e52-modal');$('#modalTitle').textContent='إضافة مصروف جديد';
 const layout=document.createElement('div');layout.className='e52-form-fields';
 const labels={amount:'المبلغ ('+S.settings.currency+') *',date:'التاريخ *',cash:'الصندوق / الخزينة *',expenseCategory:'التصنيف',reference:'الرقم المرجعي',note:'ملاحظات'};
 for(const key of ['amount','date','cash','expenseCategory','reference','note']){const field=body.querySelector('[name="'+key+'"]'),label=field?.closest('label');if(!label)continue;const caption=label.querySelector('.field-caption');if(caption)caption.textContent=labels[key];label.classList.add('e52-field');if(key==='amount'||key==='note')label.classList.add('e52-wide');layout.append(label)}
 const extra=document.createElement('details');extra.className='e52-extra';extra.innerHTML='<summary>خيارات محاسبية إضافية</summary><div class="e52-form-fields"></div>';
 body.querySelectorAll('label').forEach(label=>extra.lastElementChild.append(label));
 const hidden=[...body.querySelectorAll('input[type="hidden"]')];body.replaceChildren(layout);if(extra.lastElementChild.children.length)body.append(extra);hidden.forEach(el=>{if(!body.contains(el))body.append(el)});
 const footer=root.querySelector('.modal-foot');footer.append($('#submitModal'));$('#submitModal').innerHTML='حفظ المصروف';$('#cancelModal').textContent='إلغاء';
 }return out};
const oldModal=modal;modal=function(...args){const root=$('#modal');root?.classList.remove('e52-modal');if($('#submitModal')&&!root.querySelector('.modal-head').contains($('#submitModal')))root.querySelector('.modal-head').append($('#submitModal'));return oldModal.apply(this,args)};

if(S)render();
})();
