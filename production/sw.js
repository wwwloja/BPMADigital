const CACHE='bpma-digital-3.9.12-testemunha-bo';
const SHELL=[
  '/',
  '/index.html',
  '/home-app.css',
  '/home-app.js',
  '/app-shell.css',
  '/bo-fixes.css',
  '/bo-pdf.js',
  '/vendor/html2pdf.bundle.min.js',
  '/supabase-config.js',
  '/supabase-auth.js',
  '/supabase-users.js',
  '/local-report-store.js',
  '/supabase-bo.js',
  '/supabase-rfa.js',
  '/rfa-annex.js',
  '/supabase-cpu.js',
  '/supabase-system.js',
  '/security.js',
  '/pwa.js',
  '/print-helper.js',
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
