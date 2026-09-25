/* BO 3.9.6: cópia textual e paginação isoladas do editor responsivo. */
(() => {
  const printCss=`
    @page{size:A4;margin:7mm}*{box-sizing:border-box}
    html,body{margin:0;padding:0;background:white;color:black;font:10pt Arial,Helvetica,sans-serif;line-height:1.16}
    .bo-page{width:196mm;min-height:0;margin:0;padding:0;overflow:visible;background:white;break-after:page}
    .bo-page:last-child{break-after:auto}
    table.form{border-collapse:collapse;table-layout:fixed;width:100%;margin:0}
    td,th{border:1px solid #444;padding:2px 3px;vertical-align:top;overflow-wrap:anywhere}
    .header-table td{height:64px;vertical-align:middle;text-align:center}
    .pm-logo{width:68px;max-height:68px;object-fit:contain;display:block;margin:auto}
    .pm-logo.gov-logo{width:120px;max-width:100%;max-height:56px}
    .head-title{font-weight:900;font-size:13pt;line-height:1.05}
    .head-sub{font-weight:700;font-size:8pt;margin-top:4px}
    .section-title{background:#e6e6e6;text-align:center;font-size:10.5pt;font-weight:800}
    .lbl{display:block;font-size:8pt;font-weight:700;margin-bottom:2px;line-height:1.1}
    .bo-value{display:block;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;min-height:14px;font-size:10pt;line-height:1.2}
    .bo-check{display:inline;font-size:11pt;margin-right:4px}
    .subcard{margin:0 0 3px;padding:0;border:0}
    .subcard-head{background:#efefef;font-weight:700;font-size:9pt;padding:3px 4px}
    .empty-note{border:1px solid #444;text-align:center;padding:4px;font-weight:700;margin-bottom:3px}
    .checks{font-size:9pt;line-height:1.4}
    .sig-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:16px 0 10px}
    .sig-card{min-width:0;text-align:center}.sig-role{font-weight:700;font-size:8.5pt}
    .sig-person{font-size:8pt;min-height:36px;padding:3px}.sig-person b,.sig-person span{display:block}
    .sig-preview{height:54px;border-bottom:1px solid black;display:flex;align-items:center;justify-content:center}
    .sig-preview img{max-width:100%;max-height:52px;object-fit:contain}
    .signature-empty{grid-column:1/-1}.receipt-line{padding:7px 3px;font-size:9pt}
    .receipt-grid{display:grid;grid-template-columns:2fr .75fr 1.45fr;gap:10px;border-top:1px solid #444;padding:8px 3px;font-size:9pt}
    .manual-line{display:inline-block;border-bottom:1px solid black;min-width:30px;height:16px}
    .hidden,.no-print,.controls,.sig-actions,.signature-help,button{display:none!important}
    .bo-page *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  `;
  function copyForm(){
    const source=document.querySelector('#view-bo #boForm');
    if(!source)throw new Error('Formulário do BO não encontrado.');
    const clone=source.cloneNode(true);
    const originals=source.querySelectorAll('input,select,textarea');
    clone.querySelectorAll('input,select,textarea').forEach((field,i)=>{
      const original=originals[i];
      const value=document.createElement('div');
      value.className='bo-value';
      if(original.type==='checkbox'||original.type==='radio'){
        value.className='bo-check';value.textContent=original.checked?'☒':'☐';
      }else{
        value.textContent=original.tagName==='SELECT' ? (original.selectedOptions[0]?.textContent||'') : original.value;
      }
      field.replaceWith(value);
    });
    clone.querySelectorAll('.print-render,.no-print,.controls,.sig-actions,.signature-help,.hidden,button,script').forEach(el=>el.remove());
    clone.querySelectorAll('[style]').forEach(el=>{
      if(el.style.display==='none'){el.remove();return}
      ['height','min-height','max-height','overflow','transform','position'].forEach(p=>el.style.removeProperty(p));
    });
    const images=source.querySelectorAll('img');
    clone.querySelectorAll('img').forEach(img=>{
      const original=Array.from(images).find(x=>x.getAttribute('src')===img.getAttribute('src'));
      img.src=original?.src||new URL(img.getAttribute('src'),location.href).href;
    });
    return clone;
  }
  async function buildPages(){
    const clone=copyForm();
    const frame=document.createElement('iframe');
    frame.title='Documento de impressão do BO';
    frame.setAttribute('aria-hidden','true');
    frame.style.cssText='position:fixed;left:0;top:0;width:810px;height:1123px;border:0;z-index:-100;pointer-events:none';
    document.body.appendChild(frame);
    const doc=frame.contentDocument;
    try{
      const style=doc.createElement('style');style.textContent=printCss;doc.head.appendChild(style);
      const staging=doc.createElement('div');staging.style.width='196mm';doc.body.appendChild(staging);staging.appendChild(doc.importNode(clone,true));
      await Promise.all(Array.from(staging.querySelectorAll('img'),img=>img.complete?Promise.resolve():new Promise((resolve,reject)=>{
        const timeout=setTimeout(()=>reject(new Error('Uma imagem do BO não carregou. Tente novamente.')),10000);
        img.onload=()=>{clearTimeout(timeout);resolve()};img.onerror=()=>{clearTimeout(timeout);reject(new Error('Não foi possível carregar uma imagem do BO.'))};
      })));
      const tokens=[];
      for(const child of Array.from(staging.firstChild.children)){
        // Listas dinâmicas: cada pessoa/arma é um bloco independente.
        if(child.children.length && Array.from(child.children).every(x=>x.classList.contains('subcard')))tokens.push(...Array.from(child.children));
        else if(child.textContent.trim()||child.querySelector('img'))tokens.push(child);
      }
      const maxHeight=282*96/25.4;
      // Um título de seção acompanha o primeiro bloco, inclusive nas continuações.
      for(let i=0;i<tokens.length-1;i++){
        if(tokens[i].tagName==='TABLE' && tokens[i].querySelector('.section-title') && !tokens[i+1].querySelector('.section-title')){
          const group=doc.createElement('div');group.append(tokens[i],tokens[i+1]);tokens.splice(i,2,group);
        }
      }
      const pages=[];let page;
      function newPage(){page=doc.createElement('section');page.className='bo-page';doc.body.appendChild(page);pages.push(page)}
      function fits(node){page.appendChild(node);const fit=page.getBoundingClientRect().height<=maxHeight;node.remove();return fit}
      newPage();
      for(const token of tokens){
        let block=token.cloneNode(true);
        if(fits(block)){page.appendChild(block);continue}
        if(page.children.length)newPage();
        if(fits(block)){page.appendChild(block);continue}
        // Um relato ou campo longo é dividido em cópias de continuação,
        // medindo a altura real. Nenhum pixel ou linha de texto é cortado.
        let remaining=Array.from(block.querySelectorAll('.bo-value'),el=>el.textContent);
        if(!remaining.some(Boolean))throw new Error('Um bloco do BO excede a folha A4. Revise as imagens ou assinaturas.');
        while(remaining.some(Boolean)){
          let low=1,high=Math.max(...remaining.map(s=>s.length)),best=0;
          const candidate=n=>{const c=block.cloneNode(true);c.querySelectorAll('.bo-value').forEach((v,i)=>v.textContent=remaining[i].slice(0,n));return c};
          while(low<=high){const n=Math.floor((low+high)/2);if(fits(candidate(n))){best=n;low=n+1}else high=n-1}
          if(!best)throw new Error('Não foi possível paginar um campo do BO.');
          // Prefere a quebra em espaço ou nova linha, sem descartar caracteres.
          if(best<Math.max(...remaining.map(s=>s.length))){
            const longest=remaining.reduce((a,b)=>a.length>b.length?a:b,'');
            const boundary=Math.max(longest.lastIndexOf(' ',best-1),longest.lastIndexOf('\n',best-1));
            if(boundary>best*.8)best=boundary+1;
          }
          const part=candidate(best);page.appendChild(part);
          remaining=remaining.map(s=>s.slice(best));
          if(remaining.some(Boolean))newPage();
        }
      }
      staging.remove();
      return {frame,pages,dispose:()=>frame.remove()};
    }catch(err){frame.remove();throw err}
  }
  async function nativePrint(){
    let job;
    try{
      job=await buildPages();const win=job.frame.contentWindow;
      win.addEventListener('afterprint',job.dispose,{once:true});
      win.focus();win.print();setTimeout(job.dispose,120000);
    }catch(err){job?.dispose();alert(err.message||'Não foi possível preparar o BO.');}
  }
  window.BPMA_BO_PDF={buildPages,nativePrint};
})();
