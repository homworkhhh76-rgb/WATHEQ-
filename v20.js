'use strict';
/* WATHEQ 2.0 - cashier opening, scoped filtering, variant creation,
   responsive cards, and opt-in bilingual interface. Financial records stay unchanged
   unless an explicit transaction is posted. */

// 1. Opening count is a physical count; it does NOT create or require a GL entry.
// Capture the GL opening balance and any discrepancy for review separately.
function r20OpeningGap(counted,ledger){return counted-ledger}
shiftDialog=function(){
 const active=S.shifts.find(x=>!x.closed);
 if(active){v19OpenSheet(active);return;}
 const accounts=S.accounts.filter(a=>a.parent==='110');
 if(!accounts.length){toast('أضف صندوقاً نقدياً من شجرة الحسابات أولاً');return;}
 const employees=S.employees.filter(x=>!x.archived);
 const cash=accounts.some(x=>x.id==='111')?'111':accounts[0].id;
 const gl=E.balance(S,cash);
 const nameText=employees.length?select('الموظف','employeeId',employees,employees[0].id)+field('اسم بديل (اختياري)','manualEmployee','','text'):field('اسم الموظف','manualEmployee','','text','required');
 modal('فتح وردية جديدة',`<div class="r20-shift-opening"><div class="form-grid">${select('الصندوق','cash',accounts,cash)}${nameText}${field('النقد المعدود في الدرج','actual',num(Math.max(0,gl)),'number','required min="0" step="0.01"')}</div><div class="r20-ledger-hint"><span>رصيد الصندوق المحاسبي</span><b id="r20Ledger">${money(gl)} ${esc(S.settings.currency)}</b></div><div class="r20-ledger-hint"><span>فرق الافتتاح للمراجعة</span><b id="r20OpeningDiff">0.00</b></div><p>سيتم فتح الوردية حتى إن اختلف النقد المعدود عن رصيد الأستاذ. الفرق يُحفظ للمراجعة ولا ينشئ قيد تسوية أو يغيّر رصيد الحساب.</p></div>`,async f=>{
  const counted=E.dec(f.get('actual'));
  if(!Number.isSafeInteger(counted)||counted<0)throw Error('أدخل مبلغاً صحيحاً للنقد المعدود');
  const selected=employees.find(x=>x.id===f.get('employeeId'));
  const cashier=String(f.get('manualEmployee')||'').trim()||selected?.name||'';
  if(!cashier)throw Error('حدد الموظف أو أدخل اسمه');
  const chosen=f.get('cash');
  await mutate(s=>{
   if(s.shifts.some(x=>!x.closed))throw Error('توجد وردية مفتوحة');
   const ledger=E.balance(s,chosen),opened=new Date().toISOString();
   const shift={id:E.uid(),cash:chosen,employee:cashier,employeeId:selected?.id||'',opening:counted,ledgerOpening:ledger,openingDiff:r20OpeningGap(counted,ledger),start:s.docs.length,opened};
   s.shifts.push(shift);s.audit.push({id:E.uid(),time:opened,action:'فتح وردية',ref:shift.id,name:cashier+' · فرق بداية '+money(shift.openingDiff)});
  },'فُتحت الوردية؛ فرق البداية محفوظ للمراجعة');
 },'فتح الوردية');
 const redraw=()=>{const c=$('#modalBody [name=cash]')?.value,field=$('#modalBody [name=actual]');if(!c||!field)return;const l=E.balance(S,c),a=E.dec(field.value||'0');$('#r20Ledger').textContent=money(l)+' '+S.settings.currency;$('#r20OpeningDiff').textContent=money(r20OpeningGap(a,l))+' '+S.settings.currency};
 $('#modalBody [name=cash]')?.addEventListener('change',redraw);
 $('#modalBody [name=actual]')?.addEventListener('input',redraw);
};
const r20OldV19Details=v19DetailsMarkup;
v19DetailsMarkup=function(sh){const gap=sh.openingDiff??(Number.isInteger(sh.ledgerOpening)?sh.opening-sh.ledgerOpening:0);return `<div class="r20-opening-audit"><span>رصيد الأستاذ عند الفتح</span><b>${money(sh.ledgerOpening??sh.opening)}</b><span>فرق افتتاح الوردية (للمراجعة)</span><b>${money(gap)}</b></div>`+r20OldV19Details(sh)};

// 2. More categories are a single-open accordion.
const r20GroupToggle=(ev)=>{
 const button=ev.target.closest('[data-toggle-menu]');if(!button)return;
 const group=button.closest('.menu-accordion');if(!group)return;
 const root=group.parentElement;
 root.querySelectorAll('.menu-accordion').forEach(other=>{if(other===group)return;other.classList.remove('is-open');const trigger=other.querySelector('[data-toggle-menu]');trigger?.setAttribute('aria-expanded','false');other.querySelector('.more-collapse')?.setAttribute('inert','');});
 expandedMoreV18.clear();
 if(button.getAttribute('aria-expanded')==='true')expandedMoreV18.add(Number(button.dataset.toggleMenu));
};
document.addEventListener('click',r20GroupToggle); // after v1.7's toggle listener

