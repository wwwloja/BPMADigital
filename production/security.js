(() => {
  let timer=null;
  let cfg={minutes:30,onTimeout:null,redirect:null};
  const events=['pointerdown','keydown','touchstart','wheel'];
  function reset(){
    clearTimeout(timer);
    timer=setTimeout(timeout,Math.max(1,Number(cfg.minutes)||30)*60*1000);
  }
  async function timeout(){
    try{
      if(typeof cfg.onTimeout==='function'){
        await cfg.onTimeout();
        return;
      }
      await window.BPMA_AUTH?.signOut?.();
    }catch{}
    try{localStorage.removeItem('bpma_local_session_v1')}catch{}
    const dest=cfg.redirect||'index.html?reason=inactivity';
    location.href=dest;
  }
  function activity(){reset()}
  function start(options={}){
    stop();
    cfg={...cfg,...options};
    events.forEach(e=>window.addEventListener(e,activity,{passive:true}));
    window.addEventListener('focus',activity);
    reset();
  }
  function stop(){
    clearTimeout(timer);timer=null;
    events.forEach(e=>window.removeEventListener(e,activity));
    window.removeEventListener('focus',activity);
  }
  window.BPMA_SECURITY={start,stop};
})();
