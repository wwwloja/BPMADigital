const CACHE='bpma-digital-3.8.0';
const SHELL=[
  '/',
  '/index.html',
  '/supabase-config.js',
  '/supabase-auth.js',
  '/supabase-users.js',
  '/supabase-bo.js',
  '/supabase-rfa.js',
  '/supabase-cpu.js',
  '/supabase-system.js',
  '/security.js',
  '/pwa.js',
  '/manifest.webmanifest',
  '/assets/bpma.jpg',
  '/assets/pwa-192.png',
  '/assets/pwa-512.png',
  '/relatorios/bo.html',
  '/relatorios/rfa.html',
  '/relatorios/cpu.html'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  const url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin)return;
  if(req.mode==='navigate'){
    event.respondWith(
      fetch(req).then(res=>res).catch(()=>caches.match('/index.html'))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then(cached=>cached||fetch(req).then(res=>{
      const copy=res.clone();
      caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});
      return res;
    }))
  );
});
