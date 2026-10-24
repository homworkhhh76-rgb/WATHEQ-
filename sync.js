/* AlWatheeq v3.9 — safe offline-first startup and resumable Turso sync. */
(function(){
 'use strict';
 let busy=false,again=false,lastAccess=0,conflict=null,started=false;
 let schemaReady=false,bootWaiting=false,bootBusy=false,finishBoot=null;
 let current={status:'waiting',label:'بانتظار تسجيل الدخول',time:Date.now(),error:''};
 function status(state,label,reason=''){
  current={status:state,label,time:Date.now(),error:String(reason||'')};
  window.dispatchEvent(new CustomEvent('watheeq:sync',{detail:current}));
 }
 function message(e){return String(e?.message||e||'اتصال غير متاح').slice(0,260)}
 function config(){
  const rt=WatheeqAuth.identity;
  return {db:OscarActivation.readDatabaseAccess(rt.companyId)||rt.database,
   path:'oscar/companies/'+encodeURIComponent(rt.companyId)+'/alwatheeq/v1/state'};
 }
 async function ensureSchema(){
  if(schemaReady)return;
  // A restored/cached login can skip the remote activation call that used to create
  // this table. Do not mistake a missing table for unavailable company records.
  await OscarActivation.tursoDirect.ensure(config().db);
  schemaReady=true;
 }
 async function readCloud(){
  const {db,path}=config(),d=OscarActivation.tursoDirect;
  const row=await d.readExact(db,path);
  if(row&&(row.schema!=='alwatheeq-1'||!Number.isSafeInteger(row.version)||row.version<1||row.companyId!==WatheeqAuth.identity.companyId))
   throw Error('نسخة الشركة السحابية غير متوافقة؛ لم تُستبدل سجلاتك');
  if(row)ERP.validate(ERP.upgrade(ERP.clone(row.state)));
  return row;
 }
 async function push(state,version){
  const {db,path}=config(),d=OscarActivation.tursoDirect,table=d.table(db),next=version+1;
  const payload=JSON.stringify({schema:'alwatheeq-1',companyId:WatheeqAuth.identity.companyId,version:next,state});
  const result=version===0
   ?await d.pipeline(db,[{sql:`INSERT INTO ${table} (path,payload,deleted,updated_at) VALUES (?,?,0,?) ON CONFLICT(path) DO NOTHING`,args:[path,payload,next]}])
   :await d.pipeline(db,[{sql:`UPDATE ${table} SET payload=?,deleted=0,updated_at=? WHERE path=? AND deleted=0 AND json_extract(payload,'$.version')=?`,args:[payload,next,path,version]}]);
  return Number(result[0].affected_row_count)===1;
 }
 async function sync(){
  if(!started||WatheeqAuth.blocked||conflict)return false;
  if(busy){again=true;return false}
  busy=true;
  try{
   if(!navigator.onLine){status('offline','دون اتصال — بيانات الجهاز محفوظة','الاتصال غير متاح');return false}
   // Verify access when connected, but only consider explicit revocation a logout.
   if(Date.now()-lastAccess>60000){
    try{await WatheeqAuth.revalidate();lastAccess=Date.now()}
    catch(e){
     if(/لا يطابق|تم إيقاف|انتهت|تم إصدار|لم يعد|حساب الشركة غير فعال|تم تعطيل|تم إلغاء/.test(message(e))){WatheeqAuth.lock(message(e));throw e}
     throw e;
    }
   }
   await ensureSchema();
   for(let attempt=0;attempt<5;attempt++){
    const local=await Store.snapshot();
    const cfg=config(),d=OscarActivation.tursoDirect;
    const [meta]=await d.pipeline(cfg.db,[{sql:`SELECT json_extract(payload,'$.version') AS version FROM ${d.table(cfg.db)} WHERE path=? AND deleted=0`,args:[cfg.path]}]);
    const remoteVersion=Number(d.rows(meta)[0]?.version||0);
    // The first launch has version 0 and NO cached database. Never skip cloud
    // retrieval because remoteVersion happens to equal the local default 0.
    if(local.exists&&!local.meta.pending&&remoteVersion===local.meta.version){
     status('synced','متزامن — لا تغييرات معلّقة');return true;
    }
    status('syncing','جاري قراءة ومزامنة بيانات الشركة');
    const remote=await readCloud(),version=remote?.version||0;
    let state,needsPush=!!local.meta.pending;
    if(!local.meta.pending){
     if(remote){state=ERP.upgrade(ERP.clone(remote.state))}
     else if(local.exists&&local.meta.version)throw Error('السجل السحابي غير موجود؛ بياناتك المحلية لم تُستبدل');
     else if(local.exists){
      // Already bootstrapped locally from a verified empty cloud. Keep it.
      status('synced','متصل — لا تغييرات معلّقة');return true;
     }else{
      // Confirmed with Turso: company has no state record yet. Create one
      // atomically; INSERT DO NOTHING protects against a concurrent first login.
      state=ERP.upgrade(ERP.fresh());ERP.validate(state);needsPush=true;
     }
    }else{
     if(!remote&&local.meta.version)throw Error('السجل السحابي غير موجود؛ احتُفظ بالبيانات المحلية');
     if(version===local.meta.version)state=local.state;
     else{
      try{state=WatheeqMerge.merge(local.meta.base||ERP.upgrade(ERP.fresh()),local.state,ERP.upgrade(ERP.clone(remote?.state||ERP.fresh())),ERP)}
      catch(e){
       if(e.name==='SyncConflict'){
        conflict={message:e.message,remote};status('conflict','تعارض مزامنة — اضغط للمراجعة',e.message);
        window.dispatchEvent(new Event('watheeq:conflict'));return false;
       }
       throw e;
      }
     }
    }
    if(needsPush){
     if(window.WatheeqMedia)state=await WatheeqMedia.prepare(state);
     ERP.validate(state);
     if(!await push(state,version))continue;
    }
    const savedVersion=needsPush?version+1:version;
    if(await Store.acknowledge(local.meta.generation||0,state,savedVersion,state)){
     if(!local.exists||!WatheeqMerge.eq(local.state,state))
      window.dispatchEvent(new CustomEvent('watheeq:remote',{detail:state}));
     const check=await Store.snapshot();
     if(check.meta.pending)continue;
     status('synced','متزامن — جميع التغييرات وصلت للسحابة');return true;
    }
    if(local.meta.pending){
     const rebased=await Store.rebase(local.state,state,savedVersion);
     if(rebased)window.dispatchEvent(new CustomEvent('watheeq:remote',{detail:rebased}));
    }
   }
   status('pending','تغييرات جديدة قيد الإرسال');again=true;return false;
  }catch(e){
   const reason=message(e);
   status(navigator.onLine?'error':'offline',navigator.onLine?'تعذرت المزامنة — المحفوظ محلياً آمن':'دون اتصال — المحفوظ محلياً آمن',reason);
   return false;
  }finally{
   busy=false;
   if(again){again=false;setTimeout(()=>{if(bootWaiting)attemptBoot();else sync()},600)}
  }
 }
 async function attemptBoot(){
  if(!bootWaiting||bootBusy||WatheeqAuth.blocked)return;
  bootBusy=true;
  try{
   WatheeqAuth.progress(65,'جاري استعادة بيانات الشركة');
   const result=await sync();
   const snapshot=await Store.snapshot();
   if(result&&snapshot.exists){
    // Only dismiss the startup gate after valid tenant-scoped data is in IndexedDB.
    ERP.validate(snapshot.state);
    bootWaiting=false;
    WatheeqAuth.progress(100,'تم تجهيز بيانات الشركة');WatheeqAuth.finish();
    finishBoot?.();finishBoot=null;
   }else if(!WatheeqAuth.blocked){
    WatheeqAuth.initialFailure(current.error||'لم تتوفر بيانات محلية لهذا الحساب حتى الآن',attemptBoot);
   }
  }catch(e){
   WatheeqAuth.initialFailure(message(e),attemptBoot);
  }finally{bootBusy=false}
 }
 function schedule(){
  setInterval(()=>{
   if(document.hidden||WatheeqAuth.blocked||current.status==='conflict')return;
   if(bootWaiting){
    if(navigator.onLine&&Date.now()-current.time>9000)attemptBoot();
   }else if(navigator.onLine&&Date.now()-current.time>(current.status==='error'?12000:3200))sync();
  },3200);
 }
 window.WatheeqSync={
  get state(){return current},get conflict(){return conflict},
  sync,
  async start(){
   if(started)return;
   started=true;WatheeqAuth.progress(65,'قراءة بيانات الشركة المحفوظة');
   const cached=await Store.snapshot();
   if(cached.exists){
    ERP.validate(cached.state);
    status(navigator.onLine?'pending':'offline',cached.meta.pending?'عملياتك محفوظة محلياً — بانتظار المزامنة':'فتحنا آخر نسخة محفوظة على الجهاز');
    WatheeqAuth.progress(100,current.label);WatheeqAuth.finish();
    schedule();setTimeout(sync,0);return;
   }
   // No offline snapshot exists for this company on this device. Keep the gate
   // visible and retry in-place; do not open an empty ERP or clear auth/storage.
   bootWaiting=true;
   schedule();
   const promise=new Promise(resolve=>{finishBoot=resolve});
   attemptBoot();
   return promise;
  },
  retryStartup(){if(bootWaiting)attemptBoot();else sync()},
  async useCloud(expectedGeneration){
   if(!conflict)return;
   const remote=await readCloud();if(!remote)throw Error('لم تُقرأ بيانات الشركة');
   const state=ERP.upgrade(ERP.clone(remote.state));
   if(!await Store.acknowledge(expectedGeneration,state,remote.version,state))throw Error('تغيرت بيانات الجهاز؛ نزّل نسخة جديدة قبل المتابعة');
   conflict=null;window.dispatchEvent(new CustomEvent('watheeq:remote',{detail:state}));status('synced','تم اعتماد نسخة الشركة');
  }
 };
 window.addEventListener('saved',()=>{if(started){status('pending','محفوظ على الجهاز — بانتظار المزامنة');queueMicrotask(sync)}});
 window.addEventListener('online',()=>{if(bootWaiting)attemptBoot();else sync()});
 window.addEventListener('offline',()=>status('offline','دون اتصال — البيانات محفوظة على الجهاز'));
 window.addEventListener('focus',()=>{if(!started)return;if(bootWaiting)attemptBoot();else sync()});
})();
