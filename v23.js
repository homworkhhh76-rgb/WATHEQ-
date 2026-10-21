'use strict';
// A party and its balanced opening journal are committed in the same transaction.
function r23SaveParty(s,data,opening){
 const amount=opening.amount;
 if(!Number.isSafeInteger(amount)||amount<0)throw Error('الرصيد الافتتاحي يجب أن يكون مبلغاً موجباً أو صفراً');
 if(!['receivable','payable'].includes(opening.side))throw Error('حدد لنا أو علينا');
 const p=E.put(s,'parties',data);
 if(amount){const debit=opening.side==='receivable'?amount:0,credit=opening.side==='payable'?amount:0;
 E.post(s,{id:'party-opening-'+p.id,kind:'journal',date:opening.date,currency:s.settings.currency,rate:1000000,party:p.id,note:'رصيد افتتاحي — '+p.name,entries:[{account:['supplier','both'].includes(p.type)?'210':'120',party:p.id,debit,credit},{account:'310',debit:credit,credit:debit}]});
 p.openingBalance={amount,side:opening.side,date:opening.date};
 }return p;
}
const r23Edit=editEntity;
editEntity=function(table,id){r23Edit(table,id);if(table==='parties'&&!id){$('#modalBody').insertAdjacentHTML('beforeend',`<section class="r23-opening"><div class="section-label">الرصيد الافتتاحي · ${esc(S.settings.currency)}</div><div class="form-grid">${field('المبلغ','openingAmount','0','number','min="0" step="0.01" data-hint-ready="1" placeholder="0"')}${select('الرصيد','openingSide',[{id:'receivable',name:'لنا — الطرف مدين لنا'},{id:'payable',name:'علينا — الطرف دائن علينا'}],'receivable')}${field('تاريخ الرصيد','openingDate',today(),'date','required')}</div></section>`);enhanceFields()}};
// Keep desktop selectors anchored to their own field, without a full-page overlay.
const r23Open=openChoice,r23Close=closeChoice;
function r23PlaceChoice(){const panel=$('#choicePage');if(panel.hidden||!panel.classList.contains('r23-dropdown')||!activeSelect)return;const trigger=activeSelect.nextElementSibling||activeSelect,rect=trigger.getBoundingClientRect();const width=Math.min(Math.max(rect.width,260),innerWidth-24);panel.style.left=Math.max(12,Math.min(rect.right-width,innerWidth-width-12))+'px';panel.style.top=(Math.min(rect.bottom+5,innerHeight-100))+'px';panel.style.width=width+'px';panel.style.maxHeight=Math.max(80,Math.min(360,innerHeight-rect.bottom-17))+'px';for(const key of ['left','top','width','max-height'])panel.style.setProperty(key,panel.style.getPropertyValue(key),'important')}
openChoice=function(s){const panel=$('#choicePage');panel.classList.toggle('r23-dropdown',r22Wide.matches);r23Open(s);if(r22Wide.matches){document.body.classList.remove('choosing');r23PlaceChoice();$('#choiceSearch').focus()}};
closeChoice=function(back=true){r23Close(back);$('#choicePage').classList.remove('r23-dropdown');$('#choicePage').removeAttribute('style')};
$('#choiceBack').onclick=()=>closeChoice();
document.addEventListener('pointerdown',e=>{if(!$('#choicePage').hidden&&$('#choicePage').classList.contains('r23-dropdown')&&!e.target.closest('#choicePage,.select-trigger'))closeChoice()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#choicePage').hidden){e.preventDefault();closeChoice()}});
window.addEventListener('resize',()=>{if(!$('#choicePage').hidden)closeChoice()});
document.addEventListener('scroll',e=>{if(!$('#choicePage').hidden&&!$('#choicePage').contains(e.target))r23PlaceChoice()},true);
