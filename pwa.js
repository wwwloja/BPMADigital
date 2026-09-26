(() => {
  let deferred=null;
  if('serviceWorker' in navigator && location.protocol!=='file:'){
    window.addEventListener('load',async()=>{
      try{
        // Remove registro legado criado por versões antigas dos relatórios.
        const regs=await navigator.serviceWorker.getRegistrations();
        for(const reg of regs){
          const script=reg.active?.scriptURL||reg.waiting?.scriptURL||reg.installing?.scriptURL||'';
          if(script.endsWith('/relatorios/service-worker.js')){
            await reg.unregister();
          }
        }
        const reg=await navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'});
        reg.update().catch(()=>{});
      }catch(err){
        console.warn('Service Worker:',err);
      }
    });
  }
  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();
    deferred=e;
  });
  async function install(){
    if(!deferred)return false;
    deferred.prompt();
    try{await deferred.userChoice}catch{}
    deferred=null;
    return true;
  }
  window.BPMA_PWA={install};
})();
