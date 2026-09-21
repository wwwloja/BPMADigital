(() => {
  const PDFJS_URL='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const PDFJS_WORKER='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  let pdfPromise=null,busy=0;
  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const mimeOf=f=>String(f?.type||'').toLowerCase() || (String(f?.name||'').toLowerCase().endsWith('.pdf')?'application/pdf':'image/jpeg');
  const accepted=f=>mimeOf(f)==='application/pdf'||mimeOf(f).startsWith('image/');
  const safe=s=>String(s||'').replace(/[<>]/g,'');
  function update(){const cards=$$('.final-annex-item',$('#finalAnnexList'));const s=$('#finalAnnexStatus');if(s)s.textContent=busy?'Processando anexo final...':(!cards.length?'Nenhum anexo final adicionado.':`${cards.length} arquivo${cards.length===1?'':'s'} no final do PDF.`);}
  function setBusy(n){busy=Math.max(0,busy+n);update()}
  function isBusy(){return busy>0}
  function ensurePdfJs(){if(window.pdfjsLib){window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;return Promise.resolve(window.pdfjsLib)}if(pdfPromise)return pdfPromise;pdfPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=PDFJS_URL;s.async=true;s.crossOrigin='anonymous';s.onload=()=>{if(!window.pdfjsLib)return reject(new Error('Leitor de PDF não foi carregado.'));window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;resolve(window.pdfjsLib)};s.onerror=()=>reject(new Error('Não foi possível carregar o leitor de PDF. Verifique a internet.'));document.head.appendChild(s)});return pdfPromise}
  const readDataUrl=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(new Error('Não foi possível ler a imagem.'));r.readAsDataURL(file)});
  async function renderPdf(file){const lib=await ensurePdfJs();const doc=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;const out=[];for(let n=1;n<=doc.numPages;n++){const page=await doc.getPage(n),base=page.getViewport({scale:1}),scale=Math.min(2.2,Math.max(1.25,1500/base.width)),vp=page.getViewport({scale}),c=document.createElement('canvas');c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);const ctx=c.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);await page.render({canvasContext:ctx,viewport:vp}).promise;out.push(c.toDataURL('image/jpeg',.94));c.width=c.height=1}try{await doc.destroy()}catch{}return out}
  function cloneHeader(){const h=$('.page > header.topbar');return h?h.cloneNode(true):document.createElement('header')}
  function rebuildPrintPages(){const target=$('#finalAnnexPrintPages');if(!target)return;target.innerHTML='';$$('.final-annex-item',$('#finalAnnexList')).forEach((card,i)=>{(card._printPages||[]).forEach((src,j)=>{const sheet=document.createElement('section');sheet.className='final-annex-print-sheet';const header=cloneHeader();const title=document.createElement('div');title.className='final-annex-document-title';title.textContent=`ANEXO AO RFA${card.dataset.originalName?' — '+card.dataset.originalName:''}`;const body=document.createElement('div');body.className='final-annex-document-body';const img=document.createElement('img');img.src=src;img.alt='Anexo ao final do RFA';body.appendChild(img);sheet.append(header,title,body);target.appendChild(sheet)})})}
  function makeCard(file){const mime=mimeOf(file),card=document.createElement('div');card.className='final-annex-item';card.dataset.originalName=file.name||'Anexo';card.dataset.mimeType=mime;card._printPages=[];card.innerHTML=`<div class="final-annex-thumb"><span class="final-annex-placeholder">${mime==='application/pdf'?'PDF':'IMG'}</span></div><div class="final-annex-info"><b>${safe(file.name||'Anexo')}</b><span>${mime==='application/pdf'?'PDF':'Imagem'} · preparando...</span></div><button type="button" class="btn danger final-annex-remove">Excluir</button>`;$('#finalAnnexList')?.appendChild(card);update();return card}
  function preview(card,src,count){const t=$('.final-annex-thumb',card);if(t){t.innerHTML='';const i=document.createElement('img');i.src=src;t.appendChild(i)}const s=$('.final-annex-info span',card);if(s)s.textContent=card.dataset.mimeType==='application/pdf'?`PDF · ${count} página${count===1?'':'s'}`:'Imagem · 1 página'}
  async function addFile(file){if(!accepted(file)){alert(`Arquivo não aceito: ${file.name||'sem nome'}. Use PDF ou imagem.`);return}const card=makeCard(file);setBusy(1);try{if(mimeOf(file)==='application/pdf'){card._printPages=await renderPdf(file)}else{card._printPages=[await readDataUrl(file)]}if(card._printPages[0])preview(card,card._printPages[0],card._printPages.length);rebuildPrintPages()}catch(e){card.remove();rebuildPrintPages();alert(e.message||'Não foi possível processar o anexo final.')}finally{setBusy(-1)}}
  async function addFiles(files){for(const f of Array.from(files||[]))await addFile(f)}
  function clear(){const l=$('#finalAnnexList'),p=$('#finalAnnexPrintPages');if(l)l.innerHTML='';if(p)p.innerHTML='';update()}
  function bind(){const input=$('#finalAnnexFileInput');$('#finalAnnexFileBtn')?.addEventListener('click',()=>input?.click());input?.addEventListener('change',async()=>{await addFiles(input.files);input.value=''});$('#finalAnnexList')?.addEventListener('click',e=>{const b=e.target.closest('.final-annex-remove');if(!b)return;b.closest('.final-annex-item')?.remove();rebuildPrintPages();update()});update()}
  document.addEventListener('DOMContentLoaded',bind);
  function getPages(){
    const pages=[];
    $$('.final-annex-item',$('#finalAnnexList')).forEach(card=>{
      (card._printPages||[]).forEach((src,index)=>pages.push({
        src,
        name:card.dataset.originalName||'Anexo',
        index:index+1,
        total:(card._printPages||[]).length
      }));
    });
    return pages;
  }
  window.BPMA_RFA_FINAL_ANNEX={addFiles,clear,rebuildPrintPages,isBusy,getPages};
})();
