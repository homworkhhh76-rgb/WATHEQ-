'use strict';
/* Keep the established purchase editor and distribute its invoice discount
   through the same lines used by totals, drafts, edits, stock and posting. */
(()=>{
 const originalLines=readLines;
 readLines=function(){
  const lines=originalLines(),input=document.querySelector('#w55PurchaseDiscount');
  if(!input||currentKind!=='purchase')return lines;
  const value=E.dec(input.value||'0'),percent=$('#w55PurchaseDiscountKind').value==='pct';
  if(value<0||percent&&value>10000)throw Error('أدخل خصماً صالحاً');
  const bases=lines.map(l=>Math.max(0,E.md(l.qty,l.price,1000)-(l.discount||0)));
  let base=E.sum(bases,x=>x),remaining=percent?E.md(base,value,10000):value;
  if(remaining>base)throw Error('الخصم أكبر من قيمة الفاتورة');
  lines.forEach((l,i)=>{const part=base?Math.min(bases[i],Math.round(remaining*bases[i]/base)):0;l.discount=(l.discount||0)+part;remaining-=part;base-=bases[i]});
  return lines;
 };
 const previous=invoice;
 invoice=function(kind='sale',...args){
  const result=previous(kind,...args);if(kind!=='purchase')return result;
  const box=document.createElement('section');box.className='w54-discount w55-purchase-discount';
  box.innerHTML='<label>خصم الفاتورة<input id="w55PurchaseDiscount" type="number" min="0" step="0.01" inputmode="decimal" value="0"></label><label>نوع الخصم<select id="w55PurchaseDiscountKind"><option value="val">مبلغ ثابت بعملة الفاتورة</option><option value="pct">نسبة %</option></select></label>';
  $('#invoiceTotal').before(box);
  box.addEventListener('input',()=>updateInvoiceTotal());box.addEventListener('change',()=>updateInvoiceTotal());
  enhanceFields();updateInvoiceTotal();return result;
 };
})();
