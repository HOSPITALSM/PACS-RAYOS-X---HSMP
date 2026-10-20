'use strict';
// Solo se almacena la pantalla pública sin conexión y los iconos. Nunca el visor ni Supabase.
const CACHE='pacs-hsmp-public-v1';
const PUBLIC=['offline.html','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PUBLIC.map(p=>new URL(p,self.registration.scope).href)))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('pacs-hsmp-public-')&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url),scope=new URL(self.registration.scope);
 if(req.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 if(req.mode==='navigate'){
  event.respondWith(fetch(req,{cache:'no-store'}).catch(async()=>
   (await caches.open(CACHE)).match(new URL('offline.html',scope).href)));
  return;
 }
 if(url.search||!PUBLIC.some(p=>url.href===new URL(p,scope).href))return;
 event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(req))||fetch(req)));
});
