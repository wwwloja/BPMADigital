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

  let transientNoticeObserver=null;
  let transientNoticeTimer=null;

  function isLegacyFinalizeNotice(el){
    if(!el || el.id==='bpmaPrintModal' || el.closest?.('#bpmaPrintModal')) return false;
    const txt=String(el.textContent||'').replace(/\s+/g,' ').trim();
    if(!txt || txt.length>700) return false;
    return /relat[oó]rio\s+finalizado\s+com\s+sucesso/i.test(txt)
      || /pdf\s+ser[aá]\s+preparad[oa]\s+agora/i.test(txt);
  }

  function removeLegacyFinalizeNotice(el){
    if(!isLegacyFinalizeNotice(el)) return false;
    const container=el.closest?.('[role="dialog"],dialog,.modal,.modal-overlay,.overlay,.popup,.toast,.snackbar,.notification,.message,.alert') || el;
    if(container && container!==document.body && container.id!=='bpmaPrintModal'){
      try{container.remove();return true}catch{}
    }
    try{el.remove();return true}catch{}
    return false;
  }

  function dismissTransientMessages(keepWatching=true){
    // Remove avisos antigos de finalização que ainda podem ser disparados por scripts
    // legados/cache. O modal do PDF deve ser a única confirmação visual.
    document.querySelectorAll('.toast.show,.snackbar.show,[data-bpma-toast].show').forEach(el=>{
      if(el.closest?.('#bpmaPrintModal')) return;
      el.classList.remove('show');
    });
    document.querySelectorAll('div,section,aside,dialog,[role="dialog"],[role="alert"],[role="status"]').forEach(removeLegacyFinalizeNotice);

    if(!keepWatching) return;
    try{transientNoticeObserver?.disconnect?.()}catch{}
    clearTimeout(transientNoticeTimer);
    transientNoticeObserver=new MutationObserver(mutations=>{
      for(const m of mutations){
        for(const n of m.addedNodes||[]){
          if(!(n instanceof Element)) continue;
          removeLegacyFinalizeNotice(n);
          n.querySelectorAll?.('div,section,aside,dialog,[role="dialog"],[role="alert"],[role="status"]').forEach(removeLegacyFinalizeNotice);
        }
      }
    });
    transientNoticeObserver.observe(document.body,{childList:true,subtree:true});
    transientNoticeTimer=setTimeout(()=>{
      try{transientNoticeObserver?.disconnect?.()}catch{}
      transientNoticeObserver=null;
    },6000);
  }

  function modalBase(title,body){
    removeModal();
    dismissTransientMessages();
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
    dismissTransientMessages(true);
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

  function sanitizeCanvasColors(root){
    // html2canvas 1.x não entende oklab()/oklch()/lab() retornados por Safari/iOS moderno.
    // O PDF do CPU usa uma paleta fixa, então substituímos qualquer função CSS Color 4
    // por RGB seguro antes da rasterização.
    const bad=/\b(?:oklab|oklch|lab|lch|color)\s*\(/i;
    const props=['color','backgroundColor','borderTopColor','borderRightColor','borderBottomColor','borderLeftColor','outlineColor','textDecorationColor','caretColor'];
    const all=[root,...Array.from(root.querySelectorAll('*'))];
    for(const el of all){
      let cs; try{cs=(el.ownerDocument?.defaultView||window).getComputedStyle(el)}catch{continue}
      for(const p of props){
        const v=cs?.[p];
        if(v && bad.test(v)){
          const fallback=(p==='backgroundColor')?'rgb(255, 255, 255)':(p==='color'||p==='caretColor'?'rgb(17, 17, 17)':'rgb(207, 216, 212)');
          try{el.style.setProperty(p.replace(/[A-Z]/g,m=>'-'+m.toLowerCase()),fallback,'important')}catch{}
        }
      }
      for(const p of ['backgroundImage','boxShadow','textShadow']){
        const v=cs?.[p];
        if(v && bad.test(v)){ try{el.style.setProperty(p.replace(/[A-Z]/g,m=>'-'+m.toLowerCase()),'none','important')}catch{} }
      }
    }
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
    if(window.BPMA_BO_PDF && (opts.selector||autoSelector())==='#view-bo .print-area') return generateBoPdf(opts);
    if((opts.selector||autoSelector())==='main.wrap') return generateCpuDynamicPdf(opts);
    if(!opts.silent) showBusy();
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
        #bpmaPdfStaging #finalAnnexPrintPages .annex-print-sheet:last-child{
          page-break-after:auto!important;
          break-after:auto!important;
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

      if(!opts.silent) showReady(blob,options.filename);
      return opts.returnBlob ? blob : true;
    }catch(err){
      cleanupStaging();
      try{window.dispatchEvent(new Event('afterprint'))}catch{}
      if(opts.returnBlob) throw err;
      if(!opts.silent) showError(err);
      return false;
    }
  }


  // 3.9.2 — Gerador específico do RFA no celular.
  // Em vez de transformar o RFA inteiro em um canvas gigante (que pode ficar
  // em branco no Safari/iOS), renderiza cada bloco separadamente e monta as
  // páginas A4 diretamente no jsPDF. Os anexos entram primeiro.
  function rfaMainChildren(){
    const source=document.querySelector('.page');
    if(!source)return [];
    try{ window.BPMA_RFA_ANNEX?.rebuildPrintPages?.(); window.BPMA_RFA_FINAL_ANNEX?.rebuildPrintPages?.(); }catch{}
    const clone=source.cloneNode(true);
    syncControls(source,clone);
    clone.querySelector('#annexPrintPages')?.remove();
    clone.querySelector('#annexManager')?.remove();
    clone.querySelector('#finalAnnexPrintPages')?.remove();
    clone.querySelector('#finalAnnexManager')?.remove();
    clone.querySelectorAll('.no-print,.print-actions,#printRelatorioCompleto,button,[role="button"],script').forEach(el=>el.remove());

    // Textareas em canvas/Safari podem mostrar apenas a parte visível.
    // Convertemos o conteúdo para um bloco de texto antes da rasterização.
    clone.querySelectorAll('textarea').forEach(el=>{
      const d=document.createElement('div');
      d.className=(el.className||'')+' bpma-rfa-textarea-print';
      d.textContent=el.value||el.textContent||'';
      d.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;border:1px solid #999;padding:2px 3px;min-height:18px;background:#fff;color:#000;line-height:1.15;';
      el.replaceWith(d);
    });
    clone.querySelectorAll('select').forEach(el=>{
      const d=document.createElement('div');
      d.className=el.className||'';
      d.textContent=el.options?.[el.selectedIndex]?.textContent||'';
      d.style.cssText='border:1px solid #999;padding:2px 3px;min-height:18px;background:#fff;color:#000;line-height:1.15;';
      el.replaceWith(d);
    });
    return Array.from(clone.children).filter(el=>!el.matches('#annexPrintPages,#annexManager,#finalAnnexPrintPages,#finalAnnexManager,.no-print,.print-actions'));
  }

  async function canvasForRfaFragment(element,{annex=false}={}){
    const host=document.createElement('div');
    host.className='bpma-rfa-fragment-host';
    host.style.cssText=`position:fixed!important;left:0!important;top:0!important;width:${CONTENT_W_MM}mm!important;max-width:${CONTENT_W_MM}mm!important;min-width:${CONTENT_W_MM}mm!important;height:auto!important;margin:0!important;padding:0!important;background:#fff!important;color:#000!important;z-index:-2147483000!important;pointer-events:none!important;overflow:visible!important;box-sizing:border-box!important;`;
    const wrap=document.createElement('div');
    wrap.className='page';
    wrap.style.cssText=`width:${CONTENT_W_MM}mm!important;max-width:${CONTENT_W_MM}mm!important;min-width:${CONTENT_W_MM}mm!important;margin:0!important;padding:0!important;background:#fff!important;box-sizing:border-box!important;`;
    const node=element.cloneNode(true);
    node.querySelectorAll?.('.no-print,.print-actions,#printRelatorioCompleto,button,[role="button"]').forEach(el=>el.remove());
    if(annex){
      node.style.setProperty('display','flex','important');
      node.style.setProperty('width','100%','important');
      node.style.setProperty('height',`${A4_H_MM-(MARGIN_MM*2)}mm`,'important');
      node.style.setProperty('min-height',`${A4_H_MM-(MARGIN_MM*2)}mm`,'important');
      node.style.setProperty('max-height',`${A4_H_MM-(MARGIN_MM*2)}mm`,'important');
      node.style.setProperty('margin','0','important');
      node.style.setProperty('page-break-after','auto','important');
      node.style.setProperty('break-after','auto','important');
    }
    wrap.appendChild(node);
    host.appendChild(wrap);
    document.body.appendChild(host);

    const st=document.createElement('style');
    st.className='bpma-rfa-fragment-style';
    st.textContent=collectPrintCss()+`
      .bpma-rfa-fragment-host,.bpma-rfa-fragment-host *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;box-sizing:border-box!important}
      .bpma-rfa-fragment-host .page{width:${CONTENT_W_MM}mm!important;max-width:${CONTENT_W_MM}mm!important;min-width:${CONTENT_W_MM}mm!important;margin:0!important;padding:0!important;transform:none!important}
      .bpma-rfa-fragment-host .no-print,.bpma-rfa-fragment-host button{display:none!important}
      .bpma-rfa-fragment-host .annex-print-sheet{display:flex!important;flex-direction:column!important;width:100%!important;height:${A4_H_MM-(MARGIN_MM*2)}mm!important;min-height:${A4_H_MM-(MARGIN_MM*2)}mm!important;max-height:${A4_H_MM-(MARGIN_MM*2)}mm!important;margin:0!important;padding:0!important;overflow:hidden!important;background:#fff!important}
      .bpma-rfa-fragment-host .annex-print-sheet .topbar{flex:0 0 auto!important}
      .bpma-rfa-fragment-host .annex-document-body{flex:1 1 auto!important;min-height:0!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important}
      .bpma-rfa-fragment-host .annex-document-body img{max-width:100%!important;max-height:100%!important;width:auto!important;height:auto!important;object-fit:contain!important;margin:auto!important}
      .bpma-rfa-fragment-host .bpma-rfa-textarea-print{font-family:"Times New Roman",Times,serif!important;font-size:10pt!important}
    `;
    document.head.appendChild(st);
    try{
      await inlineImages(wrap);
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const rect=wrap.getBoundingClientRect();
      const width=Math.max(1,Math.ceil(rect.width));
      const height=Math.max(1,Math.ceil(wrap.scrollHeight||rect.height));
      const worker=window.html2pdf().set({
        html2canvas:{scale:1.45,useCORS:true,allowTaint:false,logging:false,backgroundColor:'#ffffff',width,height,windowWidth:Math.max(820,width),windowHeight:Math.max(900,Math.min(height+20,6000)),scrollX:0,scrollY:0},
        jsPDF:{unit:'mm',format:'a4',orientation:'portrait',compress:true}
      }).from(wrap).toCanvas();
      const canvas=await worker.get('canvas');
      return canvas;
    }finally{
      host.remove();
      st.remove();
    }
  }

  async function newEmptyPdf(){
    const dummy=document.createElement('div');
    dummy.style.cssText='width:1px;height:1px;background:#fff';
    dummy.textContent='.';
    const worker=window.html2pdf().set({margin:0,jsPDF:{unit:'mm',format:'a4',orientation:'portrait',compress:true},html2canvas:{scale:1}}).from(dummy).toPdf();
    const pdf=await worker.get('pdf');
    try{pdf.deletePage(1)}catch{}
    return pdf;
  }

  function addCanvasPage(pdf,canvas,{fit=true}={}){
    pdf.addPage('a4','portrait');
    const maxW=CONTENT_W_MM;
    const maxH=A4_H_MM-(MARGIN_MM*2);
    const naturalH=(canvas.height/canvas.width)*maxW;
    const h=fit?Math.min(maxH,naturalH):naturalH;
    const w=fit&&naturalH>maxH?(maxH/naturalH)*maxW:maxW;
    const x=(A4_W_MM-w)/2;
    const y=MARGIN_MM+(maxH-h)/2;
    pdf.addImage(canvas.toDataURL('image/jpeg',0.95),'JPEG',x,y,w,h,undefined,'FAST');
  }

  function addCanvasSlices(pdf,canvas,state){
    const maxW=CONTENT_W_MM;
    const maxH=A4_H_MM-(MARGIN_MM*2);
    const pxPerMm=canvas.width/maxW;
    const fullSlicePx=Math.max(1,Math.floor(maxH*pxPerMm));
    let sy=0;
    let first=true;
    while(sy<canvas.height){
      const remaining=canvas.height-sy;
      const slicePx=Math.min(fullSlicePx,remaining);
      const part=document.createElement('canvas');
      part.width=canvas.width;
      part.height=slicePx;
      const ctx=part.getContext('2d',{alpha:false});
      ctx.fillStyle='#fff';ctx.fillRect(0,0,part.width,part.height);
      ctx.drawImage(canvas,0,sy,canvas.width,slicePx,0,0,canvas.width,slicePx);
      const hmm=(slicePx/canvas.width)*maxW;
      if(!state.pageOpen || state.y+Math.min(hmm,maxH)>A4_H_MM-MARGIN_MM){
        pdf.addPage('a4','portrait');
        state.pageOpen=true;
        state.y=MARGIN_MM;
      }
      // Se o bloco é maior que uma página, usa páginas inteiras a partir daqui.
      if(canvas.height>fullSlicePx && (state.y>MARGIN_MM+0.1)){
        pdf.addPage('a4','portrait');
        state.y=MARGIN_MM;
      }
      pdf.addImage(part.toDataURL('image/jpeg',0.88),'JPEG',MARGIN_MM,state.y,maxW,hmm,undefined,'FAST');
      state.y+=hmm+1.2;
      if(sy+slicePx<canvas.height){
        state.pageOpen=false;
        state.y=MARGIN_MM;
      }
      sy+=slicePx;
      first=false;
    }
  }

  const CPU_PDF_CSS=`
    .bpma-cpu-pdf-host,.bpma-cpu-pdf-host *{box-sizing:border-box!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color:#111!important;border-color:#cfd8d4!important;box-shadow:none!important;text-shadow:none!important;outline-color:#cfd8d4!important;caret-color:#111!important;accent-color:#075d49!important;background-image:none!important}
    .bpma-cpu-pdf-host *::before,.bpma-cpu-pdf-host *::after{box-shadow:none!important;text-shadow:none!important;background-image:none!important}
    .bpma-cpu-pdf-host{font-family:"Times New Roman",Times,serif!important;color:#111!important;background:#fff!important;font-size:10pt!important;line-height:1.16!important}
    .bpma-cpu-pdf-host .wrap{width:196mm!important;max-width:196mm!important;min-width:196mm!important;margin:0!important;padding:0!important;background:#fff!important;overflow:visible!important}
    .bpma-cpu-pdf-host .wrap>*{width:100%!important;max-width:100%!important;margin-left:0!important;margin-right:0!important;transform:none!important}
    .bpma-cpu-pdf-host .no-print,.bpma-cpu-pdf-host button,.bpma-cpu-pdf-host .report-final-actions,.bpma-cpu-pdf-host .report-final-note,.bpma-cpu-pdf-host .cpu-signature-actions{display:none!important}
    .bpma-cpu-pdf-host .topbar{display:grid!important;grid-template-columns:21mm 1fr 21mm!important;align-items:center!important;gap:3mm!important;width:100%!important;padding:3mm 4mm!important;margin:0 0 3mm!important;border:1px solid #ccd7d2!important;border-radius:4mm!important;background:#fff!important;box-shadow:none!important}
    .bpma-cpu-pdf-host .topbar img{display:block!important;max-width:17mm!important;max-height:17mm!important;width:auto!important;height:auto!important;object-fit:contain!important;margin:auto!important}
    .bpma-cpu-pdf-host .head{text-align:center!important;color:#111!important}.bpma-cpu-pdf-host .head b{display:block!important;font-size:11pt!important;line-height:1.05!important}.bpma-cpu-pdf-host .head .sub{font-size:9pt!important;line-height:1.08!important;margin-top:1mm!important}
    .bpma-cpu-pdf-host .title-row{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:3mm!important;margin:0 0 2.5mm!important}.bpma-cpu-pdf-host .title-row h1{font-size:13pt!important;color:#075d49!important;margin:0!important}.bpma-cpu-pdf-host .status{font-size:8.5pt!important;color:#555!important}
    .bpma-cpu-pdf-host .card{display:block!important;width:100%!important;margin:0 0 2.5mm!important;border:1px solid #cfd8d4!important;border-radius:0!important;background:#fff!important;box-shadow:none!important;overflow:visible!important}
    .bpma-cpu-pdf-host .card-head{display:block!important;padding:2mm 2.5mm!important;border-bottom:0.35mm solid #d2bf45!important;background:#fff!important;color:#075d49!important;font-weight:700!important;font-size:10pt!important;line-height:1.1!important}
    .bpma-cpu-pdf-host .card-body{display:block!important;padding:2mm!important;overflow:visible!important}
    .bpma-cpu-pdf-host .fields{display:grid!important;grid-template-columns:repeat(12,minmax(0,1fr))!important;gap:1.8mm!important}.bpma-cpu-pdf-host .field{grid-column:span 3!important;min-width:0!important}.bpma-cpu-pdf-host .s3{grid-column:span 3!important}.bpma-cpu-pdf-host .s4{grid-column:span 4!important}.bpma-cpu-pdf-host .s12{grid-column:span 12!important}
    .bpma-cpu-pdf-host label{display:block!important;margin:0 0 .8mm!important;font-size:7.7pt!important;line-height:1.05!important;font-weight:700!important;color:#333!important;text-transform:none!important}
    .bpma-cpu-pdf-host .table-wrap{display:block!important;width:100%!important;max-width:100%!important;overflow:visible!important;border:0!important;border-radius:0!important;background:#fff!important}
    .bpma-cpu-pdf-host table,.bpma-cpu-pdf-host .edit-table,.bpma-cpu-pdf-host .alter-table,.bpma-cpu-pdf-host .ativ-table,.bpma-cpu-pdf-host .ordem-table,.bpma-cpu-pdf-host .amb-table,.bpma-cpu-pdf-host .comp-table{width:100%!important;max-width:100%!important;min-width:0!important;table-layout:fixed!important;border-collapse:collapse!important;border-spacing:0!important;margin:0!important;font-size:8pt!important;background:#fff!important}
    .bpma-cpu-pdf-host th,.bpma-cpu-pdf-host td{border:.2mm solid #cfd8d4!important;padding:1.1mm 1.2mm!important;vertical-align:middle!important;height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important;line-height:1.08!important;color:#111!important;background:#fff!important}
    .bpma-cpu-pdf-host th{background:#edf4f1!important;color:#26443a!important;font-size:7.3pt!important;font-weight:700!important;text-align:center!important}
    .bpma-cpu-pdf-host thead{display:table-header-group!important}.bpma-cpu-pdf-host tr{break-inside:avoid!important;page-break-inside:avoid!important}
    .bpma-cpu-pdf-host input,.bpma-cpu-pdf-host select,.bpma-cpu-pdf-host textarea,.bpma-cpu-pdf-host .bpma-print-source{display:none!important}
    .bpma-cpu-pdf-host .bpma-print-value{display:block!important;width:100%!important;min-height:1.05em!important;height:auto!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;color:#111!important;font:inherit!important;font-size:8pt!important;line-height:1.12!important;white-space:pre-wrap!important;overflow:visible!important;overflow-wrap:anywhere!important;word-break:normal!important;text-overflow:clip!important}
    .bpma-cpu-pdf-host .bpma-print-value.is-empty{min-height:1.05em!important}
    .bpma-cpu-pdf-host .total-row td{font-weight:700!important;background:#f8faf9!important}.bpma-cpu-pdf-host .desfechos{display:flex!important;flex-wrap:wrap!important;gap:1mm 2mm!important;margin:0 0 1mm!important;font-size:7.3pt!important}.bpma-cpu-pdf-host .desfechos label{display:inline-flex!important;align-items:center!important;gap:.5mm!important;white-space:nowrap!important;margin:0!important;font-size:7.2pt!important}
    .bpma-cpu-pdf-host .ufr-wrap{display:inline-flex!important;align-items:center!important;width:auto!important;max-width:100%!important;gap:1mm!important;margin:.8mm 0!important;padding:.8mm 1.2mm!important;border:.2mm solid #bdd5cb!important;border-radius:1mm!important;background:#f7fbf9!important}.bpma-cpu-pdf-host .ufr-wrap[hidden]{display:none!important}.bpma-cpu-pdf-host .ufr-wrap label{margin:0!important;font-size:6.8pt!important}.bpma-cpu-pdf-host .ufr-field{display:flex!important;align-items:center!important;gap:.6mm!important}.bpma-cpu-pdf-host .ufr-unit{font-size:6.5pt!important;font-weight:700!important}.bpma-cpu-pdf-host .ufr-field .bpma-print-value{width:auto!important;min-width:8mm!important;text-align:center!important;font-weight:700!important}
    .bpma-cpu-pdf-host .amb-title,.bpma-cpu-pdf-host .subbox-title{background:#08765e!important;color:#fff!important;font-weight:700!important;text-align:center!important;padding:2mm!important;font-size:9.5pt!important;line-height:1.08!important}
    .bpma-cpu-pdf-host .pass-grid,.bpma-cpu-pdf-host .signature-grid{width:100%!important;max-width:100%!important}
    .bpma-cpu-pdf-host .cpu-signature-main{display:none!important}.bpma-cpu-pdf-host .signature-box{display:block!important;margin-top:5mm!important;text-align:center!important}.bpma-cpu-pdf-host .signature-line{display:block!important;width:70mm!important;margin:8mm auto 0!important;padding-top:1.5mm!important;border-top:.2mm solid #777!important;text-align:center!important;font-size:8pt!important}.bpma-cpu-pdf-host .cpu-signature-preview{display:block!important;text-align:center!important}.bpma-cpu-pdf-host .cpu-signature-preview img{display:block!important;max-width:65mm!important;max-height:15mm!important;margin:0 auto!important;object-fit:contain!important}.bpma-cpu-pdf-host .cpu-signature-preview img[hidden]{display:none!important}
    .bpma-cpu-pdf-host .note{display:none!important}
  `;

  // O CPU é longo: capturar o formulário inteiro em um único canvas corta
  // o final em alguns celulares. Cada seção é rasterizada separadamente.
  function cpuMainChildren(){
    const source=document.querySelector('main.wrap');
    if(!source)throw new Error('Relatório CPU não encontrado.');
    const clone=source.cloneNode(true);
    syncControls(source,clone);
    clone.querySelectorAll('.no-print,.report-final-actions,.report-final-note,script').forEach(el=>el.remove());
    return Array.from(clone.children).filter(el=>!el.matches('.no-print,.report-final-actions,.report-final-note'));
  }

  async function canvasForCpuFragment(element){
    // Renderizador isolado: evita que o html2canvas leia CSS moderno da interface
    // (ex.: oklab/oklch do Safari/iOS) e garante exatamente a largura A4 do CPU.
    const frame=document.createElement('iframe');
    frame.className='bpma-cpu-pdf-frame';
    frame.setAttribute('aria-hidden','true');
    frame.style.cssText=`position:fixed!important;left:-12000px!important;top:0!important;width:${CONTENT_W_MM}mm!important;height:2000px!important;border:0!important;opacity:.001!important;pointer-events:none!important;z-index:-2147483000!important;background:#fff!important`;
    frame.srcdoc=`<!doctype html><html><head><meta charset="utf-8"><base href="${location.href.replace(/"/g,'&quot;')}"><style>html,body{margin:0!important;padding:0!important;width:${CONTENT_W_MM}mm!important;min-width:${CONTENT_W_MM}mm!important;background:#fff!important;color:#111!important} ${CPU_PDF_CSS}</style></head><body class="bpma-cpu-pdf-host"></body></html>`;
    document.body.appendChild(frame);
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Tempo excedido ao preparar o PDF.')),6000);
      frame.onload=()=>{clearTimeout(timer);resolve()};
    });
    const doc=frame.contentDocument;
    if(!doc)throw new Error('Renderizador isolado indisponível.');
    const wrap=doc.createElement('main');
    wrap.className='wrap';
    wrap.style.cssText=`width:${CONTENT_W_MM}mm!important;max-width:${CONTENT_W_MM}mm!important;min-width:${CONTENT_W_MM}mm!important;height:auto!important;margin:0!important;padding:0!important;overflow:visible!important;background:#fff!important;box-sizing:border-box!important`;
    const clonedChild=doc.importNode(element,true);
    wrap.appendChild(clonedChild);
    doc.body.appendChild(wrap);
    // Os valores de impressão já estão nos .bpma-print-value; removemos controles
    // para impedir estilos nativos do iOS/Safari de chegarem ao html2canvas.
    wrap.querySelectorAll('input,select,textarea,button,.bpma-print-source,.no-print,.report-final-actions,.report-final-note,.cpu-signature-actions,.cpu-signature-main').forEach(el=>el.remove());
    try{
      await inlineImages(wrap);
      sanitizeCanvasColors(wrap);
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      sanitizeCanvasColors(wrap);
      const rect=wrap.getBoundingClientRect();
      const width=Math.max(1,Math.ceil(rect.width));
      const height=Math.max(1,Math.ceil(wrap.scrollHeight||rect.height));
      const worker=window.html2pdf().set({
        html2canvas:{scale:1.6,useCORS:true,allowTaint:false,logging:false,backgroundColor:'#ffffff',width,height,windowWidth:width,windowHeight:Math.max(height,900),scrollX:0,scrollY:0,removeContainer:true,imageTimeout:12000,onclone:(cloneDoc)=>{try{cloneDoc.querySelectorAll('*').forEach(el=>{el.style.setProperty('box-shadow','none','important');el.style.setProperty('text-shadow','none','important');el.style.setProperty('background-image','none','important')})}catch{}}},
        jsPDF:{unit:'mm',format:'a4',orientation:'portrait',compress:true}
      }).from(wrap).toCanvas();
      return await worker.get('canvas');
    }finally{frame.remove()}
  }


  function cpuPdfNormalizeText(value){
    return String(value??'')
      .replace(/\u00a0/g,' ')
      .replace(/[ \t]+\n/g,'\n')
      .replace(/\n[ \t]+/g,'\n')
      .replace(/[ \t]{2,}/g,' ')
      .replace(/\n{3,}/g,'\n\n')
      .trim();
  }

  function cpuPdfFormatDate(value){
    const v=cpuPdfNormalizeText(value);
    const m=v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m?`${m[3]}/${m[2]}/${m[1]}`:v;
  }

  function cpuPdfControlText(el){
    if(!el)return '';
    const tag=String(el.tagName||'').toUpperCase();
    if(tag==='SELECT'){
      const value=cpuPdfNormalizeText(el.value||'');
      if(!value)return '';
      const label=cpuPdfNormalizeText(el.options?.[el.selectedIndex]?.textContent||value);
      return /^(selecione|natureza|subnatureza)$/i.test(label)?'':label;
    }
    if(tag==='TEXTAREA')return cpuPdfNormalizeText(el.value||el.textContent||'');
    if(tag==='INPUT'){
      const type=String(el.type||'text').toLowerCase();
      if(type==='checkbox'||type==='radio')return el.checked?'✓':'';
      if(type==='date')return cpuPdfFormatDate(el.value);
      const value=cpuPdfNormalizeText(el.value);
      if(type==='number' && /^0+(?:[.,]0+)?$/.test(value) && !el.hasAttribute('data-pdf-show-zero')) return '';
      return value;
    }
    return cpuPdfNormalizeText(el.textContent||'');
  }

  function cpuPdfCellText(cell){
    if(!cell)return '';
    const clone=cell.cloneNode(true);
    clone.querySelectorAll('.no-print,button,[role="button"],.bpma-print-value,.bpma-print-source,.bpma-print-mirror,[data-print-mirror]').forEach(el=>el.remove());
    const originals=Array.from(cell.querySelectorAll('input,select,textarea'));
    const copies=Array.from(clone.querySelectorAll('input,select,textarea'));
    copies.forEach((el,idx)=>{
      const span=clone.ownerDocument.createElement('span');
      const original=originals[idx]||el;
      let value=cpuPdfControlText(original);
      // O texto do label já permanece no clone; para checkbox basta o marcador.
      if(String(original.type||'').toLowerCase()==='checkbox'||String(original.type||'').toLowerCase()==='radio') value=original.checked?'✓':'';
      span.textContent=value;
      el.replaceWith(span);
    });
    return cpuPdfNormalizeText(clone.textContent||'');
  }

  function cpuPdfProcedureRows(table){
    return Array.from(table.querySelectorAll('tbody tr')).map(row=>{
      const cells=Array.from(row.children).filter(c=>/^(TD|TH)$/i.test(c.tagName)&&!c.classList.contains('no-print'));
      const vtr=cpuPdfControlText(cells[0]?.querySelector('textarea,input'));
      const natCell=cells[1];
      const cat=cpuPdfControlText(natCell?.querySelector('.natureza-cat'));
      const sub=cpuPdfControlText(natCell?.querySelector('.natureza-sub'));
      const outro=cpuPdfControlText(natCell?.querySelector('.natureza-outro:not([hidden])'));
      const nat=[];
      if(cat)nat.push(`Natureza: ${cat}`);
      if(sub)nat.push(`Subnatureza: ${sub}`);
      if(outro)nat.push(outro);

      const concCell=cells[2];
      const checked=Array.from(concCell?.querySelectorAll('.desfechos input[type="checkbox"]:checked')||[])
        .map(cb=>cb.value==='Procedimento administrativo'?'Proc. adm.':cpuPdfNormalizeText(cb.value))
        .filter(Boolean);
      const free=cpuPdfControlText(concCell?.querySelector('textarea'));
      const ufr=cpuPdfControlText(concCell?.querySelector('.ufr-pb'));
      const conclusion=[];
      if(checked.length)conclusion.push(checked.join(' | '));
      if(ufr && !/^0+$/.test(ufr))conclusion.push(`UFR-PB aplicadas: ${ufr}`);
      if(free)conclusion.push(free);

      const items=cpuPdfControlText(cells[3]?.querySelector('textarea,input'));
      return [vtr,nat.join('\n'),conclusion.join('\n'),items];
    });
  }

  function cpuPdfActivityRows(table){
    return Array.from(table.querySelectorAll('tbody tr')).map(row=>{
      const cells=Array.from(row.children).filter(c=>/^(TD|TH)$/i.test(c.tagName)&&!c.classList.contains('no-print'));
      const select=cells[0]?.querySelector('.atividade-tipo');
      let action=cpuPdfControlText(select);
      if(select?.value==='Outros') action=cpuPdfControlText(cells[0]?.querySelector('.atividade-outro'))||'Outros';
      return [action,cpuPdfControlText(cells[1]?.querySelector('textarea,input')),cpuPdfControlText(cells[2]?.querySelector('textarea,input')),cpuPdfControlText(cells[3]?.querySelector('input,textarea'))];
    });
  }

  function cpuPdfAnimalRows(table){
    return Array.from(table.querySelectorAll('tbody tr')).map(row=>{
      const cells=Array.from(row.children).filter(c=>/^(TD|TH)$/i.test(c.tagName)&&!c.classList.contains('no-print'));
      return cells.slice(0,7).map((cell,i)=>{
        const ctl=cell.querySelector('select,textarea,input');
        const value=cpuPdfControlText(ctl);
        if(i===5 && /^0+$/.test(value))return '';
        return value;
      });
    });
  }

  function cpuPdfTableRows(table){
    if(table?.id==='tblProcedimentosPreview')return cpuPdfProcedureRows(table);
    if(table?.id==='tblAtividadesPreview')return cpuPdfActivityRows(table);
    if(table?.id==='tblAnimaisPreview')return cpuPdfAnimalRows(table);
    const visibleCell=c=>!c.classList?.contains('no-print') && !c.matches?.('[hidden]');
    const rows=[];
    const spanLeft=[];
    const sections=[...table.querySelectorAll('tbody tr'),...table.querySelectorAll('tfoot tr')];
    for(const tr of sections){
      const out=[];
      let col=0;
      const cells=Array.from(tr.children).filter(c=>/^(TD|TH)$/i.test(c.tagName)&&visibleCell(c));
      for(const cell of cells){
        while(spanLeft[col]>0){out[col]='';spanLeft[col]--;col++}
        const colspan=Math.max(1,Number(cell.getAttribute('colspan')||1));
        const rowspan=Math.max(1,Number(cell.getAttribute('rowspan')||1));
        out[col]=cpuPdfCellText(cell);
        if(rowspan>1){for(let j=0;j<colspan;j++)spanLeft[col+j]=rowspan-1}
        for(let j=1;j<colspan;j++)out[col+j]='';
        col+=colspan;
      }
      while(spanLeft[col]>0){out[col]='';spanLeft[col]--;col++}
      rows.push(out);
    }
    return rows;
  }

  function cpuPdfHeaders(table){
    const tr=table.querySelector('thead tr');
    if(!tr)return [];
    return Array.from(tr.children)
      .filter(c=>/^(TH|TD)$/i.test(c.tagName)&&!c.classList.contains('no-print'))
      .flatMap(cell=>{
        const n=Math.max(1,Number(cell.getAttribute('colspan')||1));
        return [cpuPdfCellText(cell),...Array(n-1).fill('')];
      });
  }

  const CPU_VECTOR_WIDTHS={
    tblRecursos:[.11,.30,.07,.07,.30,.075,.075],
    tblAlteracoes:[.16,.08,.76],
    tblAtividadesPreview:[.19,.20,.43,.18],
    tblPrisoesPreview:[.12,.20,.10,.11,.47],
    tblObjetosPreview:[.20,.60,.20],
    tblVeiculosObjetosPreview:[.18,.41,.41],
    tblProcedimentosPreview:[.15,.22,.40,.23],
    tblAnimaisPreview:[.10,.13,.14,.18,.15,.07,.23],
    tblComplementaresPreview:[.20,.80]
  };

  async function cpuPdfImageData(img){
    if(!img)return '';
    const src=img.currentSrc||img.src||img.getAttribute('src')||'';
    if(!src)return '';
    if(/^data:image\//i.test(src))return src;
    try{
      const absolute=new URL(src,location.href).href;
      const res=await fetch(absolute,{cache:'force-cache'});
      if(!res.ok)return '';
      return await toDataUrl(await res.blob());
    }catch{return ''}
  }

  function cpuPdfImageFormat(data){
    if(/^data:image\/png/i.test(data))return 'PNG';
    if(/^data:image\/(webp)/i.test(data))return 'WEBP';
    return 'JPEG';
  }

  async function generateCpuDynamicPdf(opts={}){
    if(!opts.silent)showBusy();
    try{
      prepareSafe(opts.prepare);
      autoPrepare();
      await ensurePdfLib();
      const pdf=await newEmptyPdf();
      const PAGE_W=210,PAGE_H=297,M=7,W=PAGE_W-M*2;
      const GREEN=[7,93,73],DARK_GREEN=[8,118,94],PALE=[237,244,241],GOLD=[210,191,69],BORDER=[205,216,212],TEXT=[24,35,31];
      let y=M;
      let pageNo=0;
      const pageBottom=PAGE_H-M;
      const bodyFont=9.6;

      const setText=(size=bodyFont,style='normal',color=TEXT)=>{pdf.setFont('times',style);pdf.setFontSize(size);pdf.setTextColor(...color)};
      const addPage=()=>{pdf.addPage('a4','portrait');pageNo++;y=M;setText()};
      const ensure=(h=8)=>{if(pageNo===0)addPage();if(y+h>pageBottom)addPage()};
      const line=(yy,color=BORDER,w=.2)=>{pdf.setDrawColor(...color);pdf.setLineWidth(w);pdf.line(M,yy,M+W,yy)};
      const wrap=(txt,max)=>pdf.splitTextToSize(cpuPdfNormalizeText(txt)||' ',Math.max(3,max));

      const drawHeader=async()=>{
        ensure(31);
        const imgs=Array.from(document.querySelectorAll('.topbar img'));
        const [left,right]=await Promise.all([cpuPdfImageData(imgs[0]),cpuPdfImageData(imgs[1])]);
        pdf.setDrawColor(...BORDER);pdf.setLineWidth(.25);pdf.roundedRect(M,y,W,25,3,3,'S');
        if(left){try{pdf.addImage(left,cpuPdfImageFormat(left),M+4,y+3,17,17,undefined,'FAST')}catch{}}
        if(right){try{pdf.addImage(right,cpuPdfImageFormat(right),M+W-21,y+3,17,17,undefined,'FAST')}catch{}}
        setText(13,'bold',[0,0,0]);pdf.text('POLÍCIA MILITAR DA PARAÍBA',PAGE_W/2,y+9,{align:'center'});
        setText(10.2,'bold',[0,0,0]);pdf.text('BATALHÃO ESPECIALIZADO EM POLICIAMENTO DO MEIO AMBIENTE',PAGE_W/2,y+15,{align:'center'});
        y+=29;
        setText(13,'bold',GREEN);pdf.text('Relatório de Serviço CPU',M,y);y+=5;
      };

      const drawSectionTitle=(title)=>{
        ensure(9);
        setText(11,'bold',GREEN);
        pdf.text(cpuPdfNormalizeText(title),M+2,y+4.2);
        pdf.setDrawColor(...GOLD);pdf.setLineWidth(.45);pdf.line(M,y+6.4,M+W,y+6.4);
        y+=9;
      };

      const drawSubTitle=(title)=>{
        ensure(16);
        pdf.setFillColor(...DARK_GREEN);pdf.rect(M,y,W,7,'F');
        setText(9.8,'bold',[255,255,255]);pdf.text(cpuPdfNormalizeText(title).toUpperCase(),PAGE_W/2,y+4.7,{align:'center'});
        y+=7;
      };

      const fieldValue=name=>cpuPdfControlText(document.querySelector(`[name="${name}"]`));
      const drawIdentification=()=>{
        drawSectionTitle('IDENTIFICAÇÃO DO SERVIÇO');
        const fields=[
          ['Identificação do serviço',fieldValue('identificacaoServico')],['OPM responsável',fieldValue('opmResponsavel')],['Coordenador de policiamento',fieldValue('coordenador')],
          ['Início - Data',fieldValue('inicioData')],['Início - Hora',fieldValue('inicioHora')],['Término - Data',fieldValue('fimData')],['Término - Hora',fieldValue('fimHora')],
          ['Área de policiamento',fieldValue('areaPoliciamento')]
        ];
        const row=(items,widths)=>{
          let maxH=14;const prepared=items.map((it,i)=>{const ww=W*widths[i];const lines=wrap(it[1]||'',ww-4);maxH=Math.max(maxH,8+lines.length*3.5);return {it,ww,lines}});
          ensure(maxH);let x=M;
          for(const p of prepared){pdf.setDrawColor(...BORDER);pdf.rect(x,y,p.ww,maxH,'S');setText(7.3,'bold',[62,77,72]);pdf.text(p.it[0].toUpperCase(),x+2,y+4);setText(9,'normal',[0,0,0]);pdf.text(p.lines,x+2,y+8.2);x+=p.ww}y+=maxH;
        };
        row(fields.slice(0,3),[.32,.32,.36]);
        row(fields.slice(3,7),[.25,.25,.25,.25]);
        row([fields[7]],[1]);y+=3;
      };

      const drawTable=(tableId,opts2={})=>{
        const table=document.getElementById(tableId);if(!table)return;
        const headers=cpuPdfHeaders(table);const rows=cpuPdfTableRows(table);
        const n=Math.max(headers.length,...rows.map(r=>r.length),1);
        let fr=CPU_VECTOR_WIDTHS[tableId]||Array(n).fill(1/n);
        if(fr.length<n)fr=[...fr,...Array(n-fr.length).fill(.08)];
        const total=fr.slice(0,n).reduce((a,b)=>a+b,0)||1;fr=fr.slice(0,n).map(v=>v/total);
        const widths=fr.map(v=>W*v);
        const drawHeaderRow=()=>{
          const h=Math.max(7.5,...headers.map((t,i)=>wrap(t,widths[i]-3).length*3.2+3.2));ensure(h);let x=M;for(let i=0;i<n;i++){pdf.setFillColor(...PALE);pdf.setDrawColor(...BORDER);pdf.rect(x,y,widths[i],h,'FD');setText(7.4,'bold',[38,68,58]);const lines=wrap(headers[i]||'',widths[i]-3);pdf.text(lines,x+widths[i]/2,y+3.1,{align:'center'});x+=widths[i]}y+=h;
        };
        if(headers.length)drawHeaderRow();
        for(const row of rows){
          const cells=Array.from({length:n},(_,i)=>row[i]||'');
          const lineSets=cells.map((t,i)=>wrap(t,widths[i]-3));
          let h=Math.max(6.5,...lineSets.map(ls=>Math.max(1,ls.length)*3.55+2.8));
          if(y+h>pageBottom){addPage();if(opts2.repeatTitle){drawSubTitle(opts2.repeatTitle)}if(headers.length)drawHeaderRow()}
          let x=M;
          for(let i=0;i<n;i++){
            pdf.setDrawColor(...BORDER);pdf.setFillColor(255,255,255);pdf.rect(x,y,widths[i],h,'S');
            setText(8.3,'normal',[17,17,17]);pdf.text(lineSets[i],x+1.5,y+3.5,{baseline:'top'});x+=widths[i];
          }
          y+=h;
        }
        y+=3;
      };

      const drawPassage=()=>{
        drawSectionTitle('7 · PASSAGEM DE SERVIÇO');
        const date=fieldValue('passagemData');const obs=fieldValue('passagemObservacao');const pass=fieldValue('passagemTexto');
        const coord=fieldValue('coordenador');
        const content=[['Data',date],['Observação',obs],['Passagem',pass]];
        for(const [lab,val] of content){const lines=wrap(val,W-6);const h=Math.max(lab==='Passagem'?14:9,5.5+lines.length*3.5);ensure(h);setText(7.4,'bold',[62,77,72]);pdf.text(lab.toUpperCase(),M+2,y+3.5);setText(9,'normal',[0,0,0]);pdf.text(lines,M+2,y+7.4);y+=h}
        ensure(19);y+=6;pdf.setDrawColor(100,100,100);pdf.line(PAGE_W/2-35,y,PAGE_W/2+35,y);setText(8.5,'bold',[0,0,0]);pdf.text(coord||'Coordenador de Policiamento',PAGE_W/2,y+4,{align:'center'});y+=6;
      };

      await drawHeader();
      drawIdentification();
      drawSectionTitle('1 · QUADRO DE RECURSOS OPERACIONAIS');drawTable('tblRecursos');
      drawSectionTitle('2 · QUADRO DE ALTERAÇÕES ADMINISTRATIVAS');drawTable('tblAlteracoes');
      drawSectionTitle('3 · QUADRO DE ATIVIDADES DESEMPENHADAS');drawTable('tblAtividadesPreview');
      drawSectionTitle('4 · QUADRO DE AÇÕES DE PRESERVAÇÃO DA ORDEM PÚBLICA');
      drawSubTitle('Prisões / Apreensões de Pessoas');drawTable('tblPrisoesPreview',{repeatTitle:'Prisões / Apreensões de Pessoas'});
      drawSubTitle('Armas, Munições e Drogas Apreendidas');drawTable('tblObjetosPreview',{repeatTitle:'Armas, Munições e Drogas Apreendidas'});
      drawSubTitle('Veículos e Objetos Apreendidos e Recuperados');drawTable('tblVeiculosObjetosPreview',{repeatTitle:'Veículos e Objetos Apreendidos e Recuperados'});
      drawSectionTitle('5 · QUADRO DE AÇÕES AMBIENTAIS');
      drawSubTitle('Procedimentos Administrativos');drawTable('tblProcedimentosPreview',{repeatTitle:'Procedimentos Administrativos'});
      drawSubTitle('Animais Resgatados, Entregues Voluntariamente ou Apreendidos de Forma Avulsa');drawTable('tblAnimaisPreview',{repeatTitle:'Animais Resgatados / Entregues / Apreendidos'});
      drawSectionTitle('6 · QUADRO DE INFORMAÇÕES COMPLEMENTARES');drawTable('tblComplementaresPreview');
      drawPassage();

      const pages=pdf.getNumberOfPages?.()||pageNo;
      for(let p=1;p<=pages;p++){
        pdf.setPage(p);setText(7.2,'normal',[100,100,100]);pdf.text(`BPMA Digital · CPU · Página ${p} de ${pages}`,PAGE_W-M,PAGE_H-3.5,{align:'right'});
      }
      const blob=pdf.output('blob');
      if(!(blob instanceof Blob)||blob.size<1000)throw new Error('PDF CPU vazio ou inválido.');
      if(!opts.silent)showReady(blob,opts.filename||'CPU_BPMA.pdf');
      return opts.returnBlob?blob:true;
    }catch(err){
      console.error('PDF CPU vetorial:',err);
      if(opts.returnBlob)throw err;
      if(!opts.silent)showError(err);
      return false;
    }finally{try{window.dispatchEvent(new Event('afterprint'))}catch{}}
  }

  const generateCpuDesktopPdf=generateCpuDynamicPdf;
  const generateCpuMobilePdf=generateCpuDynamicPdf;

  async function generateRfaMobilePdf(opts={}){
    showBusy();
    try{
      prepareSafe(opts.prepare);
      try{window.BPMA_RFA_ANNEX?.rebuildPrintPages?.();window.BPMA_RFA_FINAL_ANNEX?.rebuildPrintPages?.()}catch{}
      await ensurePdfLib();
      const pdf=await newEmptyPdf();
      let pageCount=0;

      // Anexos primeiro, um por página A4.
      const annexes=Array.from(document.querySelectorAll('#annexPrintPages .annex-print-sheet'));
      for(const sheet of annexes){
        const canvas=await canvasForRfaFragment(sheet,{annex:true});
        addCanvasPage(pdf,canvas,{fit:true});
        pageCount++;
      }

      // Corpo do RFA: renderização por bloco, evitando canvas gigante no iPhone.
      const state={pageOpen:false,y:MARGIN_MM};
      const children=rfaMainChildren();
      for(const child of children){
        if(!child || child.matches?.('.no-print,.print-actions'))continue;
        const canvas=await canvasForRfaFragment(child);
        const hMm=(canvas.height/canvas.width)*CONTENT_W_MM;
        const maxH=A4_H_MM-(MARGIN_MM*2);
        if(hMm<=maxH){
          if(!state.pageOpen || state.y+hMm>A4_H_MM-MARGIN_MM){
            pdf.addPage('a4','portrait');pageCount++;state.pageOpen=true;state.y=MARGIN_MM;
          }
          pdf.addImage(canvas.toDataURL('image/jpeg',0.95),'JPEG',MARGIN_MM,state.y,CONTENT_W_MM,hMm,undefined,'FAST');
          state.y+=hMm+1.2;
        }else{
          const before=pdf.getNumberOfPages?.()||pageCount;
          addCanvasSlices(pdf,canvas,state);
          const after=pdf.getNumberOfPages?.()||before;
          pageCount+=Math.max(0,after-before);
        }
      }

      // O conjunto final começa sempre em uma página nova, após o corpo do RFA.
      const finalAnnexes=Array.from(document.querySelectorAll('#finalAnnexPrintPages .annex-print-sheet'));
      for(const sheet of finalAnnexes){
        const canvas=await canvasForRfaFragment(sheet,{annex:true});
        addCanvasPage(pdf,canvas,{fit:true});
        pageCount++;
      }

      if((pdf.getNumberOfPages?.()||0)===0) throw new Error('O RFA não possui conteúdo para gerar o PDF.');
      const blob=pdf.output('blob');
      if(!(blob instanceof Blob)||blob.size<1000) throw new Error('PDF vazio ou inválido.');
      showReady(blob,opts.filename||'RFA_BPMA.pdf');
      return true;
    }catch(err){
      console.error('PDF RFA móvel:',err);
      showError(err);
      return false;
    }
  }

  function printRfa(input){
    const opts=normalizeOptions(input);
    if(isMobile()){
      generateRfaMobilePdf(opts);
      return true;
    }
    prepareSafe(opts.prepare);
    return nativePrint();
  }

  function normalizeOptions(input){
    if(typeof input==='function') return {prepare:input};
    if(input && typeof input==='object') return {...input};
    return {};
  }

  function printCurrent(input){
    const opts=normalizeOptions(input);
    if(window.BPMA_BO_PDF && (opts.selector||autoSelector())==='#view-bo .print-area'){
      if(isMobile()) return generateBoPdf(opts);
      return window.BPMA_BO_PDF.nativePrint();
    }
    if(opts.selector==='main.wrap'){
      // CPU usa exatamente o mesmo gerador limpo em computador, iPhone e Android.
      // Assim o layout não depende do tamanho da tela nem de CSS de impressão legado.
      return generateCpuDynamicPdf(opts);
    }
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
  async function generateBoPdf(opts={}){
    if(!opts.silent)showBusy();
    let job;
    try{
      await ensurePdfLib();
      job=await window.BPMA_BO_PDF.buildPages();
      // O html2canvas deve executar no mesmo documento que contém os estilos A4.
      await new Promise((resolve,reject)=>{
        const script=job.frame.contentDocument.createElement('script');
        script.src=new URL('../vendor/html2pdf.bundle.min.js',location.href).href;
        script.onload=resolve;script.onerror=()=>reject(new Error('Gerador do BO indisponível.'));
        job.frame.contentDocument.head.appendChild(script);
      });
      const pdf=await newEmptyPdf();
      for(const page of job.pages){
        const worker=job.frame.contentWindow.html2pdf().set({
          margin:7,jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
          html2canvas:{scale:1.6,useCORS:true,logging:false,backgroundColor:'#fff',windowWidth:810,scrollX:0,scrollY:0},
          pagebreak:{mode:[]}
        }).from(page).toCanvas();
        const canvas=await worker.get('canvas');
        pdf.addPage('a4','portrait');
        const height=canvas.height/canvas.width*CONTENT_W_MM;
        pdf.addImage(canvas.toDataURL('image/jpeg',0.97),'JPEG',MARGIN_MM,MARGIN_MM,CONTENT_W_MM,height,undefined,'FAST');
        canvas.width=canvas.height=1;
      }
      const blob=pdf.output('blob');
      if(!blob || blob.size<1000)throw new Error('PDF do BO vazio.');
      if(!opts.silent)showReady(blob,safeName(opts.filename||'BO.pdf'));
      return opts.returnBlob?blob:true;
    }catch(err){if(opts.returnBlob)throw err;if(!opts.silent)showError(err);return false}
    finally{job?.dispose()}
  }
  document.addEventListener('DOMContentLoaded',installManualPrintBar);

  window.BPMA_PRINT={
    isIOS,isAndroid,isMobile,isStandalone,
    printCurrent,printRfa,nativePrint,generateMobilePdf,generateCpuDynamicPdf,generateRfaMobilePdf,
    openReportForPrint,installManualPrintBar,showFallback
  };
})();
