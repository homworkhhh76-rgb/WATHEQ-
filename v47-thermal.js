'use strict';
/* v4.7 thermal template integration. Retains existing accounting and A4 printing. */
(()=>{
 const money=v=>Number(v||0)/100;
 const stamp=d=>{
  const day=String(d?.date||new Date().toISOString().slice(0,10));
  const t=d?.created?new Date(d.created):null;
  const hour=t&&!Number.isNaN(t.getTime())?t.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  return day+' '+hour;
 };
 function documentData(d){
  const party=S.parties.find(p=>p.id===d.party)||{}, lines=d.lines||[];
  const discount=lines.reduce((s,l)=>s+(l.discount||0),0);
  const grand=d.total??d.totalBase??0;
  const remainderBase=d.reversed?0:typeof E.outstanding==='function'&&d.paidBase!==undefined?E.outstanding(S,d):Math.max(0,(d.totalBase||0)-(d.paidBase||0));
  const remaining=d.rate? Math.round(remainderBase*1000000/d.rate):remainderBase;
  return {documentId:d.id, company:S.settings.company||'الوثيق',logo:S.settings.showLogo===false?'':(S.settings.logoMono||S.settings.logo||''),address:S.settings.address||'',phone:S.settings.phone||'',taxNumber:S.settings.taxNumber||'',
   invoiceTitle:(d.kind==='saleReturn'||d.kind==='purchaseReturn')?'فاتورة مرتجع':d.reversed?'ملغاة':'',isPurchase:d.kind==='purchase'||d.kind==='purchaseReturn',
   number:d.number,dateTime:stamp(d),customer:party.name||'عميل نقدي',customerPhone:party.phone||party.mobile||'',currency:d.currency||S.settings.currency,codeType:S.settings.thermalCode||'barcode',footerPhone:'0597603119',
   lines:lines.map(l=>({name:l.name||name('products',l.product),unit:l.unitName||'حبة',qty:Number((l.qty||0)/1000).toLocaleString('en-US',{maximumFractionDigits:3}),total:money((l.total||0)+(l.discount||0))})),
   subtotal:money(grand+discount),discount:money(discount),grandTotal:money(grand),remaining:money(remaining),paid:money(grand-remaining),note:d.note||''};
 }
 window.W47DocumentReceiptData=documentData;
 const previousReceipt=receiptHTML;
 receiptHTML=function(d){if(!d||!['sale','purchase','saleReturn','purchaseReturn'].includes(d.kind)||S.settings.print==='A4')return previousReceipt(d);return W47Thermal.html(documentData(d),S.settings.print||'80mm')};
 const priorPrint=printHTML;
 printHTML=async function(html,format=S.settings.print||'80mm'){
  if(format==='A4')return priorPrint(html,format);
  let layout=html;
  if(!/class="[^"]*w47-thermal-receipt/.test(layout||'')){
   const wrap=document.createElement('div');wrap.innerHTML=layout;
   const documentId=wrap.querySelector('.w28-receipt,.w47-thermal-receipt')?.dataset.document;
   const doc=documentId?S.docs.find(x=>String(x.id)===String(documentId)):null;
   if(doc)layout=W47Thermal.html(documentData(doc),format);
   else return priorPrint(html,format);
  }
  const area=document.getElementById('printArea');area.innerHTML=layout;area.dataset.format=format;
  const receipt=area.querySelector('.w47-thermal-receipt');
  receipt.classList.remove('paper-80mm','paper-57mm');receipt.classList.add(format==='58mm'?'paper-57mm':'paper-80mm');
  await (document.fonts?.ready||Promise.resolve());
  await Promise.all([...receipt.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})));
  // #printArea is hidden outside print; measure a visible offscreen clone.
  const measure=document.createElement('div');measure.style.cssText='position:fixed;left:-10000px;top:0;display:block;visibility:hidden;z-index:-1;background:white;';
  const copy=receipt.cloneNode(true);copy.style.setProperty('width',format==='58mm'?'46mm':'70mm','important');measure.append(copy);document.body.append(measure);
  const height=Math.max(35,Math.ceil(copy.getBoundingClientRect().height*25.4/96)+3);measure.remove();
  let style=document.getElementById('printStyle');if(!style){style=document.createElement('style');style.id='printStyle';document.head.append(style)}
  style.textContent=`@media print{@page{size:${format==='58mm'?'58':'80'}mm ${height}mm;margin:0!important}}`;
  window.print();
 };
 // Browser rasterization for ESC/POS Bluetooth and downloaded PNG. Use the same
 // 5-column receipt layout with pixel-perfect paper proportions, no remote CDN.
 const previousCanvas=w28ReceiptCanvas;
 w28ReceiptCanvas=async function(d,width=1152){
  if(!d?.lines?.length)return previousCanvas(d,width);
  const data=documentData(d),narrow=S.settings.print==='58mm'||(width<=384),paperWidth=width;
  if(document.fonts?.ready)await document.fonts.ready;
  const pixelScale=width/(narrow?384:576),base=narrow?384:576,ops=[],probe=document.createElement('canvas').getContext('2d');
  let y=10;
  const textFont=(size,bold=true)=>`${bold?'900':'700'} ${size}px W47Cairo, Cairo, sans-serif`;
  function wrap(value,max,size,bold=true){probe.font=textFont(size,bold);const result=[],words=String(value??'').split(/\s+/).filter(Boolean);let row='';
   for(const word of words){const next=row?row+' '+word:word;if(row&&probe.measureText(next).width>max){result.push(row);row=word}else row=next}
   if(row)result.push(row);
   return result.length?result:[''];}
  function txt(value,x,size=20,align='center',bold=true,rowHeight=size+5,max=base-28){const lines=wrap(value,max,size,bold);for(const line of lines){ops.push({t:'text',value:line,x,y,size,align,bold});y+=rowHeight}}
  function ruler(heavy=false){ops.push({t:'rule',y,heavy});y+=heavy?8:7}
  let logo=null;
  if(data.logo){try{logo=new Image();logo.crossOrigin='anonymous';logo.src=data.logo;await logo.decode();let ratio=logo.naturalWidth/logo.naturalHeight;let h=Math.min(46,60/ratio);ops.push({t:'image',image:logo,x:(base-Math.min(60,h*ratio))/2,y,w:Math.min(60,h*ratio),h});y+=h+4}catch{logo=null}}
  if(!logo){ops.push({t:'text',value:'◆',x:base/2,y,size:23,align:'center',bold:true});y+=25}
  txt(data.company,base/2,narrow?25:30,'center',true,31);
  if(data.address)txt(data.address,base/2,narrow?16:18,'center',true,21);
  if(data.phone)txt('جوال: '+data.phone,base/2,narrow?16:18,'center',true,21);
  if(data.taxNumber)txt('الرقم الضريبي: '+data.taxNumber,base/2,15,'center',true,20);
  if(data.invoiceTitle)txt(data.invoiceTitle,base/2,18,'center',true,22);
  y+=5;
  function double(right,left,size=16){ops.push({t:'text',value:String(right),x:base-10,y,size,align:'right',bold:true});ops.push({t:'text',value:String(left),x:10,y,size,align:'left',bold:true});y+=size+9}
  double('رقم الفاتورة: #'+data.number,data.dateTime,narrow?15:18);
  txt((data.isPurchase?'المورد: ':'العميل: ')+data.customer,base-12,narrow?16:18,'right',true,22,base-26);
  if(data.customerPhone)txt('الهاتف: '+data.customerPhone,base-12,15,'right',true,18);
  y+=3;ruler(true);
  // Percentage columns exactly as the supplied HTML: 8 / 44 / 12 / 16 / 20.
  const col=[.08,.44,.12,.16,.20],cum=[];let s=0;for(const w of col){cum.push(s+w/2);s+=w}
  const xc=cum.map(r=>(1-r)*base),headers=['#','الصنف','الوحدة','الكمية','الإجمالي'];
  for(let i=0;i<headers.length;i++)ops.push({t:'text',value:headers[i],x:xc[i],y,size:narrow?15:17,align:'center',bold:true});
  y+=(narrow?23:27);ruler(true);
  const font=narrow?14:17,lh=narrow?20:24;
  for(let i=0;i<data.lines.length;i++){
   const l=data.lines[i],names=wrap(l.name,base*.41,font,true),units=wrap(l.unit,base*.11,font,true),tall=Math.max(names.length,units.length,1);
   ops.push({t:'text',value:String(i+1),x:xc[0],y,size:font,align:'center',bold:true});
   names.forEach((v,j)=>ops.push({t:'text',value:v,x:base*(1-.08)-2,y:y+j*lh,size:font,align:'right',bold:true}));
   units.forEach((v,j)=>ops.push({t:'text',value:v,x:xc[2],y:y+j*lh,size:font,align:'center',bold:true}));
   ops.push({t:'text',value:String(l.qty),x:xc[3],y,size:font,align:'center',bold:true});
   ops.push({t:'text',value:W47Thermal.money(l.total),x:8,y,size:font,align:'left',bold:true});
   y+=tall*lh+5;ops.push({t:'rule',y,heavy:false});y+=6;
  }
  y+=3;
  const gap=4,half=(base-20-gap)/2,start=10,boxH=narrow?31:37;
  function twoBoxes(a,b,blackFirst=false){ops.push({t:'box',x:start+half+gap,y,w:half,h:boxH,label:a[0],val:W47Thermal.money(a[1]),black:blackFirst});ops.push({t:'box',x:start,y,w:half,h:boxH,label:b[0],val:W47Thermal.money(b[1]),black:false});y+=boxH+4}
  twoBoxes(['الإجمالي:',data.subtotal],['الخصم:',data.discount]);
  twoBoxes(['النهائي:',data.grandTotal],['المتبقي:',data.remaining],true);
  if(data.note)txt(data.note,base/2,narrow?14:16,'center',true,18);
  y+=3;ruler();txt('برنامج الوثيق المحاسبي 0597603119',base/2,narrow?16:20,'center',true,narrow?22:26);
  const codeType=S.settings.thermalCode||'barcode';
  if(codeType!=='none'){const svg=codeType==='qrcode'?W47Thermal.qrSVG(`INV:${data.number}|TOTAL:${data.grandTotal.toFixed(2)}|TEL:0597603119`):W47Thermal.barcodeSVG(data.number);
   if(svg){try{const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await img.decode();const cw=codeType==='qrcode'?(narrow?65:85):Math.min(base-22,Math.max(90,img.naturalWidth*1.5)),ch=codeType==='qrcode'?cw:35;ops.push({t:'code',image:img,x:(base-cw)/2,y,w:cw,h:ch});y+=ch+5}catch(e){console.warn('Code image',e)}}}
  y+=7;
  const canvas=document.createElement('canvas');canvas.width=paperWidth;canvas.height=Math.ceil(y*pixelScale);const ctx=canvas.getContext('2d',{alpha:false});ctx.setTransform(pixelScale,0,0,pixelScale,0,0);ctx.fillStyle='#fff';ctx.fillRect(0,0,base,y);ctx.textBaseline='top';ctx.direction='rtl';
  for(const o of ops){ctx.fillStyle='#000';ctx.strokeStyle='#000';
   if(o.t==='text'){ctx.font=textFont(o.size,o.bold);ctx.textAlign=o.align;ctx.fillText(o.value,o.x,o.y)}
   else if(o.t==='rule'){ctx.lineWidth=o.heavy?2.4:1;ctx.setLineDash(o.heavy?[]:[3,3]);ctx.beginPath();ctx.moveTo(8,o.y);ctx.lineTo(base-8,o.y);ctx.stroke();ctx.setLineDash([])}
   else if(o.t==='image'||o.t==='code'){try{ctx.drawImage(o.image,o.x,o.y,o.w,o.h)}catch{}}
   else if(o.t==='box'){ctx.fillStyle=o.black?'#000':'#fff';ctx.fillRect(o.x,o.y,o.w,o.h);ctx.strokeStyle='#000';ctx.lineWidth=o.black?2.4:1.4;ctx.strokeRect(o.x,o.y,o.w,o.h);
    const size=narrow?15:19;ctx.font=textFont(size,true);ctx.textAlign='right';ctx.fillStyle=o.black?'#fff':'#000';ctx.fillText(o.label,o.x+o.w-5,o.y+(o.h-size)/2);ctx.textAlign='left';ctx.fillText(o.val,o.x+5,o.y+(o.h-size)/2)}
  }
  return canvas;
 };
 if(window.actions?.printDesign){const original=actions.printDesign;actions.printDesign=function(){original();const grid=document.querySelector('#modalBody .form-grid');if(grid&&!grid.querySelector('[name="thermalCode"]'))grid.insertAdjacentHTML('beforeend',select('الرمز أسفل الفاتورة','thermalCode',[{id:'barcode',name:'باركود Code 128'},{id:'qrcode',name:'QR Code'},{id:'none',name:'بدون رمز'}],S.settings.thermalCode||'barcode'))}};
 // POS laptop print is a pre-sale preview (no accounting posting), yet should
 // still use the same layout and actual cart, never the removed demo products.
 const pos=window.WatheeqPOSBridge;
 window.W47POSData= function(d){
  const rows=d.lines||[],total=Number(d.totals?.total||0),gross=Number(d.totals?.gross||total),discount=Number(d.totals?.discount||0);
  return {company:d.company,address:d.address,phone:d.phone,logo:d.logo,number:d.number==='جديدة'?'معاينة':d.number,dateTime:(d.date||new Date().toISOString().slice(0,10))+' '+new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),customer:d.customer,currency:d.currency,codeType:S.settings.thermalCode||'barcode',lines:rows.map(l=>({name:l.name,unit:l.unit,qty:l.qty,total:Math.max(0,l.qty*l.price-l.discount)*(1+l.tax/100)})),subtotal:gross,discount,grandTotal:total,remaining:0,note:'معاينة غير معتمدة'};
 };
 if(pos?.receipt){pos.print=function(){const d=pos.receipt();if(!d?.lines?.length){toast('لا توجد أصناف لطباعة الفاتورة');return}printHTML(W47Thermal.html(window.W47POSData(d),S.settings.print||'80mm'),S.settings.print||'80mm').catch(error)}}
})();