// 3. Scoped filters - do not show warehouse/rep/party fields on irrelevant pages.
const r20FilterIcon='<svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 6h16M7 12h10m-7 6h4"/></svg>';
const r20OriginalToolbar=toolbar;
toolbar=function(extra=''){
 const html=r20OriginalToolbar(extra);
 // Page-specific modal includes search when relevant; no duplicate inline search.
 return html.replace(/<input id="search"[^>]*>/,'').replace(/<button data-action="filter">[\s\S]*?<\/button>/,`<button class="r20-filter-btn" data-action="filter" type="button" aria-label="تصفية وبحث" title="تصفية وبحث">${r20FilterIcon}</button>`);
};
const r20EmployeeChoices=()=>{
 const byId=new Map(S.employees.filter(x=>!x.archived).map(x=>[x.id,{id:x.id,name:x.name}]));
 for(const d of S.docs){if(d.cashierName&&!d.employee)byId.set('name:'+d.cashierName,{id:'name:'+d.cashierName,name:d.cashierName});}
 for(const sh of S.shifts){if(sh.employee&&!sh.employeeId)byId.set('name:'+sh.employee,{id:'name:'+sh.employee,name:sh.employee});}
 return [...byId.values()];
};
const r20FilterGroup=(r)=>{
 if(['invoices','sales','purchases'].includes(r))return 'invoice';
 if(['vouchers','expenses'].includes(r))return 'voucher';
 if(['products','catalog'].includes(r))return 'product';
 if(['inventory','stockCurrent'].includes(r))return 'stock';
 if(['employees'].includes(r))return 'employee';
 if(['parties'].includes(r))return 'party';
 if(['reps'].includes(r))return 'rep';
 if(['dashboard','reports','profit','trading','popularProducts','cashierRecords'].includes(r))return 'report';
 return 'general';
};
function r20ScopedFilters(){
 const group=r20FilterGroup(route),byDate=!['product','stock','employee','party'].includes(group);
 const choice=(label,key,items)=>select(label,key,items,filter[key]||'',true);
 let fields='';
 if(!['report'].includes(group)||!['dashboard'].includes(route))fields+=field('بحث بالاسم أو الرقم','searchText',query,'search');
 if(byDate)fields+=field('من تاريخ','from',filter.from||'','date')+field('إلى تاريخ','to',filter.to||'','date');
 if(['report','invoice','stock'].includes(group))fields+=choice('الفرع','branch',S.branches);
 if(group==='stock')fields+=choice('المستودع','warehouse',S.warehouses);
 if(['invoice','voucher','party'].includes(group))fields+=choice('العميل / المورد','party',S.parties);
 if(group==='invoice'){
  fields+=choice('الموظف / الكاشير','employee',r20EmployeeChoices());
  if(route==='invoices')fields+=choice('نوع الفاتورة','kind',['sale','purchase','saleReturn','purchaseReturn'].map(id=>({id,name:E.labels[id]})));
 }
 if(group==='voucher')fields+=choice('نوع السند','kind',['receipt','payment','cashTransfer'].map(id=>({id,name:E.labels[id]})));
 if(group==='rep')fields+=choice('المندوب','rep',S.reps);
 if(group==='product')fields+=choice('التصنيف','category',[...new Set(S.products.map(p=>p.category).filter(Boolean))].map(id=>({id,name:id})));
 modal('تصفية '+({'invoice':'الفواتير','voucher':'السندات','product':'الأصناف','stock':'المخزون','report':'التقارير','employee':'الموظفين','party':'الأطراف','rep':'المناديب'}[group]||'الصفحة'),`<div class="form-grid r20-filter-fields">${fields}</div><button type="button" class="r20-reset-filter" id="r20ResetFilters">مسح الفلاتر</button>`,async f=>{
  const from=f.get('from')||'',to=f.get('to')||'';if(from&&to&&from>to)throw Error('تاريخ البداية بعد تاريخ النهاية');
  query=String(f.get('searchText')||'').trim();filter={};for(const [k,v] of f.entries())if(!['searchText'].includes(k)&&v)filter[k]=v;
  page=1;render();
 },'تطبيق الفلاتر');
 $('#r20ResetFilters').onclick=()=>{query='';filter={};page=1;closeModal();render()};
}
filters=r20ScopedFilters;
actions.filter=r20ScopedFilters;
const r20OldDocFilter=docFilter;
docFilter=function(doc){if(!r20OldDocFilter(doc))return false;if(filter.employee){const wanted=filter.employee;const empId=doc.employee||'',cashier=doc.cashierName||'';
 if(wanted.startsWith('name:')){if(cashier!==wanted.slice(5)&&name('employees',empId)!==wanted.slice(5))return false}
 else if(empId!==wanted)return false;
}return true};
const r20OldMatch=match;
match=function(x){if(!r20OldMatch(x))return false;if(route==='products'&&filter.category&&x?.units&&!x?.kind&&x.category!==filter.category)return false;return true};

