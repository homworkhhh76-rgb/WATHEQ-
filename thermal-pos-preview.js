'use strict';
/* Same v4.7 thermal receipt on laptop preview, powered by the company snapshot. */
(()=>{
 let latest=null;
 window.addEventListener('message',event=>{if(event.source!==window.parent)return;if(event.data?.type==='watheeq:pos-sync')latest=event.data.data},{passive:true});
 const cash=(id)=>document.getElementById(id);
 function val(v){return Number(v||0)}
 window.previewPrint=function(){
  const d=latest?.receipt;if(!d?.lines?.length){alert('السلة فارغة');return}
  const t=d.totals||{},total=val(t.total),discount=val(t.discount);
  let paid=0;
  const method=window.currentPayMethod||'cash';
  if(method==='cash')paid=Math.min(total,Math.max(0,val(cash('cash-received')?.value||total)));
  if(method==='partial')paid=Math.min(total,Math.max(0,val(cash('partial-paid')?.value)));
  if(method==='installment')paid=Math.min(total,Math.max(0,val(cash('inst-down')?.value)));
  if(method==='multi'&&Array.isArray(window.multiPayAccounts))paid=Math.min(total,window.multiPayAccounts.reduce((sum,p)=>sum+val(p.amount),0));
  const data={company:d.company,logo:d.logo,address:d.address,phone:d.phone,number:d.number==='جديدة'?'معاينة':d.number,
   dateTime:d.date+' '+new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),customer:d.customer,
   customerPhone:'',currency:d.currency,subtotal:val(t.gross),discount,grandTotal:total,paid,remaining:Math.max(0,total-paid),codeType:'barcode',note:'معاينة غير معتمدة',
   lines:d.lines.map(l=>({name:l.name,unit:l.unit,qty:l.qty,total:Math.max(0,l.qty*l.price-l.discount)*(1+val(l.tax)/100)}))};
  const size=latest?.printSize==='58mm'?'58mm':'80mm';
  const root=cash('receipt-content');root.innerHTML=W47Thermal.html(data,size);
  cash('print-modal').style.display='flex';
 };
 window.addEventListener('beforeprint',()=>{
  const r=cash('receipt-content')?.querySelector('.w47-thermal-receipt');if(!r)return;
  const size=r.dataset.w47Paper==='58mm'?58:80;
  const cm=r.cloneNode(true);const holder=document.createElement('div');holder.style.cssText='position:fixed;left:-9999px;top:0;visibility:hidden;display:block';cm.style.width=(size===58?'46':'70')+'mm';holder.append(cm);document.body.append(holder);
  const h=Math.max(35,Math.ceil(cm.getBoundingClientRect().height*25.4/96)+4);holder.remove();
  let style=cash('w47-pos-print-page');if(!style){style=document.createElement('style');style.id='w47-pos-print-page';document.head.append(style)}style.textContent=`@media print{@page{size:${size}mm ${h}mm;margin:0!important}body .thermal-receipt{width:auto!important;max-width:none!important;position:absolute!important;top:0!important;left:0!important;right:0!important}}`;
 });
})();
