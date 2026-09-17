(() => {
  const PDF_LIB='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
  let pdfLibPromise=null;
  let currentPdf=null;
  let currentPdfUrl='';
  let currentPdfName='BPMA_Digital.pdf';

  function isIOS(){
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  }
  function isAndroid(){ return /Android/i.test(navigator.userAgent); }
  function isMobile(){
    return isIOS() || isAndroid() || /Mobi/i.test(navigator.userAgent)
      || (navigator.maxTouchPoints>1 && Math.min(screen.width,screen.height)<900);
  }
  function isStandalone(){
    return window.matchMedia?.('(display-mode: standalone)')?.matches
      || window.navigator.standalone===true;
  }
  function params(){ return new URLSearchParams(location.search); }

  function safeName(name){
    return String(name||'BPMA_Digital.pdf')
      .replace(/[\\/:*?"<>|]+/g,'_')
      .replace(/\s+/g,'_')
      .replace(/_+/g,'_')
      .replace(/^_|_$/g,'')
      .replace(/\.pdf$/i,'')+'.pdf';
  }

  function prepareSafe(fn){
    try{ if(typeof fn==='function') fn(); }
    catch(err){ console.warn('Preparação da impressão:',err); }
  }

  function nativePrint(){
    try{
      if(typeof window.print==='function'){
        window.print();
        return true;
      }
    }catch(err){ console.warn('window.print:',err); }
    try{
      if(document.execCommand) return !!document.execCommand('print');
    }catch(err){ console.warn('execCommand print:',err); }
    return false;
  }

  function ensurePdfLib(){
    if(window.html2pdf) return Promise.resolve(window.html2pdf);
    if(pdfLibPromise) return pdfLibPromise;
    pdfLibPromise=new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-bpma-html2pdf]');
      if(existing){
        existing.addEventListener('load',()=>window.html2pdf?resolve(window.html2pdf):reject(new Error('Gerador PDF indisponível.')),{once:true});
        existing.addEventListener('error',()=>reject(new Error('Não foi possível carregar o gerador de PDF.')),{once:true});
        return;
      }
      const s=document.createElement('script');
      s.src=PDF_LIB;
      s.async=true;
      s.dataset.bpmaHtml2pdf='1';
      s.crossOrigin='anonymous';
      s.referrerPolicy='no-referrer';
      s.onload=()=>window.html2pdf?resolve(window.html2pdf):reject(new Error('Gerador PDF indisponível.'));
      s.onerror=()=>reject(new Error('Não foi possível carregar o gerador de PDF.'));
      document.head.appendChild(s);
    });
    return pdfLibPromise;
  }

  function removeModal(){
    document.getElementById('bpmaPrintModal')?.remove();
  }

  function modalBase(title,body){
    removeModal();
    const modal=document.createElement('div');
    modal.id='bpmaPrintModal';
    modal.className='no-print';
    modal.style.cssText='position:fixed;inset:0;z-index:2147483647;background:rgba(5,28,24,.72);display:grid;place-items:center;padding:18px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif';
    modal.innerHTML=`
      <div style="width:min(94vw,440px);background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.35);overflow:hidden">
        <div style="padding:18px 18px 10px">
          <div style="font-size:18px;font-weight:900;color:#075d49">${title}</div>
          <div id="bpmaPrintModalBody" style="margin-top:8px;color:#52605b;font-size:14px;line-height:1.45">${body}</div>
        </div>
        <div id="bpmaPrintModalActions" style="display:grid;gap:8px;padding:12px 18px 18px"></div>
      </div>`;
    document.body.appendChild(modal);
    return modal;
  }

  function button(label,primary=false){
    const b=document.createElement('button');
    b.type='button';
    b.textContent=label;
    b.style.cssText=`width:100%;border:${primary?'0':'1px solid #cfd9d5'};border-radius:11px;padding:12px 14px;font:800 14px system-ui;cursor:pointer;background:${primary?'#08764f':'#fff'};color:${primary?'#fff':'#174d3b'}`;
    return b;
  }

  function showBusy(){
    const m=modalBase('Preparando PDF A4','Aguarde alguns segundos. O BPMA Digital está montando o relatório para impressão no celular.');
    const body=m.querySelector('#bpmaPrintModalBody');
    const spin=document.createElement('div');
    spin.style.cssText='width:34px;height:34px;margin:16px auto 4px;border:4px solid #dbe9e4;border-top-color:#08764f;border-radius:50%;animation:bpmaPdfSpin .8s linear infinite';
    body.appendChild(spin);
    if(!document.getElementById('bpmaPdfSpinStyle')){
      const st=document.createElement('style');
      st.id='bpmaPdfSpinStyle';
      st.textContent='@keyframes bpmaPdfSpin{to{transform:rotate(360deg)}}';
      document.head.appendChild(st);
    }
    return m;
  }

  function revokePdfUrl(){
    if(currentPdfUrl){
      try{URL.revokeObjectURL(currentPdfUrl)}catch{}
      currentPdfUrl='';
    }
  }

  async function sharePdf(){
    if(!currentPdf) return;
    const file=new File([currentPdf],currentPdfName,{type:'application/pdf'});
    try{
      if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
        await navigator.share({
          files:[file],
          title:currentPdfName.replace(/\.pdf$/i,''),
          text:'Relatório BPMA Digital em PDF.'
        });
        return;
      }
    }catch(err){
      if(err?.name==='AbortError') return;
      console.warn('Compartilhamento PDF:',err);
    }
    openPdf();
  }

  function openPdf(){
    if(!currentPdf) return;
    revokePdfUrl();
    currentPdfUrl=URL.createObjectURL(currentPdf);
    const w=window.open(currentPdfUrl,'_blank');
    if(!w){
      const a=document.createElement('a');
      a.href=currentPdfUrl;
      a.target='_blank';
      a.rel='noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }

  function downloadPdf(){
    if(!currentPdf) return;
    revokePdfUrl();
    currentPdfUrl=URL.createObjectURL(currentPdf);
    const a=document.createElement('a');
    a.href=currentPdfUrl;
    a.download=currentPdfName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function showReady(blob,filename){
    currentPdf=blob;
    currentPdfName=safeName(filename);
    const m=modalBase(
      'PDF pronto',
      'No celular, use <b>Compartilhar / Imprimir</b>. No iPhone/iPad, escolha <b>Imprimir</b> no menu de compartilhamento. No Android, escolha <b>Imprimir</b> ou abra o PDF para salvar/imprimir.'
    );
    const actions=m.querySelector('#bpmaPrintModalActions');

    const share=button('Compartilhar / Imprimir',true);
    share.onclick=sharePdf;
    actions.appendChild(share);

    const open=button('Abrir PDF');
    open.onclick=openPdf;
    actions.appendChild(open);

    const down=button('Baixar PDF');
    down.onclick=downloadPdf;
    actions.appendChild(down);

    const close=button('Fechar');
    close.onclick=removeModal;
    actions.appendChild(close);
  }

  function showError(err){
    console.error('PDF móvel:',err);
    const m=modalBase(
      'Não foi possível gerar o PDF',
      'O gerador de PDF não conseguiu concluir esta tentativa. Você ainda pode abrir o compartilhamento do aparelho ou tentar novamente com internet ativa.'
    );
    const actions=m.querySelector('#bpmaPrintModalActions');

    if(navigator.share){
      const share=button('Compartilhar esta página',true);
      share.onclick=async()=>{
        try{await navigator.share({title:document.title,url:location.href})}
        catch(e){if(e?.name!=='AbortError')console.warn(e)}
      };
      actions.appendChild(share);
    }

    const retry=button('Tentar novamente');
    retry.onclick=()=>{removeModal(); nativePrint()};
    actions.appendChild(retry);

    const close=button('Fechar');
    close.onclick=removeModal;
    actions.appendChild(close);
  }

  function collectPrintCss(){
    let css='';
    for(const sheet of Array.from(document.styleSheets)){
      let rules;
      try{ rules=sheet.cssRules; }catch{ continue; }
      if(!rules) continue;
      for(const rule of Array.from(rules)){
        try{
          if(rule.type===CSSRule.MEDIA_RULE && /(^|,|\s)print(\s|,|$)/i.test(rule.conditionText||rule.media?.mediaText||'')){
            for(const inner of Array.from(rule.cssRules||[])) css+=inner.cssText+'\n';
          }else if(rule.type===CSSRule.PAGE_RULE){
            css+=rule.cssText+'\n';
          }
        }catch{}
      }
    }
    return css;
  }

  function syncControls(source,clone){
    const src=source.querySelectorAll('input,select,textarea');
    const dst=clone.querySelectorAll('input,select,textarea');
    src.forEach((el,i)=>{
      const c=dst[i];
      if(!c) return;
      if(el.tagName==='SELECT'){
        c.selectedIndex=el.selectedIndex;
        Array.from(c.options).forEach((o,j)=>o.selected=(j===el.selectedIndex));
      }else if(el.type==='checkbox'||el.type==='radio'){
        c.checked=el.checked;
        if(el.checked)c.setAttribute('checked','');
        else c.removeAttribute('checked');
      }else{
        c.value=el.value;
        c.setAttribute('value',el.value);
        if(el.tagName==='TEXTAREA') c.textContent=el.value;
      }
    });
  }

  function toDataUrl(blob){
    return new Promise((resolve,reject)=>{
      const r=new FileReader();
      r.onload=()=>resolve(r.result);
      r.onerror=reject;
      r.readAsDataURL(blob);
    });
  }

  async function inlineImages(root){
    const imgs=Array.from(root.querySelectorAll('img'));
    await Promise.all(imgs.map(async img=>{
      const src=img.currentSrc||img.src||img.getAttribute('src')||'';
      if(!src || /^data:/i.test(src) || /^blob:/i.test(src)) return;
      try{
        const absolute=new URL(src,location.href).href;
        const res=await fetch(absolute,{cache:'force-cache',credentials:'omit'});
        if(!res.ok) return;
        const data=await toDataUrl(await res.blob());
        img.src=data;
        img.removeAttribute('srcset');
      }catch(err){ console.warn('Imagem no PDF:',src,err); }
    }));
  }

  function autoSelector(){
    if(document.querySelector('#view-bo')) return '#view-bo';
    if(document.querySelector('.page')) return '.page';
    if(document.querySelector('main.wrap')) return 'main.wrap';
    return 'body';
  }

  function autoPrepare(){
    try{
      if(window.BO?.preparePrintRender) window.BO.preparePrintRender();
      if(window.BPMA_CPU_SYNC_PRINT_VALUES) window.BPMA_CPU_SYNC_PRINT_VALUES();
      if(window.BPMA_CPU_buildPrintMirrors) window.BPMA_CPU_buildPrintMirrors();
    }catch(err){console.warn('Preparação automática PDF:',err)}
  }

  async function generateMobilePdf(opts={}){
    showBusy();
    try{
      prepareSafe(opts.prepare);
      autoPrepare();
      try{window.dispatchEvent(new Event('beforeprint'))}catch{}

      await ensurePdfLib();

      const source=document.querySelector(opts.selector||autoSelector())||document.body;
      const clone=source.cloneNode(true);
      syncControls(source,clone);

      const host=document.createElement('div');
      host.id='bpmaPdfStaging';
      host.style.cssText='position:fixed;left:-12000px;top:0;width:194mm;max-width:none;background:#fff;color:#000;z-index:-10000;pointer-events:none;overflow:visible';
      clone.style.width='194mm';
      clone.style.maxWidth='none';
      clone.style.margin='0';
      host.appendChild(clone);
      document.body.appendChild(host);

      const style=document.createElement('style');
      style.id='bpmaPdfPrintRules';
      style.textContent=collectPrintCss()+`
        #bpmaPdfStaging{font-family:"Times New Roman",Times,serif!important}
        #bpmaPdfStaging .no-print,
        #bpmaPdfStaging .toolbar,
        #bpmaPdfStaging .bpma-system-toolbar,
        #bpmaPdfStaging .report-final-actions,
        #bpmaPdfStaging .print-actions,
        #bpmaPdfStaging .row-actions,
        #bpmaPdfStaging button{display:none!important}
        #bpmaPdfStaging,#bpmaPdfStaging *{
          -webkit-print-color-adjust:exact!important;
          print-color-adjust:exact!important;
        }
        #bpmaPdfStaging textarea{overflow:visible!important;resize:none!important}
        #bpmaPdfStaging .page,
        #bpmaPdfStaging .wrap,
        #bpmaPdfStaging .main,
        #bpmaPdfStaging .sheet{max-width:none!important;box-shadow:none!important}
      `;
      document.head.appendChild(style);

      await inlineImages(clone);
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

      const options={
        margin:[7,7,7,7],
        filename:safeName(opts.filename||document.title||'BPMA_Digital.pdf'),
        image:{type:'jpeg',quality:0.96},
        html2canvas:{
          scale:1.55,
          useCORS:true,
          allowTaint:false,
          logging:false,
          backgroundColor:'#ffffff',
          windowWidth:1200,
          scrollX:0,
          scrollY:0
        },
        jsPDF:{unit:'mm',format:'a4',orientation:'portrait',compress:true},
        pagebreak:{mode:['css','legacy'],avoid:['tr','.card','.sig-card','.photo','.photo-card']}
      };

      const worker=window.html2pdf().set(options).from(clone).toPdf();
      const blob=await worker.outputPdf('blob');

      host.remove();
      style.remove();
      try{window.dispatchEvent(new Event('afterprint'))}catch{}

      if(!(blob instanceof Blob) || blob.size<1000) throw new Error('PDF vazio ou inválido.');
      showReady(blob,options.filename);
      return true;
    }catch(err){
      document.getElementById('bpmaPdfStaging')?.remove();
      document.getElementById('bpmaPdfPrintRules')?.remove();
      try{window.dispatchEvent(new Event('afterprint'))}catch{}
      showError(err);
      return false;
    }
  }

  function normalizeOptions(input){
    if(typeof input==='function') return {prepare:input};
    if(input && typeof input==='object') return {...input};
    return {};
  }

  function printCurrent(input){
    const opts=normalizeOptions(input);
    if(isMobile()){
      generateMobilePdf(opts);
      return true;
    }
    prepareSafe(opts.prepare);
    return nativePrint();
  }

  function showFallback(){
    const m=modalBase(
      'Impressão',
      'No celular, use o PDF móvel. No navegador, você também pode usar o menu do aparelho para compartilhar e imprimir.'
    );
    const actions=m.querySelector('#bpmaPrintModalActions');
    const pdf=button('Gerar PDF móvel',true);
    pdf.onclick=()=>generateMobilePdf({});
    actions.appendChild(pdf);
    const close=button('Fechar');
    close.onclick=removeModal;
    actions.appendChild(close);
  }

  function installManualPrintBar(){
    const p=params();
    if(p.get('printmode')!=='1' && p.get('print')!=='1') return;
    if(document.getElementById('bpmaManualPrintBar'))return;

    const bar=document.createElement('div');
    bar.id='bpmaManualPrintBar';
    bar.className='no-print';
    bar.style.cssText='position:sticky;top:0;z-index:99998;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;background:#063f34;color:#fff;font:600 14px system-ui;box-shadow:0 2px 10px rgba(0,0,0,.20)';
    bar.innerHTML='<span>Documento pronto</span><button type="button" id="bpmaManualPrintBtn" style="border:0;border-radius:9px;padding:10px 14px;font-weight:800;background:#fff;color:#063f34">PDF / Imprimir</button>';
    document.body.prepend(bar);
    bar.querySelector('#bpmaManualPrintBtn').onclick=()=>{
      printCurrent({selector:autoSelector()});
    };
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

  window.addEventListener('beforeunload',revokePdfUrl);
  document.addEventListener('DOMContentLoaded',installManualPrintBar);

  window.BPMA_PRINT={
    isIOS,isAndroid,isMobile,isStandalone,
    printCurrent,nativePrint,generateMobilePdf,
    openReportForPrint,installManualPrintBar,showFallback
  };
})();