// Standalone report filters: shift logs use employee, inventory uses warehouse,
// trading/popularity use reporting period and branch only.
let v19CashierFilterEmployee='';
v19Filters=function(){
 const stock=route==='stockCurrent',shifts=route==='cashierRecords';
 const dates=stock?'':field('من تاريخ','from',v19From||S.settings.yearStart,'date')+field('إلى تاريخ','to',v19To||today(),'date');
 const extra=shifts?select('الموظف / الكاشير','employee',r20EmployeeChoices(),v19CashierFilterEmployee,true):
  select('الفرع','branch',S.branches,v19Branch,true)+(stock?select('المستودع','warehouse',S.warehouses,v19Warehouse,true):'');
 modal('تصفية التقرير',`<div class="form-grid">${dates}${extra}</div>`,async form=>{
  const from=form.get('from')||'',to=form.get('to')||'';
  if(from&&to&&from>to)throw Error('بداية الفترة بعد نهايتها');
  v19From=stock?'':from;v19To=stock?'':to;
  if(shifts)v19CashierFilterEmployee=form.get('employee')||'';
  else {v19Branch=form.get('branch')||'';v19Warehouse=stock?form.get('warehouse')||'':'';}
  render();
 },'تطبيق');
};

// 4. Invoice cashier metadata. This goes into the invoice object BEFORE posting,
// stays with its ledger document, and is not an accounting entry.
const r20PriorInvoiceExtras=window.invoiceExtras;
window.invoiceExtras=()=>{
 const extra=typeof r20PriorInvoiceExtras==='function'?r20PriorInvoiceExtras():{};
 const sh=S?.shifts.find(x=>!x.closed);
 const selector=$('#modalBody [name=invoiceEmployee]');
 const employee=selector?.value||sh?.employeeId||'';
 const assigned=S?.employees.find(x=>x.id===employee);
 return {...extra,employee,cashierName:assigned?.name||sh?.employee||''};
};
const r20BeforeInvoice=invoice;
invoice=function(kind='sale',draft={},fromCart=false){r20BeforeInvoice(kind,draft,fromCart);
 const sh=S?.shifts.find(x=>!x.closed);
 const staff=S?.employees.filter(e=>!e.archived)||[];
 if($('#modalBody [name=invoiceEmployee]'))return;
 const selector=staff.length?select('الموظف المنفذ للفاتورة','invoiceEmployee',staff,draft.employee||sh?.employeeId||'',true):'';
 $('#modalBody .form-grid')?.insertAdjacentHTML('beforeend',selector);
 
 if(typeof enhanceFields==='function')enhanceFields();
};

