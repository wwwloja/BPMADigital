(() => {
  const PDF_LIB='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
  const A4_W_MM=210;
  const A4_H_MM=297;
  const MARGIN_MM=7;
  const CONTENT_W_MM=A4_W_MM-(MARGIN_MM*2); // 196 mm
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
        if(window.html2pdf){ resolve(window.html2pdf); return; }
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
    const m=modalBase(
      'Preparando PDF A4',
      'Montando o documento em <b>A4 210 × 297 mm</b>, com margens de 7 mm.'
    );
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
          text:'Relatório BPMA Digital em PDF A4.'
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
      'PDF A4 pronto',
      'Documento gerado em <b>210 × 297 mm</b>. No celular, toque em <b>Compartilhar / Imprimir</b>.'
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
      'O documento não foi concluído. Verifique a conexão e tente novamente.'
    );
    const actions=m.querySelector('#bpmaPrintModalActions');

    const retry=button('Tentar impressão do navegador',true);
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
    if(document.querySelector('#view-bo .print-area')) return '#view-bo .print-area';
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

  function makeRenderRoot(source,clone,opts){
    if(!opts.wrapperId) return clone;
    const wrapper=document.createElement('div');
    wrapper.id=opts.wrapperId;
    if(opts.wrapperClass) wrapper.className=opts.wrapperClass;
    wrapper.style.cssText='display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;min-height:0!important;margin:0!important;padding:0!important;background:#fff!important;box-sizing:border-box!important';
    wrapper.appendChild(clone);
    return wrapper;
  }

  function cleanupStaging(){
    document.getElementById('bpmaPdfStaging')?.remove();
    document.getElementById('bpmaPdfPrintRules')?.remove();
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

      clone.style.setProperty('width','100%','important');
      clone.style.setProperty('max-width','100%','important');
      clone.style.setProperty('min-width','0','important');
      clone.style.setProperty('min-height','0','important');
      clone.style.setProperty('height','auto','important');
      clone.style.setProperty('margin','0','important');
      clone.style.setProperty('padding','0','important');
      clone.style.setProperty('box-sizing','border-box','important');
      clone.style.setProperty('overflow','visible','important');
      clone.style.setProperty('transform','none','important');

      const renderRoot=makeRenderRoot(source,clone,opts);

      const host=document.createElement('div');
      host.id='bpmaPdfStaging';
      /*
       * Importante:
       * o staging agora começa em 0,0 atrás do aplicativo.
       * Isso evita que coordenadas externas à folha entrem na captura.
       */
      host.style.cssText=`
        position:fixed!important;
        left:0!important;
        top:0!important;
        width:${A4_W_MM}mm!important;
        max-width:${A4_W_MM}mm!important;
        min-width:${A4_W_MM}mm!important;
        height:auto!important;
        min-height:0!important;
        margin:0!important;
        padding-left:${MARGIN_MM}mm!important;
        padding-right:${MARGIN_MM}mm!important;
        padding-top:0!important;
        padding-bottom:0!important;
        overflow:visible!important;
        background:#fff!important;
        color:#000!important;
        z-index:-2147483000!important;
        pointer-events:none!important;
        box-sizing:border-box!important;
      `;
      host.appendChild(renderRoot);
      document.body.appendChild(host);

      const style=document.createElement('style');
      style.id='bpmaPdfPrintRules';
      style.textContent=collectPrintCss()+`
        #bpmaPdfStaging{
          font-family:Arial,Helvetica,sans-serif!important;
        }
        #bpmaPdfStaging{
          box-sizing:border-box!important;
          width:${A4_W_MM}mm!important;
          max-width:${A4_W_MM}mm!important;
          min-width:${A4_W_MM}mm!important;
          height:auto!important;
          min-height:0!important;
          margin:0!important;
          padding-left:${MARGIN_MM}mm!important;
          padding-right:${MARGIN_MM}mm!important;
          padding-top:0!important;
          padding-bottom:0!important;
          transform:none!important;
          float:none!important;
          background:#fff!important;
          overflow:visible!important;
        }
        #bpmaPdfStaging > *{
          box-sizing:border-box!important;
          width:100%!important;
          max-width:100%!important;
          min-width:0!important;
          height:auto!important;
          min-height:0!important;
          margin:0!important;
          padding:0!important;
          float:none!important;
        }
        #bpmaPdfStaging #view-bo{
          box-sizing:border-box!important;
          width:100%!important;
          max-width:100%!important;
          min-width:0!important;
          height:auto!important;
          min-height:0!important;
          margin:0!important;
          padding:0!important;
          float:none!important;
        }
        #bpmaPdfStaging .no-print,
        #bpmaPdfStaging .toolbar,
        #bpmaPdfStaging .bpma-system-toolbar,
        #bpmaPdfStaging .report-final-actions,
        #bpmaPdfStaging .print-actions,
        #bpmaPdfStaging .row-actions,
        #bpmaPdfStaging button{
          display:none!important
        }
        #bpmaPdfStaging,
        #bpmaPdfStaging *{
          -webkit-print-color-adjust:exact!important;
          print-color-adjust:exact!important;
        }
        #bpmaPdfStaging textarea{
          overflow:visible!important;
          resize:none!important
        }
        #bpmaPdfStaging .annex-print-pages{display:block!important}
        #bpmaPdfStaging .annex-print-sheet{
          display:flex!important;
          flex-direction:column!important;
          width:100%!important;
          height:283mm!important;
          min-height:283mm!important;
          max-height:283mm!important;
          margin:0!important;
          padding:0!important;
          overflow:hidden!important;
          page-break-after:always!important;
          break-after:page!important;
          page-break-inside:avoid!important;
          break-inside:avoid!important;
          background:#fff!important;
        }
        #bpmaPdfStaging .annex-print-sheet .topbar{flex:0 0 auto!important}
        #bpmaPdfStaging .annex-document-body{flex:1 1 auto!important;min-height:0!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important}
        #bpmaPdfStaging .annex-document-body img{max-width:100%!important;max-height:100%!important;width:auto!important;height:auto!important;object-fit:contain!important;margin:auto!important}
        #bpmaPdfStaging .page,
        #bpmaPdfStaging .wrap,
        #bpmaPdfStaging .main,
        #bpmaPdfStaging .sheet,
        #bpmaPdfStaging .app{
          width:100%!important;
          max-width:100%!important;
          min-width:0!important;
          min-height:0!important;
          height:auto!important;
          margin:0!important;
          box-shadow:none!important;
          transform:none!important;
        }
      `;
      document.head.appendChild(style);

      await inlineImages(renderRoot);
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

      const hostRect=host.getBoundingClientRect();
      const naturalRect=renderRoot.getBoundingClientRect();
      const cssWidth=Math.max(1,Math.ceil(hostRect.width));
      let cssHeight=Math.max(1,Math.ceil(naturalRect.height));
      let fitScale=1;

      // BO vazio/padrão costuma exceder uma única folha por poucos milímetros.
      // Se a ultrapassagem for pequena, reduzimos no máximo 7% e mantemos o
      // conteúdo centralizado. Relatórios realmente longos continuam multipágina.
      if(opts.fitSinglePage && naturalRect.width>0 && naturalRect.height>0){
        const naturalHeightMm=(naturalRect.height/naturalRect.width)*CONTENT_W_MM;
        const usableHeightMm=A4_H_MM-(MARGIN_MM*2);
        const candidate=usableHeightMm/naturalHeightMm;
        if(candidate<1 && candidate>=0.93){
          fitScale=candidate;
          renderRoot.style.setProperty('transform',`scale(${fitScale})`,'important');
          renderRoot.style.setProperty('transform-origin','top center','important');
          await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
          const scaledRect=renderRoot.getBoundingClientRect();
          cssHeight=Math.max(1,Math.ceil(scaledRect.height));
          host.style.setProperty('height',`${cssHeight}px`,'important');
          host.style.setProperty('overflow','hidden','important');
        }
      }

      // Proteção: a área A4 útil deve ficar próxima de 196 mm (~741 px em 96 dpi).
      // Nunca mais força viewport de 1200 px como largura da captura.
      const options={
        margin:[MARGIN_MM,0,MARGIN_MM,0],
        filename:safeName(opts.filename||document.title||'BPMA_Digital.pdf'),
        image:{type:'jpeg',quality:0.97},
        html2canvas:{
          scale:2,
          useCORS:true,
          allowTaint:false,
          logging:false,
          backgroundColor:'#ffffff',
          width:cssWidth,
          height:cssHeight,
          windowWidth:Math.max(900,cssWidth),
          windowHeight:Math.max(1000,Math.min(cssHeight+40,8000)),
          scrollX:0,
          scrollY:0
        },
        jsPDF:{
          unit:'mm',
          format:'a4',
          orientation:'portrait',
          compress:true
        },
        pagebreak:{mode:['css']}
      
      };

      console.info('[BPMA PDF A4]',{
        paper:`${A4_W_MM}x${A4_H_MM}mm`,
        margin:`${MARGIN_MM}mm`,
        contentWidthMm:CONTENT_W_MM,
        leftRightPaddingMm:MARGIN_MM,
        fitScale,
        captureWidthPx:cssWidth,
        captureHeightPx:cssHeight
      });

      const worker=window.html2pdf()
        .set(options)
        .from(host)
        .toPdf();

      const blob=await worker.outputPdf('blob');

      cleanupStaging();
      try{window.dispatchEvent(new Event('afterprint'))}catch{}

      if(!(blob instanceof Blob) || blob.size<1000){
        throw new Error('PDF vazio ou inválido.');
      }

      showReady(blob,options.filename);
      return true;
    }catch(err){
      cleanupStaging();
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
      'No celular, gere o PDF A4 e use o compartilhamento do aparelho.'
    );
    const actions=m.querySelector('#bpmaPrintModalActions');

    const pdf=button('Gerar PDF A4',true);
    pdf.onclick=()=>generateMobilePdf({});
    actions.appendChild(pdf);

    const close=button('Fechar');
    close.onclick=removeModal;
    actions.appendChild(close);
  }

  function installManualPrintBar(){
    const p=params();
    if(p.get('printmode')!=='1' && p.get('print')!=='1') return;
    if(document.getElementById('bpmaManualPrintBar')) return;

    const bar=document.createElement('div');
    bar.id='bpmaManualPrintBar';
    bar.className='no-print';
    bar.style.cssText='position:sticky;top:0;z-index:99998;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;background:#063f34;color:#fff;font:600 14px system-ui;box-shadow:0 2px 10px rgba(0,0,0,.20)';
    bar.innerHTML='<span>Documento pronto</span><button type="button" id="bpmaManualPrintBtn" style="border:0;border-radius:9px;padding:10px 14px;font-weight:800;background:#fff;color:#063f34">PDF A4 / Imprimir</button>';
    document.body.prepend(bar);

    bar.querySelector('#bpmaManualPrintBtn').onclick=()=>{
      const isBo=!!document.querySelector('#view-bo .print-area');
      printCurrent({
        selector:autoSelector(),
        wrapperId:isBo?'view-bo':null,
        wrapperClass:isBo?'view active':null
      });
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