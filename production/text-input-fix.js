(() => {
  /* BPMA 3.9.3.3 — colagem segura em todos os relatórios.
     Mantém espaços/parágrafos e remove apenas caracteres invisíveis problemáticos. */
  function cleanClipboardText(raw){
    return String(raw??'')
      .replace(/\r\n?/g,'\n')
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g,'')
      .replace(/\u00A0/g,' ');
  }
  function insertText(el,text){
    const start=Number.isFinite(el.selectionStart)?el.selectionStart:el.value.length;
    const end=Number.isFinite(el.selectionEnd)?el.selectionEnd:start;
    const before=el.value.slice(0,start), after=el.value.slice(end);
    el.value=before+text+after;
    const pos=start+text.length;
    try{el.setSelectionRange(pos,pos)}catch{}
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  }
  document.addEventListener('paste',e=>{
    const el=e.target?.closest?.('textarea,input[type="text"],input:not([type])');
    if(!el || el.readOnly || el.disabled) return;
    const clip=e.clipboardData?.getData('text/plain');
    if(typeof clip!=='string') return;
    e.preventDefault();
    insertText(el,cleanClipboardText(clip));
  },true);
  window.BPMA_TEXT_INPUT={cleanClipboardText};
})();