// 5. Add several child SKUs while editing a parent product. Every child is posted as
// its own product via E.put, preserving separate warehouse balance and cost.
function r20ProductVariantRows(){
 return [...document.querySelectorAll('#r20VariantRows .r20-variant-row')].map(row=>{
  const label=row.querySelector('[name=variantLabelNew]').value.trim();
  const barcode=row.querySelector('[name=variantBarcodeNew]').value.trim();
  const code=row.querySelector('[name=variantCodeNew]').value.trim();
  const id=row.dataset.variantId||'';
  const price=E.dec(row.querySelector('[name=variantPriceNew]').value||'0');
  const buyPrice=E.dec(row.querySelector('[name=variantBuyPriceNew]').value||'0');
  if(!label||!code)throw Error('اسم المتغير ورمز SKU مطلوبان لكل متغير');
  return {id,label,barcode,code,price,buyPrice};
 });
}
window.r20ReadNewVariants=()=>{
 const rows=r20ProductVariantRows();
 const barcodes=rows.map(r=>r.barcode).filter(Boolean),codes=rows.map(r=>r.code);
 if(new Set(barcodes).size!==barcodes.length)throw Error('الباركود مكرر بين المتغيرات');
 if(new Set(codes).size!==codes.length)throw Error('رمز SKU مكرر بين المتغيرات');
 return rows;
};
const r20BeforeEditEntity=editEntity;
editEntity=function(table,id){r20BeforeEditEntity(table,id);if(table!=='products'||!$('#modalBody'))return;
 const p=id?find('products',id):null;
 if(p?.variantOf)return;
 const children=p?S.products.filter(c=>c.variantOf===p.id):[];
 ($('#addUnit')||$('#unitsRows')||$('#modalBody')).insertAdjacentHTML('afterend',`<section class="r20-variant-editor"><div class="r20-variant-head"><div><h3>المتغيرات</h3><p>مثال: بيبسي — عادي، دايت، ليمون. كل متغير له باركود وسعر ومخزون مستقل.</p></div><button type="button" id="r20AddVariant">＋ متغير</button></div><div id="r20VariantRows"></div></section>`);
 const addVariant=(v={})=>{
  const root=$('#r20VariantRows');
  const row=document.createElement('div');row.className='r20-variant-row';
  if(v.id)row.dataset.variantId=v.id;
  const removable=v.id?'':`<button type="button" class="r20-remove-variant" aria-label="حذف متغير لم يحفظ">×</button>`;
  row.innerHTML=removable+`<div class="form-grid">${field('المتغير / المقاس','variantLabelNew',v.variantLabel||'','text','required')}${field('رمز SKU مستقل','variantCodeNew',v.code||'','text','required')}${field('باركود المتغير','variantBarcodeNew',v.units?.[0]?.barcode||'')}${field('سعر بيع المتغير','variantPriceNew',num(v.units?.[0]?.price??p?.units?.[0]?.price??0),'number','min="0" step="0.01"')}${field('سعر شراء المتغير','variantBuyPriceNew',num(v.units?.[0]?.buyPrice??p?.units?.[0]?.buyPrice??0),'number','min="0" step="0.01"')}</div>`;
  const barcode=row.querySelector('[name=variantBarcodeNew]');
  const scan=document.createElement('button');scan.type='button';scan.className='r23-variant-scan';scan.setAttribute('aria-label','مسح باركود المتغير بالكاميرا');scan.title='مسح باركود المتغير';scan.innerHTML=icon('camera');
  barcode.parentElement.append(scan);barcode.parentElement.classList.add('r23-barcode-field');
  scan.onclick=()=>startScanner(code=>{barcode.value=code;barcode.dispatchEvent(new Event('input',{bubbles:true}));stopProductScanner()});
  root.append(row);
  row.querySelector('.r20-remove-variant')?.addEventListener('click',()=>row.remove());
  if(!v.id)row.querySelector('[name=variantLabelNew]')?.focus();
 };
 children.forEach(addVariant);
 $('#r20AddVariant').onclick=()=>addVariant();
};

