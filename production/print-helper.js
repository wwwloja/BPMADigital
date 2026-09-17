(() => {
  function isIOS(){
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  }
  function isStandalone(){
    return window.matchMedia?.('(display-mode: standalone)')?.matches
      || window.navigator.standalone===true;
  }
  function params(){
    return new URLSearchParams(location.search);
  }
  function prepareSafe(fn){
    try{ if(typeof fn==='function') fn(); }catch(err){ console.warn('Preparação da impressão:',err); }
  }
  function nativePrint(){
    try{
      if(typeof window.print==='function'){
        window.print();
        return true;
      }
    }catch(err){ console.warn('window.print:',err); }
    try{
      if(document.execCommand){
        return !!document.execCommand('print');
      }
    }catch(err){ console.warn('execCommand print:',err); }
    return false;
  }
  function showFallback(){
    let box=document.getElementById('bpmaPrintFallback');
    if(box)return;
    box=document.createElement('div');
    box.id='bpmaPrintFallback';
    box.className='no-print';
    box.style.cssText='position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;background:#063f34;color:#fff;padding:12px 14px;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.28);font:600 14px system-ui';
    box.innerHTML='<b>Impressão</b><div style="font-weight:400;margin-top:4px">Se a janela de impressão não abrir, use o menu do navegador: Compartilhar → Imprimir.</div>';
    document.body.appendChild(box);
    setTimeout(()=>box.remove(),7000);
  }
  function installManualPrintBar(){
    const p=params();
    if(p.get('printmode')!=='1' && p.get('print')!=='1') return;
    if(document.getElementById('bpmaManualPrintBar'))return;

    const bar=document.createElement('div');
    bar.id='bpmaManualPrintBar';
    bar.className='no-print';
    bar.style.cssText='position:sticky;top:0;z-index:99998;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;background:#063f34;color:#fff;font:600 14px system-ui;box-shadow:0 2px 10px rgba(0,0,0,.20)';
    bar.innerHTML='<span>Documento pronto para impressão</span><button type="button" id="bpmaManualPrintBtn" style="border:0;border-radius:9px;padding:10px 14px;font-weight:800;background:#fff;color:#063f34">Imprimir agora</button>';
    document.body.prepend(bar);
    bar.querySelector('#bpmaManualPrintBtn').onclick=()=>{
      if(!nativePrint())showFallback();
    };
  }
  function printCurrent(prepare){
    prepareSafe(prepare);

    // No iPhone/iPad instalado como app, abrimos uma página de impressão
    // com um segundo toque explícito, evitando bloqueios do WebKit/PWA.
    if(isIOS() && isStandalone() && params().get('printmode')!=='1'){
      const u=new URL(location.href);
      u.searchParams.delete('print');
      u.searchParams.set('printmode','1');
      const win=window.open(u.toString(),'_blank');
      if(win) return true;
      if(!nativePrint())showFallback();
      return false;
    }

    const ok=nativePrint();
    if(!ok)showFallback();
    return ok;
  }
  function openReportForPrint(url){
    const u=new URL(url,location.href);
    u.searchParams.delete('print');
    u.searchParams.set('printmode','1');
    const win=window.open(u.toString(),'_blank');
    if(!win){
      location.href=u.toString();
      return false;
    }
    return true;
  }

  document.addEventListener('DOMContentLoaded',installManualPrintBar);
  window.BPMA_PRINT={isIOS,isStandalone,printCurrent,openReportForPrint,nativePrint,installManualPrintBar};
})();
