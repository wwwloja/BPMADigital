const CACHE='bpma-digital-5.1-auth-audit';
const SHELL=[
  '/',
  '/index.html',
  '/home-app.css',
  '/home-app.js?v=5.1',
  '/app-shell.css',
  '/bo-fixes.css',
  '/bo-pdf.js?v=5.1',
  '/vendor/html2pdf.bundle.min.js?v=5.1',
  '/supabase-config.js?v=5.1',
  '/supabase-auth.js?v=5.1',
  '/supabase-users.js?v=5.1',
  '/cpu-details.js?v=5.1',
  '/cpu-structure.js?v=5.1',
  '/cpu-structure.css',
  '/stats37.js?v=5.1',
  '/upgrade50.js?v=5.1',
  '/upgrade50.css',
  '/local-report-store.js?v=5.1',
  '/supabase-bo.js?v=5.1',
  '/supabase-rfa.js?v=5.1',
  '/rfa-annex.js?v=5.1',
  '/storage-image-opt.js?v=5.1',
  '/supabase-cpu.js?v=5.1',
  '/supabase-system.js?v=5.1',
  '/security.js?v=5.1',
  '/pwa.js?v=5.1',
  '/print-helper.js?v=5.1',
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
