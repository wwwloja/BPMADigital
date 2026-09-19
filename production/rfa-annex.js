(() => {
  const PDFJS_URL='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const PDFJS_WORKER='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  let pdfPromise=null;
  let busy=0;

  const rootOf=(r)=>typeof r==='string'?document.querySelector(r):r;
  const $=(s,r=document)=>rootOf(r)?.querySelector?.(s)||null;
  const $$=(s,r=document)=>Array.from(rootOf(r)?.querySelectorAll?.(s)||[]);

  function emitChange(){
    document.dispatchEvent(new CustomEvent('bpma:rfa-annex-change'));
  }

  function updateStatus(){
    const box=$('#annexStatus');
    const print=$('#printRelatorioCompleto');
    const cards=$$('.annex-item','#annexList');
    if(box){
      if(busy>0) box.textContent='Processando anexo...';
      else if(!cards.length) box.textContent='Nenhum anexo adicionado.';
      else box.textContent=`${cards.length} arquivo${cards.length===1?'':'s'} anexado${cards.length===1?'':'s'}.`;
    }
    if(print && busy>0) print.disabled=true;
    else if(print && !print.dataset.forceDisabled) print.disabled=false;
  }

  function setBusy(delta){ busy=Math.max(0,busy+delta); updateStatus(); }
  function isBusy(){ return busy>0; }

  function ensurePdfJs(){
    if(window.pdfjsLib){
      window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;
      return Promise.resolve(window.pdfjsLib);
    }
    if(pdfPromise)return pdfPromise;
    pdfPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=PDFJS_URL;
      script.async=true;
      script.crossOrigin='anonymous';
      script.onload=()=>{
        if(!window.pdfjsLib){ reject(new Error('Leitor de PDF não foi carregado.')); return; }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;
        resolve(window.pdfjsLib);
      };
      script.onerror=()=>reject(new Error('Não foi possível carregar o leitor de PDF. Verifique a internet.'));
      document.head.appendChild(script);
    });
    return pdfPromise;
  }

  function safeText(s){return String(s||'').replace(/[<>]/g,'')}
  function mimeOf(file){
    const type=String(file?.type||'').toLowerCase();
    if(type)return type;
    return String(file?.name||'').toLowerCase().endsWith('.pdf')?'application/pdf':'image/jpeg';
  }
  function accepted(file){
    const mime=mimeOf(file);
    return mime==='application/pdf' || mime.startsWith('image/');
  }
  function readDataUrl(file){
    return new Promise((resolve,reject)=>{
      const r=new FileReader();
      r.onload=()=>resolve(String(r.result||''));
      r.onerror=()=>reject(new Error('Não foi possível ler a imagem.'));
      r.readAsDataURL(file);
    });
  }

  async function renderPdfPages(data){
    const lib=await ensurePdfJs();
    const doc=await lib.getDocument({data}).promise;
    const pages=[];
    for(let n=1;n<=doc.numPages;n++){
      const page=await doc.getPage(n);
      const base=page.getViewport({scale:1});
      const scale=Math.min(2.2,Math.max(1.25,1500/base.width));
      const viewport=page.getViewport({scale});
      const canvas=document.createElement('canvas');
      canvas.width=Math.ceil(viewport.width);
      canvas.height=Math.ceil(viewport.height);
      const ctx=canvas.getContext('2d',{alpha:false});
      ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
      await page.render({canvasContext:ctx,viewport}).promise;
      pages.push(canvas.toDataURL('image/jpeg',0.94));
      canvas.width=1;canvas.height=1;
    }
    try{await doc.destroy()}catch{}
    return pages;
  }

  async function renderPdfFile(file){
    const buf=await file.arrayBuffer();
    return renderPdfPages(new Uint8Array(buf));
  }

  async function renderPdfUrl(url){
    const res=await fetch(url,{cache:'no-store'});
    if(!res.ok)throw new Error('Não foi possível abrir o PDF anexado.');
    return renderPdfPages(new Uint8Array(await res.arrayBuffer()));
  }

  function cloneHeader(){
    const original=$('.page > header.topbar');
    return original?original.cloneNode(true):document.createElement('header');
  }

  function rebuildPrintPages(){
    const target=$('#annexPrintPages');
    if(!target)return;
    target.innerHTML='';
    $$('.annex-item','#annexList').forEach(card=>{
      const pages=card._printPages||[];
      pages.forEach(src=>{
        const sheet=document.createElement('section');
        sheet.className='annex-print-sheet';
        const header=cloneHeader();
        header.classList.add('annex-header');
        const title=document.createElement('div');
        title.className='annex-document-title';
        title.textContent='ANEXO DOCUMENTAL';
        const body=document.createElement('div');
        body.className='annex-document-body';
        const img=document.createElement('img');
        img.alt='Anexo documental';
        img.src=src;
        body.appendChild(img);
        sheet.append(header,title,body);
        target.appendChild(sheet);
      });
    });
  }

  function makeCard({name,mime,path='',file=null}){
    const card=document.createElement('div');
    card.className='annex-item';
    card.dataset.storagePath=path||'';
    card.dataset.mimeType=mime||'';
    card.dataset.originalName=name||'anexo';
    card._file=file||null;
    card._printPages=[];
    card.innerHTML=`
      <div class="annex-thumb"><span class="annex-placeholder">${mime==='application/pdf'?'PDF':'IMG'}</span></div>
      <div class="annex-info"><b>${safeText(name||'Anexo')}</b><span class="annex-kind">${mime==='application/pdf'?'PDF':'Imagem'} · preparando...</span></div>
      <button type="button" class="btn danger annex-remove">Excluir</button>`;
    $('#annexList')?.appendChild(card);
    updateStatus();
    return card;
  }

  function setCardPreview(card,src,pageCount=1){
    const thumb=$('.annex-thumb',card);
    if(thumb){
      thumb.innerHTML='';
      const img=document.createElement('img'); img.src=src; img.alt='Prévia do anexo';
      thumb.appendChild(img);
    }
    const kind=$('.annex-kind',card);
    const mime=card.dataset.mimeType;
    if(kind) kind.textContent=mime==='application/pdf'
      ? `PDF · ${pageCount} página${pageCount===1?'':'s'}`
      : 'Imagem · 1 página';
  }

  async function prepareNewFile(file){
    if(!accepted(file)){
      alert(`Arquivo não aceito: ${file.name||'sem nome'}. Use imagem ou PDF.`);
      return;
    }
    const mime=mimeOf(file);
    const card=makeCard({name:file.name||'anexo',mime,file});
    setBusy(1);
    try{
      if(mime==='application/pdf'){
        const pages=await renderPdfFile(file);
        card._printPages=pages;
        if(pages[0])setCardPreview(card,pages[0],pages.length);
      }else{
        const src=await readDataUrl(file);
        card._printPages=[src];
        setCardPreview(card,src,1);
      }
      rebuildPrintPages();
      emitChange();
    }catch(err){
      card.remove(); rebuildPrintPages();
      alert(err.message||'Não foi possível processar o anexo.');
    }finally{setBusy(-1)}
  }

  async function addFiles(files){
    for(const file of Array.from(files||[])) await prepareNewFile(file);
  }

  async function buildStored(item){
    if(!item?.path)return;
    const mime=String(item.mime||'').toLowerCase() || (String(item.name||'').toLowerCase().endsWith('.pdf')?'application/pdf':'image/jpeg');
    const card=makeCard({name:item.name||'Anexo',mime,path:item.path});
    setBusy(1);
    try{
      const url=await window.BPMA_RFA.signedFileUrl(item.path,7200);
      card._signedUrl=url;
      if(mime==='application/pdf'){
        const pages=await renderPdfUrl(url);
        card._printPages=pages;
        if(pages[0])setCardPreview(card,pages[0],pages.length);
      }else{
        card._printPages=[url];
        setCardPreview(card,url,1);
      }
      rebuildPrintPages();
    }catch(err){
      const kind=$('.annex-kind',card);
      if(kind)kind.textContent='Anexo temporariamente indisponível';
      console.warn(err);
    }finally{setBusy(-1)}
  }

  async function restore(items){
    clear(false);
    for(const item of (items||[])) await buildStored(item);
    rebuildPrintPages();
  }

  function captureState(){
    return $$('.annex-item','#annexList').map(card=>({
      path:card.dataset.storagePath||'',
      mime:card.dataset.mimeType||'',
      name:card.dataset.originalName||'Anexo'
    })).filter(x=>x.path);
  }

  async function syncUploads(reportId){
    for(const card of $$('.annex-item','#annexList')){
      if(card.dataset.storagePath || !card._file)continue;
      const saved=await window.BPMA_RFA.uploadDocument(reportId,card._file);
      card.dataset.storagePath=saved.path;
      card.dataset.mimeType=saved.mime;
      card.dataset.originalName=saved.name;
      card._file=null;
    }
  }

  function desiredPaths(){ return captureState().map(x=>x.path).filter(Boolean); }

  function clear(notify=true){
    const list=$('#annexList'); if(list)list.innerHTML='';
    const print=$('#annexPrintPages'); if(print)print.innerHTML='';
    updateStatus();
    if(notify)emitChange();
  }

  function bind(){
    const files=$('#annexFileInput');
    $('#annexFileBtn')?.addEventListener('click',()=>files?.click());
    files?.addEventListener('change',async()=>{
      await addFiles(files.files);
      files.value='';
    });
    $('#annexList')?.addEventListener('click',e=>{
      const btn=e.target.closest('.annex-remove'); if(!btn)return;
      btn.closest('.annex-item')?.remove();
      rebuildPrintPages(); updateStatus(); emitChange();
    });
    updateStatus();
  }

  function setReadonly(readonly){
    $$('#annexManager button, #annexManager input').forEach(el=>el.disabled=!!readonly);
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.BPMA_RFA_ANNEX={
    addFiles,restore,captureState,syncUploads,desiredPaths,clear,
    rebuildPrintPages,isBusy,setReadonly
  };
})();
