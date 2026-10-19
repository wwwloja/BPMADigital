const CACHE='bpma-digital-5.1.3-outline-users';
const SHELL=[
  '/',
  '/index.html',
  '/home-app.css',
  '/icons-outline.js?v=5.1.3',
  '/icons-outline.css?v=5.1.3',
  '/home-app.js?v=5.1.3',
  '/app-shell.css',
  '/bo-fixes.css',
  '/bo-pdf.js?v=5.1.3',
  '/vendor/html2pdf.bundle.min.js?v=5.1.3',
  '/supabase-config.js?v=5.1.3',
  '/supabase-auth.js?v=5.1.3',
  '/supabase-users.js?v=5.1.3',
  '/cpu-details.js?v=5.1.3',
  '/cpu-structure.js?v=5.1.3',
  '/cpu-structure.css',
  '/stats37.js?v=5.1.3',
  '/upgrade50.js?v=5.1.3',
  '/upgrade50.css',
  '/local-report-store.js?v=5.1.3',
  '/supabase-bo.js?v=5.1.3',
  '/supabase-rfa.js?v=5.1.3',
  '/rfa-annex.js?v=5.1.3',
  '/storage-image-opt.js?v=5.1.3',
  '/supabase-cpu.js?v=5.1.3',
  '/supabase-system.js?v=5.1.3',
  '/security.js?v=5.1.3',
  '/pwa.js?v=5.1.3',
  '/print-helper.js?v=5.1.3',
  '/manifest.webmanifest',
  '/assets/bpma.jpg',
  '/assets/pmpb.jpg',
  '/assets/pwa-192.png',
  '/assets/pwa-512.png',
  '/relatorios/bo.html',
  '/relatorios/rfa.html',
  '/relatorios/cpu.html'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(c=>c.addAll(SHELL))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

async function networkFirst(req){
  try{
    const res=await fetch(req,{cache:'no-store'});
    if(res && res.ok){
      const copy=res.clone();
      caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});
    }
    return res;
  }catch{
    return (await caches.match(req)) || (req.mode==='navigate' ? await caches.match('/index.html') : Response.error());
  }
}

async function cacheFirst(req){
  const cached=await caches.match(req);
  if(cached)return cached;
  const res=await fetch(req);
  if(res && res.ok){
    const copy=res.clone();
    caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});
  }
  return res;
}

self.addEventListener('fetch',event=>{
  const req=event.request;
  const url=new URL(req.url);
  if(req.method!=='GET' || url.origin!==self.location.origin)return;

  const path=url.pathname.toLowerCase();
  const isCode=req.mode==='navigate'
    || path.endsWith('.html')
    || path.endsWith('.js')
    || path.endsWith('.json')
    || path.endsWith('.webmanifest');

  event.respondWith(isCode ? networkFirst(req) : cacheFirst(req));
});
