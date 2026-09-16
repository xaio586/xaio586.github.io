const CACHE_VERSION='ielts-pages-v4';
const SHELL=['/','/styles.css?v=20260916-20','/app.js?v=20260916-11','/webgl-background.js','/vendor/gsap-3.13.0.min.js','/favicon.svg','/manifest.webmanifest','/static-api.js','/site-data.json','/icons/apple-touch-icon.png','/icons/icon-192.png','/icons/icon-512.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_VERSION).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_VERSION).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

async function networkFirst(request){
  const cache=await caches.open(CACHE_VERSION);
  try{const response=await fetch(request);if(response.ok)cache.put(request,response.clone());return response}catch(error){const cached=await cache.match(request);if(cached)return cached;throw error}
}

async function cacheFirst(request){
  const cache=await caches.open(CACHE_VERSION);
  const cached=await cache.match(request);
  if(cached)return cached;
  const response=await fetch(request);
  if(response.ok)cache.put(request,response.clone());
  return response;
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){event.respondWith(networkFirst(request));return}
  if(url.pathname.startsWith('/api/')){event.respondWith(networkFirst(request));return}
  event.respondWith(cacheFirst(request));
});

self.addEventListener('message',event=>{
  if(event.data?.type!=='CACHE_OFFLINE_DATA')return;
  const urls=Array.isArray(event.data.urls)?event.data.urls:[];
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_VERSION);
    let completed=0;
    for(const url of urls){
      try{const response=await fetch(url,{cache:'no-store'});if(response.ok)await cache.put(url,response.clone())}catch(_error){}
      completed+=1;
      event.source?.postMessage({type:'OFFLINE_PROGRESS',completed,total:urls.length});
    }
    event.source?.postMessage({type:'OFFLINE_READY',completed,total:urls.length});
  })());
});
