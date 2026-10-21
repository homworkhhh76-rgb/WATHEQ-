'use strict';
// Payment accounts use the same ledger as invoices and vouchers.
function w29PaymentAccounts(){
 const accounts=S.accounts.filter(a=>a.parent==='110');
 modal('حسابات الدفع',`<div class="w29-account-tools"><button type="button" class="primary" data-w29-add-account>${icon('plus')} إضافة حساب دفع</button><button type="button" data-new="cashTransfer">${icon('cash')} تحويل بين الحسابات</button></div><div class="w29-accounts">${accounts.map(a=>`<article class="w29-account"><span>${icon('cash')}</span><div><b>${esc(a.name)}</b><small>الرصيد الحالي · ${esc(S.settings.currency)}</small><strong>${money(E.balance(S,a.id))}</strong></div><button type="button" data-w29-edit-account="${esc(a.id)}" aria-label="تعديل الحساب">${icon('edit')}</button></article>`).join('')}</div>`,null);
}
function w29AccountForm(id){
 const account=id?find('accounts',id):null,accountId=id||E.uid(),openingId=E.uid();
 if(id&&(!account||account.parent!=='110'))throw Error('حساب دفع غير موجود');
 modal(id?'تعديل حساب الدفع':'إضافة حساب دفع',`<div class="form-grid w29-account-form">${field('اسم حساب الدفع','name',account?.name||'','text','required maxlength="100"')}${!id?field('الرصيد الافتتاحي · '+S.settings.currency,'opening','0','number','step="0.01" required')+field('تاريخ الرصيد الافتتاحي','date',today(),'date','required'):'<p class="muted">الرصيد الحالي: '+money(E.balance(S,id))+' '+esc(S.settings.currency)+'</p>'}</div>`,async f=>{
  const name=String(f.get('name')||'').trim();if(!name)throw Error('اسم الحساب مطلوب');
  const opening=id?0:E.dec(f.get('opening'));
  await mutate(s=>{
   if(s.accounts.some(a=>a.parent==='110'&&a.id!==accountId&&a.name.trim()===name))throw Error('اسم حساب الدفع مستخدم بالفعل');
   E.put(s,'accounts',{id:accountId,name,type:'asset',parent:'110'});
   if(!id&&opening)E.post(s,{id:openingId,kind:'journal',date:f.get('date'),currency:s.settings.currency,rate:1000000,note:'رصيد افتتاحي لحساب الدفع: '+name,entries:[{account:accountId,debit:Math.max(0,opening),credit:Math.max(0,-opening)},{account:'310',debit:Math.max(0,-opening),credit:Math.max(0,opening)}]});
  },'تم حفظ حساب الدفع');
 });
}
const w29Voucher=voucher;voucher=function(kind){
 if(kind!=='cashTransfer')return w29Voucher(kind);
 const accounts=S.accounts.filter(a=>a.parent==='110');if(accounts.length<2)throw Error('أضف حسابي دفع على الأقل');
 const id=E.uid();
 modal('تحويل بين الحسابات',`<div class="form-grid w29-transfer">${select('من حساب','cash',accounts,accounts[0].id)}${select('إلى حساب','targetAccount',accounts,accounts[1].id)}${field('المبلغ','amount','','number','min="0.01" step="0.01" required')}${currencyFields()}${field('التاريخ','date',today(),'date','required')}${field('البيان','note','')}</div><div id="w29TransferPreview" class="notice"></div>`,async f=>{
  const cash=f.get('cash'),target=f.get('targetAccount');if(cash===target)throw Error('اختر حسابين مختلفين');
  await mutate(s=>E.post(s,{id,kind:'cashTransfer',cash,targetAccount:target,amount:E.dec(f.get('amount')),currency:f.get('currency'),rate:E.dec(f.get('rate'),6),date:f.get('date'),note:f.get('note')}),'تم التحويل بين الحسابات');
 },'حفظ التحويل');
 bindCurrency();const preview=()=>{const from=inputVal('cash'),to=inputVal('targetAccount');$('#w29TransferPreview').textContent='رصيد المصدر: '+money(E.balance(S,from))+' · رصيد المستلم: '+money(E.balance(S,to))+' '+S.settings.currency};$('.w29-transfer').addEventListener('change',preview);preview();
};
actions.paymentAccounts=w29PaymentAccounts;
const w29Accounts=accountsPage;accountsPage=function(){return w29Accounts()+`<div class="w29-account-tools"><button data-action="paymentAccounts">${icon('cash')} حسابات الدفع</button><button data-new="cashTransfer">تحويل بين الحسابات</button></div>`};
const w29Vouchers=vouchersPage;vouchersPage=function(){return `<div class="w29-account-tools"><button data-action="paymentAccounts">${icon('cash')} حسابات الدفع</button></div>`+w29Vouchers()};
const w29Settings=settingsPage;settingsPage=function(){return w29Settings().replace('<div data-w28-panel="pos">','<div data-w28-panel="pos"><div class="w29-account-tools"><button type="button" data-action="paymentAccounts">حسابات الدفع</button><button type="button" data-new="cashTransfer">تحويل بين الحسابات</button></div>')};
const w29More=nativeMore;nativeMore=function(){return w29More()+`<div class="w29-account-tools"><button data-action="paymentAccounts">${icon('cash')} حسابات الدفع</button><button data-new="cashTransfer">${icon('vouchers')} تحويل بين الحسابات</button></div>`};
// One success sound for all cashier input paths, including keyboard scanners.
const w29Barcode=addBarcode;addBarcode=function(code){enableBarcodeAudio();const accepted=w29Barcode(String(code).trim());if(accepted===true)barcodeBeep();return accepted};
const w29PaymentRow=paymentRow;paymentRow=function(p){w29PaymentRow(p);const row=$('#payments .payment-row:last-child');if(row){row.querySelector('[data-p=rate]').title='سعر الصرف';row.querySelector('[data-p=amount]').title='المبلغ';const del=row.querySelector('button');del.setAttribute('aria-label','حذف الدفعة');del.title='حذف الدفعة'}};
const w29Render=render;render=function(){w29Render();$('#typographyBtn')?.remove();document.body.classList.remove('large-text');document.querySelectorAll('[data-w25-refresh]').forEach(el=>el.remove())};
const w29Modal=modal;modal=function(...args){const result=w29Modal(...args);document.querySelectorAll('#modalBody [data-w25-refresh]').forEach(el=>el.remove());return result};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;try{if(b.hasAttribute('data-w29-add-account'))w29AccountForm();if(b.dataset.w29EditAccount)w29AccountForm(b.dataset.w29EditAccount)}catch(err){error(err)}});
if(S)render();
