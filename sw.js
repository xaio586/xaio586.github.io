const CACHE_VERSION='ielts-pages-v30';
const SHELL=['/','/styles.css?v=20260922-01','/app.js?v=20260922-01','/static-api.js?v=20260922-01','/site-data.json?v=20260922-01','/webgl-background.js?v=20260917-01','/vendor/gsap-3.13.0.min.js','/favicon.svg','/manifest.webmanifest','/icons/apple-touch-icon.png','/icons/icon-192.png','/icons/icon-512.png','/assets/audio/kokoro/unlock.mp3'];

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

async function rangedMedia(request){
  const range=request.headers.get('range');
  const cache=await caches.open(CACHE_VERSION);
  const cached=await cache.match(request.url);
  if(!cached)return fetch(request);
  const bytes=await cached.arrayBuffer();
  const match=/bytes=(\d*)-(\d*)/.exec(range||'');
  if(!match)return cached;
  const suffix=!match[1]&&Boolean(match[2]);
  const start=suffix?Math.max(0,bytes.byteLength-Number(match[2])):(match[1]?Number(match[1]):0);
  const requestedEnd=suffix?bytes.byteLength-1:(match[2]?Number(match[2]):bytes.byteLength-1);
  const end=Math.min(requestedEnd,bytes.byteLength-1);
  if(start>end)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes.byteLength}`}});
  return new Response(bytes.slice(start,end+1),{status:206,headers:{'Content-Type':cached.headers.get('Content-Type')||'audio/mpeg','Content-Length':String(end-start+1),'Content-Range':`bytes ${start}-${end}/${bytes.byteLength}`,'Accept-Ranges':'bytes'}});
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){event.respondWith(networkFirst(request));return}
  if(url.pathname.startsWith('/api/')){event.respondWith(networkFirst(request));return}
  if(url.pathname==='/site-data.json'||url.pathname==='/static-api.js'){event.respondWith(networkFirst(request));return}
  if(request.headers.has('range')){event.respondWith(rangedMedia(request));return}
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
