'use strict';
/* WATHEQ v2.1 UI fixes. Existing ledgers and saved documents are untouched. */
// The old theme toggle remains in markup only to keep older initialization code safe.
document.body.classList.remove('dark');
try {localStorage.removeItem('rawan-theme');}catch{}
const r21ThemeButton=document.querySelector('#themeBtn');
if(r21ThemeButton){r21ThemeButton.hidden=true;r21ThemeButton.onclick=()=>{};r21ThemeButton.setAttribute('aria-hidden','true');r21ThemeButton.tabIndex=-1;}
// Complete common, static interface translations while leaving user-entered item names intact.
Object.assign(r20Dictionary,{
 'التاريخ والوقت':'Date and time','إدارة الأصناف':'Product management','قائمة التقارير':'Reports list',
 'التقارير الشاملة':'All reports','نوع الصنف':'Product type','الوحدات والتحويلات':'Units & conversions',
 'الاسم الإنجليزي':'English name','العلامة التجارية':'Brand','المورد الافتراضي':'Default supplier','الحالة':'Status',
 'حد الطلب بالوحدة الأساسية':'Reorder point in base units','صورة الصنف — ملف محلي':'Product image — local file',
 'الوحدات':'Units','حبة':'Piece','باكيت':'Pack','كرتونة':'Carton','النوع':'Type','أمر تصنيع':'Manufacturing order',
 'صنف جديد':'New product','تعديل صنف':'Edit product','رقم الصنف':'Product code','رمز الصنف':'SKU',
 'مخزني':'Stock item','خدمي':'Service','مادة أولية':'Raw material','منتج مصنع':'Finished product',
 'مركب':'Bundle','حد الطلب':'Reorder limit','سعر الجملة':'Wholesale price','المعامل':'Conversion factor',
 'الباركود':'Barcode','كسور':'Fractional quantities','اسم الوحدة':'Unit name','سعر الشراء':'Purchase price',
 'المتغيرات':'Flavors & Variants','＋ متغير':'+ Variant','＋ وحدة':'+ Unit',
 'المتغير / المقاس':'Flavor / size','رمز SKU مستقل':'Unique SKU','باركود المتغير':'Variant barcode',
 'سعر بيع المتغير':'Variant selling price','سعر شراء المتغير':'Variant purchase cost',
 'متغير محفوظ':'Saved variant','نقاط البيع':'Point of sale','المتغيرات':'Variants','الاستحقاق':'Due',
 'المصاريف التشغيلية':'Operating expenses','المبيعات والمشتريات':'Sales & purchases','الفواتير والمبيعات':'Invoices & sales',
 'تسديد فواتير — بالعملة الأساسية':'Invoice allocation — base currency','تسديد فواتير':'Apply to invoices',
 'المبلغ':'Amount','الحساب المستلم':'Destination account','الحساب المقابل':'Offsetting account',
 'تاريخ الاستحقاق':'Due date','الصندوق / البنك':'Cash / Bank','البيان / الملاحظات':'Notes / Description',
 'المستودع المصدر':'Source warehouse','المستودع المستلم':'Destination warehouse',
 'قيد يومية يدوي':'Manual journal','تحويل مخزني':'Stock transfer','جرد مخزني':'Inventory count',
 'هالك مخزني':'Inventory damage','رصيد افتتاحي':'Opening stock balance',
 'تقرير حركة المبيعات':'Sales trend','تقرير المتاجرة':'Trading report',
 'سندات القبض والصرف':'Cash receipts and payments',
 'المندوب — اختياري':'Optional representative','موظف الوردية':'Shift employee',
 'تقرير مخزون الأصناف الحالي':'Current product stock report','قيمة المخزون بالتكلفة':'Stock at cost',
 'إجمالي المبيعات':'Total sales','المبيعات المستحقة':'Sales receivable','المشتريات المستحقة':'Purchase payable',
 'المستودع الرئيسي':'Main warehouse','الفرع الرئيسي':'Main branch','الإدارة العامة':'General administration',
 'عدد النتائج':'Results','النتائج':'Results','أضف أول عملية لتبدأ متابعة أعمالك.':'Add your first transaction to get started.',
 'مستودع السيارة':'Van warehouse','فرع':'Branch','المندوب':'Representative','الفرع':'Branch',
 'المستودع':'Warehouse','مركز التكلفة':'Cost center','مفتوح':'Open','مغلق':'Closed',
 'القائمة الرئيسية':'Main menu','كل الأقسام':'All sections','المتغيرات والمجموعات':'Variants and groups',
 'تأكيد الإغلاق':'Confirm closure','كل الأصناف':'All products','التقارير المالية':'Financial reports',
 'الحفظ':'Save','اعتماد وترحيل':'Approve and post','الرجوع':'Back','رجوع':'Back',
 'شاشة الكاشير':'Cashier','الفاتورة الحالية':'Current invoice','متابعة':'Continue',
 'تعليق البيع':'Suspend sale','المبيعات المعلقة':'Suspended sales','مدفوعات العملاء':'Customer payments',
 'مدفوعات الموردين':'Supplier payments','إضافة مصروف':'Record an expense',
 'تفاصيل الوردية':'Shift details','إغلاق الوردية':'Close shift','المشتريات':'Purchases',
 'الأصناف':'Products','المزيد':'More','مراجعة ودفع':'Review and pay',
 'تحديث':'Refresh','تصفية':'Filter','تصفية وبحث':'Filter and search',
 'مسح الفلاتر':'Clear filters','تطبيق الفلاتر':'Apply filters',
 'الموظف / الكاشير':'Employee / cashier','العميل / المورد':'Customer / Supplier',
 'نوع السند':'Voucher type','نوع الفاتورة':'Invoice type',
 'الأصناف الشائعة':'Popular products','أرصدة النقد والبنوك':'Cash and bank balance'
});
// Tighten the menu entry animation to a one-time appearance, never on unrelated updates.
let r21LastRoute='';
const r21BaseRender=render;
render=function(){
 const changed=route!==r21LastRoute;
 r21BaseRender();
 if(!S)return;
 // The cache may have restored the legacy dark class before the newest scripts loaded.
 document.body.classList.remove('dark');
 const c=document.getElementById('content');
 if(c){c.classList.toggle('r21-enter',changed);}
 if(changed)r21LastRoute=route;
 // Filter actions, including those rendered by older pages, always use a true filter icon.
 document.querySelectorAll('#content button[data-action="filter"]').forEach(btn=>{
  btn.type='button';btn.classList.add('r20-filter-btn');
  btn.setAttribute('aria-label',document.documentElement.lang==='en'?'Filter results':'تصفية النتائج');
  btn.title=btn.getAttribute('aria-label');
  if(!btn.querySelector('.r21-filter-glyph')){
   btn.innerHTML='<svg class="r21-filter-glyph" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16l-6.5 7.5v5.5l-3 2v-7.5Z"/></svg>';
  }
 });
 const lang=document.getElementById('languageBtn');
 if(lang){lang.onclick=()=>r20ApplyLanguage(document.documentElement.lang==='ar'?'en':'ar');}
};
if(S)render();
// On an update, activate the new offline shell when no unsaved form is open.
if('serviceWorker' in navigator){
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(document.getElementById('modal')?.open){toast('وصل تحديث للتطبيق؛ أغلق النافذة واحفظ بياناتك ثم أعد فتح التطبيق');return;}
  const key='rawan-erp-refreshed-2.1';
  try{if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,'1')}catch{return}
  window.location.reload();
 });
}
