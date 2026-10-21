'use strict';
/* WATHEQ 3.8 — reliable local work, compact attachments, logo sync and receipt. */
(() => {
  // A previously signed-in tenant keeps an unsent cart even after Chrome closes.
  // Credentials/records continue to use the original tenant-scoped storage.
  const priorGet=session.getItem.bind(session), priorSet=session.setItem.bind(session);
  const cartKey=()=> 'watheq:cart:v38:'+(window.WatheeqAuth?.identity?.companyId||'');
  session.getItem=function(key){
    const value=priorGet(key);
    if(key!=='rawan-cart')return value;
    try{return localStorage.getItem(cartKey())||value}catch{return value}
  };
  session.setItem=function(key,value){
    priorSet(key,value);
    if(key==='rawan-cart')try{localStorage.setItem(cartKey(),String(value))}catch{}
  };

  // v3.5 intentionally skips the photo bot for logos. Keep a PNG in company
  // settings to work offline, *and* upload the original PNG to the same media
  // backend as item photos, remembering the bot's stable file_id (not its
  // short-lived file URL). Any failure leaves the local pending state intact.
  if(window.WatheeqMedia?.prepare){
    const previousPrepare=WatheeqMedia.prepare;
    WatheeqMedia.prepare=async function(current){
      const state=await previousPrepare(current);
      const logo=state.settings?.logo||'';
      if(!/^data:image\/png;base64,/.test(logo))return state;
      const digestBuffer=await crypto.subtle.digest('SHA-256',Uint8Array.from(atob(logo.split(',')[1]),c=>c.charCodeAt(0)));
      const digest=Array.from(new Uint8Array(digestBuffer),b=>b.toString(16).padStart(2,'0')).join('');
      if(state.settings.logoTelegramDigest!==digest||!state.settings.logoTelegramFileId){
        const uploaded=await WatheeqMedia.upload(logo);
        state.settings.logoTelegramFileId=uploaded.fileId;
        state.settings.logoTelegramDigest=digest;
      }
      return state;
    };
  }

  // Rebuild voucher attachment picker as a normal-height control rather than
  // nesting a full-screen upload overlay inside a modal label. Its files are
  // converted to Data URLs before Store.run; an offline voucher posts locally.
  const previousVoucher=voucher;
  voucher=function(kind){
    previousVoucher(kind);
    if(!['receipt','payment'].includes(kind))return;
    const box=document.querySelector('#modalBody .w34-attachments');if(!box)return;
    box.className='w34-attachments w38-attachments';
    const heading=box.querySelector('h3');if(heading)heading.textContent='صور ومرفقات السند';
    const label=box.querySelector('.w35-attach-picker, label.primary');
    if(label)label.remove();
    box.querySelector('#w34AttachmentPreview')?.remove();
    const picker=document.createElement('div');
    picker.className='w38-attach-card';
    picker.innerHTML=`<label class="w38-attach-trigger" for="w38VoucherFiles"><span class="w38-upload-icon"><svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4H9l-2 3H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-3-3Z"/><circle cx="12" cy="13" r="3.5"/></svg></span><span class="w38-attach-copy"><b>إرفاق صور السند</b><small>اضغط لاختيار الصور · حتى 10 ميجابايت للصورة</small></span><span class="w38-attach-add" aria-hidden="true">＋</span></label><input id="w38VoucherFiles" type="file" accept="image/*" multiple aria-label="اختيار صور السند"><div id="w38AttachmentPreview" class="w38-attachment-preview" aria-live="polite"></div>`;
    box.append(picker);
    const input=picker.querySelector('input'),preview=picker.querySelector('#w38AttachmentPreview');
    let selected=[];
    const draw=()=>{preview.replaceChildren();selected.forEach((src,i)=>{
      const tile=document.createElement('div');tile.className='w38-attachment-tile';
      const img=document.createElement('img');img.src=src;img.alt='صورة السند '+(i+1);
      const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','حذف الصورة '+(i+1));
      remove.onclick=()=>{selected.splice(i,1);draw()};tile.append(img,remove);preview.append(tile);
    })};
    input.onchange=async()=>{try{
      const files=[...input.files];if(files.length+selected.length>12)throw Error('يمكن إرفاق حتى 12 صورة لكل سند');
      const data=await Promise.all(files.map(file=>WatheeqMedia.fileData(file)));
      selected.push(...data);draw();input.value='';
    }catch(e){input.value='';error(e)}};
    const previousSave=modalSave;
    modalSave=async function(form){
      // v34 and v35 also wrap E.post; put the selected photos through last.
      const oldPost=E.post;
      E.post=(state,data)=>oldPost(state,['receipt','payment'].includes(data.kind)?{...data,attachments:[...selected]}:data);
      try{return await previousSave(form)}finally{E.post=oldPost}
    };
  };

  // Preserve visible cart counters on mobile and on the desktop receipt panel.
  const lastRender=render;
  function cartCount(){return cart.reduce((sum,l)=>sum+Math.max(0,Number(l.qty||0)/1000),0)}
  function prettyCount(value){return Number(value.toFixed(2)).toLocaleString('ar',{maximumFractionDigits:2})}
  function attachCartBadge(){
    if(route!=='pos')return;
    const count=cartCount(),label=prettyCount(count);
    const header=document.querySelector('.pos .panel-title, .w36-cart-head');
    if(header){
      let badge=header.querySelector('.w38-cart-total');
      if(!badge){badge=document.createElement('span');badge.className='w38-cart-total';header.append(badge)}
      badge.textContent=label+' قطعة';
    }
    const nav=document.querySelector('.pos .cashier-tabs [data-pane="cart"], .pos [data-pos-view="cart"], .pos [data-pos-pane="cart"]');
    if(nav){
      let number=nav.querySelector('.w38-cart-badge');if(!number){number=document.createElement('span');number.className='w38-cart-badge';nav.append(number)}
      number.textContent=label;number.hidden=!count;
    }
    let jump=document.querySelector('#w38-cart-jump');
    if(!jump){
      jump=document.createElement('button');jump.type='button';jump.id='w38-cart-jump';jump.className='w38-cart-jump';
      jump.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l3 14h12l3-10H6"/></svg><span class="w38-cart-badge"></span>';
      jump.setAttribute('aria-label','عرض السلة');
      jump.onclick=()=>{const panel=document.querySelector('.pos .cart');if(panel){panel.scrollIntoView({behavior:'smooth',block:'start'});panel.classList.add('w38-cart-flash');setTimeout(()=>panel.classList.remove('w38-cart-flash'),650)}};
      const toolbar=document.querySelector('.pos .toolbar,.pos .w36-catalog-top,.pos .pos-search');
      if(toolbar)toolbar.append(jump);else document.querySelector('.pos')?.prepend(jump);
    }
    jump.querySelector('.w38-cart-badge').textContent=label;
    jump.querySelector('.w38-cart-badge').hidden=!count;
    jump.setAttribute('aria-label','عرض السلة: '+label+' قطعة');
  }
  render=function(...args){const result=lastRender(...args);if(S)attachCartBadge();return result};

  // Receipt picture rendered once for BOTH PNG export and ESC/POS Bluetooth.
  // Draw all text in high-contrast black; scale into 384px or 576px without
  // relying on an external font or a Telegram photo URL at print time.
  const fallbackReceipt=w28ReceiptCanvas;
  w28ReceiptCanvas=async function(documentRecord,width=1152){
    if(!documentRecord?.lines?.length)return fallbackReceipt(documentRecord,width);
    try{await document.fonts.ready}catch{}
    const base=576,scale=width/base;
    const scratch=document.createElement('canvas').getContext('2d');
    const ops=[];let y=12;
    const ctxFont=(size,bold=false)=>`${bold?'700 ': '400 '}${size}px Cairo, Arial, sans-serif`;
    const split=(value,max,size,bold=false)=>{
      scratch.font=ctxFont(size,bold);
      const pieces=String(value??'').split(/\s+/).filter(Boolean),rows=[];let row='';
      for(const word of pieces){const newRow=row?row+' '+word:word;
        if(scratch.measureText(newRow).width>max&&row){rows.push(row);row=word}else row=newRow;
      }if(row)rows.push(row);
      return rows.length?rows:[''];
    };
    function addText(value,size=22,bold=false,align='right',x=550,max=520){
      for(const line of split(value,max,size,bold)){ops.push({type:'text',line,size,bold,align,x,y});y+=size+10}
    }
    function center(value,size=22,bold=false,max=530){addText(value,size,bold,'center',288,max)}
    function rule(){y+=4;ops.push({type:'rule',y});y+=14}
    function amounts(title,value,strong=false){
      const font=strong?30:23,lh=font+15;
      ops.push({type:'text',line:String(title),size:font,bold:strong,align:'right',x:552,y});
      ops.push({type:'text',line:String(value),size:font,bold:strong,align:'left',x:18,y});y+=lh;
    }
    let logo=null;
    if(S.settings.showLogo!==false&&(S.settings.logo||S.settings.logoMono)){
      try{
        logo=new Image();logo.decoding='sync';logo.src=S.settings.logoMono||S.settings.logo;
        await logo.decode();
        const logoH=Math.min(110,logo.naturalHeight*165/logo.naturalWidth);
        ops.push({type:'logo',image:logo,logoH,y});y+=logoH+16;
      }catch{logo=null}
    }
    center(S.settings.company||'الوثيق',36,true);
    for(const key of ['address','phone','email'])if(S.settings[key])center(S.settings[key],22);
    if(S.settings.taxNumber)center('الرقم الضريبي: '+S.settings.taxNumber,19);
    rule();center(E.labels[documentRecord.kind]||'فاتورة',29,true);rule();
    addText('رقم الفاتورة: '+(documentRecord.number||'—'),23,true);
    addText('التاريخ: '+(documentRecord.date||''),22);
    addText('العميل / الطرف: '+(name('parties',documentRecord.party)==='—'?'نقدي':name('parties',documentRecord.party)),22);
    rule();
    for(let i=0;i<documentRecord.lines.length;i++){
      const ln=documentRecord.lines[i];
      addText((i+1)+'. '+(ln.name||name('products',ln.product)),27,true);
      const q=qty(ln.qty||ln.baseQty||0),unit=ln.unitName||'';
      addText('الكمية: '+q+' '+unit+'    ×    السعر: '+money(ln.price||0),22,false,'right',548,530);
      amounts('مجموع الصنف',money(ln.total??ln.cost??0));rule();
    }
    amounts('إجمالي الفاتورة',money((documentRecord.total??documentRecord.totalBase??0))+' '+(documentRecord.currency||S.settings.currency),true);
    const tax=E.sum(documentRecord.lines,line=>line.tax||0);
    if(tax)amounts(S.settings.taxLabel||'الضريبة',money(tax));
    if(documentRecord.paidBase!==undefined){
      amounts('المدفوع',money(documentRecord.paidBase));
      amounts('المتبقي',money(documentRecord.reversed?0:E.outstanding(S,documentRecord)));
    }
    if(documentRecord.cashChange?.length)for(const p of documentRecord.cashChange)amounts('الباقي '+p.currency,money(p.amount));
    if(documentRecord.note){rule();addText('ملاحظات: '+documentRecord.note,21)}
    y+=4;center(S.settings.receiptFooter||'شكراً لتعاملكم معنا',24,true);rule();
    center('برنامج الوثيق المحاسبي 0597603119',19,true);y+=12;
    const height=Math.ceil(y+8),out=document.createElement('canvas');out.width=width;out.height=Math.ceil(height*scale);
    const context=out.getContext('2d',{alpha:false});context.scale(scale,scale);context.fillStyle='#fff';context.fillRect(0,0,base,height);
    context.textBaseline='top';context.direction='rtl';context.fillStyle='#000';context.strokeStyle='#111';
    for(const op of ops){
      if(op.type==='logo'){const w=Math.min(165,op.image.naturalWidth*op.logoH/op.image.naturalHeight);context.drawImage(op.image,(base-w)/2,op.y,w,op.logoH)}
      else if(op.type==='rule'){context.lineWidth=1.5;context.setLineDash([5,5]);context.beginPath();context.moveTo(14,op.y);context.lineTo(base-14,op.y);context.stroke();context.setLineDash([])}
      else{context.font=ctxFont(op.size,op.bold);context.textAlign=op.align;context.fillText(op.line,op.x,op.y)}
    }
    return out;
  };
})();
