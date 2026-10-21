'use strict';
const CACHE='rawan-erp-static-v3.8.0';
const MEDIA_CACHE='rawan-erp-seen-photos-v1';
const FILES=['./v38.js','./v38.css','./v37.js','./v37.css','./v36.js','./v36.css','./v35.js','./v35.css','./v34.js','./v34.css','./media.js','./media-config.js','./permissions.js','./auth.js','./sync.js','./sync-core.js','./oscar-activation-runtime.js','./admin.html','./v33.js','./v33.css','./fiscal.js','./v32.js','./v32.css','./shifts.js','./v31.js','./v31.css','./coa.js','./v30.js','./v30.css','./v29.js','./v29.css','./','./index.html','./style.css','./engine.js','./storage.js','./export.js','./app.js','./android.css','./android-shell.js','./android.js','./enhancements.css','./enhancements.js','./business.js','./native.js','./teal.js','./teal.css','./polish.css','./polish.js','./v17.js','./v18.js','./v18.css','./v19.js','./v19.css','./v20.css','./v20.js','./v21.css','./v21.js','./v22.js','./v23.js','./v24.js','./v28-ui.js','./v28-print.js','./v28-xlsx.js','./v28.css','./v27.js','./v27.css','./v26.js','./v26.css','./v25.js','./v25.css','./pricing.js','./v24.css','./v23.css','./v22.css','./native.css','./business.css','./import-core.js','./xlsx.full.min.js','./manifest.webmanifest','./cairo.ttf','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(
 caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())
));
self.addEventListener('activate',e=>e.waitUntil(
 caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('rawan-erp-static-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch',e=>{
 const req=e.request;
 if(req.method!=='GET')return;
 const parsed=new URL(req.url);
 // Remember Telegram photos *after the user has viewed them online*. They are
 // cross-origin opaque image responses, so res.ok alone cannot indicate success.
 if(parsed.origin!==self.location.origin){
  if(req.destination==='image'&&parsed.hostname==='api.telegram.org'&&parsed.pathname.startsWith('/file/bot')){
   e.respondWith((async()=>{const c=await caches.open(MEDIA_CACHE),saved=await c.match(req);if(saved)return saved;
    try{const res=await fetch(req);if(res.ok||res.type==='opaque')await c.put(req,res.clone());return res}catch{return Response.error()}
   })());
  }
  return;
 }
 e.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(req.mode==='navigate'){
   // Prefer a fresh HTML shell, but quickly use local cache when offline.
   const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),1100);
   try{const response=await fetch(req,{cache:'no-store',signal:ctrl.signal});clearTimeout(timeout);if(response.ok)await cache.put(req,response.clone());return response}
   catch{clearTimeout(timeout);return (await cache.match(req))||(new URL(req.url).pathname.endsWith('/admin.html')?undefined:await cache.match('./index.html'))||Response.error()}
  }
  const cached=await cache.match(req);
  if(cached)return cached;
  try{const res=await fetch(req);if(res.ok)await cache.put(req,res.clone());return res}
  catch{return Response.error()}
 })());
});
