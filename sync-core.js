(function(root){'use strict';
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b),copy=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
class Conflict extends Error{constructor(path){super('تغييرات متزامنة تحتاج مراجعة: '+path);this.name='SyncConflict'}}
function mergeValue(base,local,remote,path){if(/^settings\.(parties|employees)ChartSerial$/.test(path))return Math.max(base||0,local||0,remote||0);if(eq(local,base))return copy(remote);if(eq(remote,base)||eq(local,remote))return copy(local);
 if(Array.isArray(base)&&Array.isArray(local)&&Array.isArray(remote)&&[...base,...local,...remote].every(x=>x&&typeof x==='object'&&x.id)){const b=new Map(base.map(x=>[x.id,x])),l=new Map(local.map(x=>[x.id,x])),r=new Map(remote.map(x=>[x.id,x]));return [...new Set([...r.keys(),...l.keys()])].map(id=>mergeValue(b.get(id),l.get(id),r.get(id),path+'.'+id)).filter(x=>x!==undefined)}
 if(base&&local&&remote&&![base,local,remote].some(Array.isArray)&&[base,local,remote].every(x=>typeof x==='object')){const out={};for(const k of new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)])){const v=mergeValue(base[k],local[k],remote[k],path+'.'+k);if(v!==undefined)out[k]=v}return out}throw new Conflict(path)}
// Financial state is one unit: no union of ledgers or stock snapshots.
const financial=['docs','stock','shifts','fiscal_years','periods'];
function merge(base,local,remote,engine){const out={};const pack=s=>Object.fromEntries(financial.map(k=>[k,s[k]]));const b=pack(base),l=pack(local),r=pack(remote);let replay=false;
if(!eq(l,b)&&!eq(r,b)&&!eq(l,r)){
 // Replay only append-only transactions with unchanged pricing, periods and shifts.
 const deps=['products','accounts','currencies','settings','fiscal_years','periods'];
 const prefix=(original,changed)=>original.every((d,i)=>eq(d,changed[i]));
 if(!engine||deps.some(k=>!eq(local[k],base[k])||!eq(remote[k],base[k]))||!prefix(base.docs,local.docs)||!prefix(base.docs,remote.docs))throw new Conflict('الفواتير / المخزون / الورديات');
 replay=true;Object.assign(out,copy(r));if([...local.shifts,...remote.shifts].some(sh=>!sh.operatorId)&&(!eq(local.shifts,base.shifts)||!eq(remote.shifts,base.shifts)))throw new Conflict('الورديات السابقة تحتاج مراجعة');out.shifts=mergeValue(base.shifts,local.shifts,remote.shifts,'shifts');for(const sh of out.shifts.filter(x=>x.closed)){const was=base.shifts.find(x=>x.id===sh.id);if(!was?.closed){const closedLocally=local.shifts.find(x=>x.id===sh.id)?.closed;const other=closedLocally?remote:local;const closing=closedLocally?local:remote;if(other.docs.some(d=>d.shiftId===sh.id&&!closing.docs.some(x=>x.id===d.id)))throw new Conflict('إغلاق وردية مع حركات جديدة')}}
}else Object.assign(out,copy(eq(l,b)?r:l));
for(const k of new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)])){if(financial.includes(k)||k==='revision')continue;out[k]=mergeValue(base[k],local[k],remote[k],k)}
if(replay){for(const doc of local.docs.slice(base.docs.length)){const exists=out.docs.find(d=>d.id===doc.id);if(exists){if(!eq(exists._syncInput,doc._syncInput))throw new Conflict('المستند '+doc.id);continue}if(!doc._syncInput||['reverse','close'].includes(doc.kind))throw new Conflict('المستند '+doc.id);try{const posted=engine.post(out,copy(doc._syncInput));posted.created=doc.created}catch(e){throw new Conflict('تعذر ترحيل المستند '+doc.number+' — '+e.message)}}}
out.revision=Math.max(local.revision||0,remote.revision||0)+1;if(engine)engine.upgrade(out);return out}

const api={merge,mergeValue,Conflict,eq};if(typeof module!=='undefined')module.exports=api;else root.WatheeqMerge=api;
})(typeof window!=='undefined'?window:globalThis);
