(() => {
  let deferred=null;
  if('serviceWorker' in navigator && location.protocol!=='file:'){
    window.addEventListener('load',()=>{
      navigator.serviceWorker.register('/sw.js').catch(err=>console.warn('Service Worker:',err));
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