// 6. Layout and language state. UI translations never change stored product names,
// customer names, or document details.
const r20Dictionary={
 'الرئيسية':'Dashboard','لوحة المتابعة':'Dashboard','الأعمال':'Business','الأصناف':'Products','كل الأصناف':'All products','إضافة صنف':'Add product','المبيعات':'Sales','المشتريات':'Purchases','المزيد':'More','التقارير':'Reports','المحاسبة':'Accounting','المخزون':'Inventory','المستخدمين':'Users','المصاريف':'Expenses','الإعدادات':'Settings','الفواتير':'Invoices','الفواتير والمبيعات':'Invoices & Sales','سندات القبض والصرف':'Receipts & Payments','القبض والصرف':'Receipts & Payments','المخازن والجرد':'Warehouses & Stocktaking','العملاء والموردون':'Customers & Suppliers','المناديب والتوزيع':'Sales & Distribution','شجرة الحسابات':'Chart of Accounts','المحاسبة العامة':'General Accounting','التقارير المالية':'Financial Reports','الموظفون والرواتب':'Employees & Payroll','الموظفون':'Employees','التصنيع والأصول':'Manufacturing & Assets','إدارة الأعمال':'Business Management','الإدارة المحلية':'Local Management',
 'الكاشير':'Cashier','السلة':'Cart','الأصناف والوحدات':'Products & Units','المتغيرات والمجموعات':'Variants & Groups','المتاجرة':'Trading','الطلبيات':'Orders','الأقساط':'Installments','نسخة احتياطية':'Backup','تصفية':'Filter','تصفية وبحث':'Filter & Search','تصفية النتائج':'Filter results','تطبيق الفلاتر':'Apply filters','مسح الفلاتر':'Clear filters','تصفية الفواتير':'Filter invoices','تصفية الأصناف':'Filter products','تصفية السندات':'Filter vouchers','تصفية المخزون':'Filter inventory','تصفية التقارير':'Filter reports','تصفية الصفحة':'Filter page','تصفية الفترة':'Filter period',
 'بحث بالاسم أو الرقم':'Search by name or number','من تاريخ':'From date','إلى تاريخ':'To date','الفرع':'Branch','كل الفروع':'All branches','المستودع':'Warehouse','الصنف':'Product','الصندوق':'Cash register','العميل / المورد':'Customer / Supplier','العميل':'Customer','المورد':'Supplier','نوع الفاتورة':'Invoice type','نوع السند':'Voucher type','الموظف / الكاشير':'Employee / Cashier','الموظف':'Employee','الموظف المنفذ للفاتورة':'Invoice employee','التصنيف':'Category','الباركود':'Barcode','سعر البيع':'Sale price','سعر الشراء':'Purchase price','الاسم':'Name','الكمية':'Quantity','السعر':'Price','الإجمالي':'Total','المدفوع':'Paid','المتبقي':'Remaining','القيمة':'Value','الحالة':'Status','التاريخ':'Date','الرقم':'Number','العملة':'Currency','ملاحظات':'Notes','البيان':'Description','نقدي':'Cash','آجل':'Credit','جزئي':'Partial','متعدد':'Split',
 'فتح وردية':'Open shift','فتح وردية جديدة':'Open new shift','فتح الوردية':'Open shift','فتح وردية صندوق':'Open cash shift','اسم الموظف':'Employee name','اسم بديل (اختياري)':'Alternate name (optional)','النقد المعدود في الدرج':'Cash counted in drawer','رصيد الصندوق المحاسبي':'Ledger cash balance','فرق الافتتاح للمراجعة':'Opening difference for review','رصيد الأستاذ عند الفتح':'Ledger balance at opening','فرق افتتاح الوردية (للمراجعة)':'Opening discrepancy (review)','الوردية الحالية':'Current shift','تفاصيل الوردية':'Shift details','تفاصيل الوردية الحالية':'Current shift details','إغلاق الوردية':'Close shift','إقفال الوردية':'Close shift','المبلغ النقدي المتوقع بالصندوق':'Expected cash in drawer','إجمالي النقدية المعدودة':'Cash counted','ملاحظة الإغلاق':'Closing note','تأكيد الإغلاق':'Confirm closure','إلغاء':'Cancel','إغلاق':'Close',
 'مراجعة ودفع':'Review & Pay','متابعة الدفع والحفظ':'Continue to payment','الفاتورة الحالية':'Current invoice','في المخزن':'In stock','كافة الأصناف':'All products','مسح الباركود':'Scan barcode','تعليق البيع':'Suspend sale','المبيعات المعلقة':'Suspended sales','مدفوعات العملاء':'Customer payments','مدفوعات الموردين':'Supplier payments','إضافة مصروف':'Add expense','تحديث البيانات':'Refresh data','حفظ':'Save','حفظ وترحيل':'Save & Post','حفظ كمسودة دون ترحيل':'Save as draft','إضافة بند':'Add line','طريقة دفع إضافية':'Additional payment method','بنود الفاتورة':'Invoice lines','طرق الدفع':'Payment methods',
 'تقرير المتاجرة':'Trading report','تقرير مخزون الأصناف الحالي':'Current stock report','تقرير الأصناف الشائعة':'Popular products','سجلات الكاشير':'Cashier shifts','نظرة عامة مالية':'Financial overview','ملخص المشتريات':'Purchases summary','ملخص المبيعات':'Sales summary','تقرير الأرباح والخسائر':'Profit & Loss report','الأرباح والخسائر':'Profit & Loss','ميزان المراجعة':'Trial Balance','قائمة الدخل':'Income statement','الميزانية العمومية':'Balance sheet','تقرير المشتريات':'Purchases report','قيمة المخزون':'Stock value','حركة النقد':'Cash movement','أعمار الديون':'Aging receivables','حركة الضرائب':'Tax movements','العمولات المستحقة':'Commissions payable','طباعة':'Print','بحث باسم الصنف أو SKU':'Search by name or SKU','التحديث':'Refresh',
 'المتغيرات':'Flavors & Variants','المتغير / المقاس':'Flavor / Size','رمز SKU مستقل':'Unique SKU','باركود المتغير':'Variant barcode','سعر بيع المتغير':'Variant sale price','سعر شراء المتغير':'Variant buy price','المتغير':'Variant','تعديل':'Edit','حذف':'Delete','عرض':'View','مفتوح':'Open','مغلق':'Closed','مرحلة':'Posted','مدفوع':'Paid','مستحق':'Due','نشط':'Active','مؤرشف':'Archived','لا توجد أصناف':'No products','لا توجد فواتير':'No invoices','لا توجد بيانات بعد':'No data yet',
 'مجموعات الأسعار والعملاء':'Pricing & Customer groups','فتح وإغلاق المناوبة':'Open / Close shift','سجل العمليات':'Activity log','إعدادات المؤسسة':'Company settings','بيانات المؤسسة':'Company details','سجل الهالك':'Damage history','المرتجعات':'Returns','مرتجع المبيعات':'Sales returns','مرجع المشتريات':'Purchase returns','إضافة بيع':'New sale','إضافة مشتريات':'New purchase','كل المبيعات':'All sales','كل المشتريات':'All purchases','الموردين':'Suppliers','التقارير المالية':'Financial reports','التصنيفات والمتغيرات':'Product catalog','قائمة الأصناف':'Product list','نقطة البيع':'Point of Sale','صرف':'Payment','قبض':'Receipt','بيع':'Sale','شراء':'Purchase','جرد':'Stocktake','تحويل':'Transfer','فواتير ومرتجعات':'Invoices & Returns','البيانات محفوظة محلياً على هذا الجهاز':'Saved offline on this device',
 'نسخة محلية مستقلة':'Offline edition','إدارة الأعمال والمحاسبة':'Business & Accounting','الوثيق':'Rawan','الوثيق للتجارة':'Rawan Trading','نتيجة':'result','السابق':'Previous','التالي':'Next','تجريبي':'Demo',
};
// Remaining recurrent labels across reports, accounting, settings and product forms.
Object.assign(r20Dictionary,{
 'الوحدة':'Unit','الوحدات':'Units','الوحدات والتحويلات':'Units & Conversions','اسم الوحدة':'Unit name','المعامل':'Conversion factor','سعر الجملة':'Wholesale price','كسور':'Fractions','المكونات لكل وحدة أساسية من المنتج':'Components per base unit','الضريبة':'Tax','قبل الضريبة':'Before tax','الإجمالي بالأساسية':'Total in base currency','الحساب':'Account','الحسابات':'Accounts','مدين':'Debit','دائن':'Credit','الصافي':'Net','التكلفة':'Cost','الربح':'Profit','الأرباح':'Profit','عدد الفواتير':'Invoice count','سعر البيع للوحدة':'Unit sale price','متوسط تكلفة الوحدة':'Average unit cost','قيمة المخزون بالتكلفة':'Inventory value at cost','المخزون الحالي':'Current stock','صافي كمية المبيعات':'Net quantity sold','صافي المبيعات قبل الضريبة':'Net sales before tax',
 'إجمالي المشتريات (بدون ضريبة)':'Total purchases excluding tax','إجمالي المشتريات شامل الضريبة':'Total purchases incl. tax','إجمالي مرتجع المشتريات':'Total purchase returns','المشتريات المستحقة حالياً':'Current purchase payables','إجمالي المبيعات (بدون ضريبة)':'Total sales excluding tax','إجمالي المبيعات شامل الضريبة':'Total sales incl. tax','إجمالي مرتجع المبيعات':'Total sales returns','الفواتير المستحقة حالياً':'Current invoice receivables','الملخص العام (المبيعات − المشتريات)':'General summary (sales – purchases)','الصافي (إجمالي البيع − إجمالي الشراء):':'Net (sales – purchases):','مبيعات نقدية':'Cash sales','نقدية بداية الوردية':'Opening cash','المقبوضات':'Receipts','المدفوعات والمبيعات غير النقدية':'Payments & noncash sales','صافي البيع النقدي للصندوق':'Net cash sales in drawer','مقبوضات العملاء':'Customer receipts','حركات نقدية واردة أخرى':'Other cash inflows','إجمالي النقد الوارد بعد الفتح':'Total cash inflows after opening','المقبوضات مع نقد الفتح':'Receipts incl. opening','مبالغ مرتجعات البيع المدفوعة نقداً':'Cash sale refunds','سندات الصرف والمدفوعات النقدية':'Cash payments','حركات نقدية خارجة أخرى':'Other cash outflows','مبيعات آجل خلال الوردية (لا تدخل الصندوق)':'Credit sales (not cash)','دفعات بحسابات أخرى (لا تدخل الصندوق)':'Other-account payments (not cash)','إجمالي النقد الخارج':'Total cash outflows','النقدية المتوقعة في الدرج':'Expected drawer cash','النقد المعدود عند الإغلاق':'Cash counted at closing','فرق الصندوق':'Cash difference',
 'الحساب الأب':'Parent account','رمز الحساب':'Account code','الحساب المقابل':'Offset account','الصندوق / البنك':'Cash / Bank','العملة الأساسية':'Base currency','سعر الصرف':'Exchange rate','اسم المؤسسة':'Company name','الهاتف':'Phone','العنوان':'Address','بداية السنة المالية':'Fiscal year start','السنة تبدأ':'Fiscal year starts','مغلق حتى':'Closed through','حماية البيانات':'Data protection','الفروع والمستودعات':'Branches & Warehouses','العملات وأسعار الصرف':'Currencies & Exchange Rates','العملة':'Currency','الرصيد':'Balance','الرصيد الحالي':'Current balance','ذمم مدينة':'Accounts receivable','ذمم دائنة':'Accounts payable',
 'أهلاً بك في الوثيق':'Welcome to Rawan','حركة المبيعات':'Sales trend','آخر 6 أشهر · قبل المرتجعات':'Last 6 months · before returns','الوصول السريع':'Quick access','أنجز عمليتك مباشرة':'Get things done','آخر العمليات':'Recent transactions','متابعة الأعمال':'Business overview','الأرصدة الحالية':'Current balances','عدد العملاء والموردين':'Customers & Suppliers','الفواتير غير المسددة':'Unpaid invoices','الأصناف النشطة':'Active products','يحتاج إلى إعادة طلب':'Reorder needed','الأصناف منخفضة المخزون':'Low-stock products','صافي المبيعات':'Net sales','صافي نتيجة الفترة':'Net result for period','أرصدة النقد والبنوك':'Cash & Bank balances','قيمة المخزون الحالية':'Current inventory value','الذمم المدينة':'Receivables','الذمم الدائنة':'Payables','التصنيفات':'Categories','قيمة التكلفة':'Cost value','قيمة البيع':'Retail value','المسودات والمعلّقة':'Drafts & Suspended','المعلّقة':'Suspended','عرض سعر / طلب بيع':'Quotation / Sales order','إضافة طرف':'Add party','حفظ كمسودة':'Save draft','إنشاء فاتورة بيع ←':'New sales invoice','عرض الفواتير ←':'View invoices',
 'الصنف الأساسي':'Base product','المتغير':'Flavor','المقاس':'Size','اللون':'Color','الضمان':'Warranty','الضمانات':'Warranties','الماركة':'Brand','الماركات':'Brands','المجموعات':'Groups','مجموعات الأسعار':'Price groups','مجموعة الأصناف':'Product group','مجموعة العملاء':'Customer group','الصنف الأصلي — للمتغير فقط':'Parent product (variants only)','وصف المتغير: لون / مقاس / سعة':'Variant description: flavor / size / color','متغيرات الأصناف':'Product variants','متغيرات محفوظة:':'Saved variants:','متغير مستقل':'Separate variant','إضافة':'Add','موافق':'OK','تأكيد':'Confirm',
 'عملية جديدة':'New transaction','إضافة بند':'Add line','إضافة مندوب':'Add representative','إضافة موظف':'Add employee','إضافة فرع':'Add branch','إضافة مخزن':'Add warehouse','إضافة عملة':'Add currency','إضافة حساب':'Add account','تحويل بين الحسابات':'Transfer between accounts','تحميل / إرجاع بضاعة':'Load / Return stock','احتساب عمولة':'Calculate commission','توريد نقدية':'Deposit cash','تسجيل تالف':'Report damaged stock','قيد يومية':'Journal entry','قيد يومية يدوي':'Manual journal entry','دفتر اليومية':'Journal','قيد افتتاحي':'Opening entry','إقفال فترة':'Close period','كشف حساب':'Statement','رصيد لنا':'Receivable','رصيد علينا':'Payable','مركز التكلفة':'Cost center','كود الصنف':'Product code','رمز الصنف':'SKU','الطرف':'Party',
 'المشتريات المستحقة':'Purchases payable','الفواتير المستحقة':'Invoices receivable','التاريخ':'Date','فُتح في':'Opened at','الترتيب:':'Rank:','تصفية التقرير':'Filter report','تحديث التقرير':'Refresh report','كل الفروع':'All branches','نظرة شاملة على أعمالك':'Business at a glance','التقارير والأرباح':'Reports & Profits','صافي الربح':'Net profit','إجمالي الربح':'Gross profit','إجمالي المصروفات':'Total expenses','تكلفة البضاعة المباعة':'Cost of goods sold','الإيرادات':'Revenue','إيرادات أخرى':'Other income','صافي الربح / الخسارة':'Net profit / loss',
 'مراجعة':'Review','تفريغ':'Clear','الخصم':'Discount','خصم المبلغ':'Discount amount','تطبيق أسعار الجملة':'Apply wholesale pricing','دفعات الفاتورة — اتركها صفرًا للبيع الآجل':'Invoice payments — leave blank for credit','حفظ كمسودة دون ترحيل':'Save draft without posting','الفاتورة':'Invoice','الفواتير والمرتجعات':'Invoices & Returns','أضف المنتجات لتبدأ الفاتورة':'Add products to start an invoice','البيانات محفوظة محلياً':'Saved locally','المزامنة المعلقة':'Pending sync','فاتورة بيع':'Sales invoice','فاتورة شراء':'Purchase invoice','مرتجع بيع':'Sales return','مرتجع شراء':'Purchase return','سند قبض':'Receipt voucher','سند صرف':'Payment voucher','مرحل':'Posted','معكوس':'Reversed','ملغاة':'Canceled',
 'المبلغ':'Amount','المبلغ المستحق':'Amount due','المستحق الحالي':'Current outstanding','المدفوع عند الإصدار':'Paid at issue','حفظ وترحيل الفاتورة':'Save & Post invoice','تاريخ الاستحقاق':'Due date','رقم الهاتف':'Phone number','العروض':'Offers','العدد':'Count','المراجع':'References','باقي':'Remaining','هالك مخزني':'Damaged stock','المخازن':'Warehouses','سجل الحركات':'Stock movements','سجل التدقيق':'Audit log','سجل العمليات':'Activity log',
 'طباعة / PDF':'Print / PDF','Excel':'Excel','بحث بالاسم، الرقم، البيان...':'Search by name, number, notes...','ابحث أو أدخل الباركود':'Search / scan barcode','سعر مخفض':'Discounted price','المشتريات اليومية':'Daily purchases','المبيعات اليومية':'Daily sales','مجموع المبيعات':'Total sales',
 'المناديب':'Sales reps','المندوب':'Sales rep','الفرع الرئيسي':'Main branch','المستودع الرئيسي':'Main warehouse','سيارة التوزيع':'Distribution van','العملاء':'Customers','المنتجات':'Products','طباعة تقرير':'Print report','الجرد':'Stocktake','الرصيد الافتتاحي':'Opening balance','تصفية الموظفين':'Filter employees','تاريخ البداية بعد النهاية':'Start date is after end date','أضف أول عملية لتبدأ متابعة أعمالك.':'Add a transaction to get started.',
 'فتح / إغلاق المناوبة':'Open / Close shift','تفاصيل الوردية':'Shift details','تقرير حركة المبيعات':'Sales trend report','القائمة':'Menu','اللغة':'Language','الوضع الليلي والنهاري':'Light / dark mode','حجم النص':'Text size','لغة الواجهة العربية':'Arabic interface','عادي':'Normal','كبير':'Large',
});
const r20TranslationOriginal=new WeakMap();
function r20Translate(root=document.body){
 const english=document.documentElement.lang==='en';
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 const texts=[];while(walker.nextNode())texts.push(walker.currentNode);
 for(const node of texts){const parent=node.parentElement;if(!parent||parent.closest('script,style,textarea,option[data-user-content],.r20-no-translate'))continue;
  const prev=r20TranslationOriginal.get(node);const orig=prev===undefined?node.nodeValue:prev;
  const normalized=orig.trim(),repl=r20Dictionary[normalized];
  if(!repl){if(prev!==undefined&&!english)node.nodeValue=orig;continue}
  if(prev===undefined)r20TranslationOriginal.set(node,orig);
  const lead=orig.match(/^\s*/)?.[0]||'',tail=orig.match(/\s*$/)?.[0]||'';
  const next=english?lead+repl+tail:orig;if(node.nodeValue!==next)node.nodeValue=next;
 }
 for(const el of root.querySelectorAll?.('[placeholder],[title],[aria-label]')||[]){
  for(const attr of ['placeholder','title','aria-label']){
   if(!el.hasAttribute(attr))continue;
   const key='data-r20-orig-'+attr;const orig=el.getAttribute(key)||el.getAttribute(attr);
   if(r20Dictionary[orig]&&!el.hasAttribute(key))el.setAttribute(key,orig);
   if(el.hasAttribute(key))el.setAttribute(attr,english?r20Dictionary[orig]:orig);
  }
 }
}
let r20Language='ar';try{r20Language=localStorage.getItem('rawan-language')==='en'?'en':'ar'}catch{}
function r20ApplyLanguage(lang){
 r20Language=lang==='en'?'en':'ar';document.documentElement.lang=r20Language;
 document.documentElement.dir=r20Language==='en'?'ltr':'rtl';document.body.classList.toggle('r20-english',r20Language==='en');
 try{localStorage.setItem('rawan-language',r20Language)}catch{}
 const button=$('#languageBtn');if(button){button.title=r20Language==='en'?'Switch to Arabic':'Switch to English';button.setAttribute('aria-label',button.title)}
 if(S)render();else r20Translate(document.body);
}
function r20ApplyFilterCards(){
 // presentation only, row data comes from application render and accounting model
 $('#content')?.querySelectorAll('.report-grid button,.quick-grid button')?.forEach((b,i)=>{
  b.classList.add('r20-action-card');b.style.setProperty('--r20-accent',String(i%6));
 });
}
const r20PriorRender=render;
render=function(){r20PriorRender();if(!S)return;
 r20ApplyFilterCards();r20Translate(document.body);
 const language=$('#languageBtn');if(language){language.onclick=()=>r20ApplyLanguage(document.documentElement.lang==='ar'?'en':'ar');language.title=document.documentElement.lang==='ar'?'Switch to English':'Switch to Arabic';language.setAttribute('aria-label',language.title)}
};
const r20PriorModal=modal;
modal=function(...args){const result=r20PriorModal(...args);r20Translate($('#modal'));return result};
const r20OldAppMenu=openAppMenu;
openAppMenu=function(){r20OldAppMenu();r20Translate($('#appMenuPopup')||document.body)};
const r20Observe=new MutationObserver(mutations=>{
 if(document.documentElement.lang!=='en')return;
 if(mutations.some(m=>m.addedNodes.length)){
  if(!r20Observe.queued){r20Observe.queued=true;requestAnimationFrame(()=>{r20Observe.queued=false;r20Translate(document.body)})}
 }
});r20Observe.observe(document.body,{subtree:true,childList:true});
document.documentElement.lang=r20Language;document.documentElement.dir=r20Language==='en'?'ltr':'rtl';document.body.classList.toggle('r20-english',r20Language==='en');
if(S)render();
