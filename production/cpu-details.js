/* BPMA Digital 4.0.39: autocomplete nos campos originais; painel flutuante não impresso. */
(() => {
'use strict';
const catalog={
 animais:['Azulão','Bicho-preguiça','Calango (não especificado)','Canário-da-terra','Carcará','Cágado (não especificado)','Cobra (não identificada)','Cobra-coral','Cobra-verde','Coleirinho','Corre-campo','Coruja (não especificada)','Galo-de-campina','Gavião (não especificado)','Iguana','Jabuti (não especificado)','Jacaré (não especificado)','Jiboia','Morcego (não especificado)','Papa-capim (não especificado)','Papagaio (não especificado)','Periquito (não especificado)','Raposa (não especificada)','Sabiá (não especificado)','Sagui (não especificado)','Salamanta','Tamanduá (não especificado)','Tatu (não especificado)','Teiú','Timbu / gambá','Não identificado','Outros'],
 armas:['Pistola','Revólver','Espingarda','Carabina','Rifle','Arma artesanal','Outros'],
 calibres:['.22','.32','.38','.380','9 mm','.40','.45','.357','12','16','20','28','32','36','.44','5,56 mm','7,62 mm','Não identificado','Outros'],
 veiculos:['Automóvel','Caminhão','Caminhonete','Carroça','Caçamba','Embarcação','Escavadeira','Motocicleta','Quadriciclo','Reboque','Retroescavadeira','Trator','Outros'],
 materiais:['Alçapão','Anzol','Armadilha','Areia','Caixa de som','Carvão vegetal','Equipamento de som','Facão','Gaiola','Gerador','Lenha','Linha de pesca','Machado','Madeira','Motosserra','Pedra','Rede de pesca','Tarrafa','Viveiro','Outros']
};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[-–—]/g,' ').replace(/\s+/g,' ').trim();
const qty=v=>Math.max(0,Number(v)||0),uid=()=>crypto.randomUUID();
const original=(row,sel)=>row?[...row.querySelectorAll(sel)].filter(x=>!x.closest('.bpma-data-tools')):[];
const rows=id=>[...document.querySelectorAll('#'+id+' tr')];
const rowId=row=>row.dataset.row37||(row.dataset.row37=uid());
function parse(v,fallback=[]){try{const data=JSON.parse(v||'');return Array.isArray(data)?data:fallback}catch{return fallback}}
function guarnicoes(){
 const map=new Map();
 rows('recursosBody').forEach(row=>{
  const fields=original(row,'input,textarea'),vtr=String(fields[0]?.value||'').trim();if(!vtr)return;
  [[1,'Diurno'],[4,'Noturno']].forEach(([i,periodo])=>{
   const autuante=String(fields[i]?.value||'').split(/\r?\n/).map(x=>x.trim()).find(Boolean);if(!autuante)return;
   const id=norm(vtr)+'|'+norm(autuante),alias=rowId(row)+'-'+periodo;
   if(map.has(id))map.get(id).aliases.push(alias);
   else map.set(id,{id,vtr,autuante,texto:vtr+' / '+autuante,aliases:[alias]});
  });
 });return [...map.values()];
}
function format(x){return `${new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3}).format(qty(x.quantidade))} ${x.unidade||'un.'} ${x.nome}${x.calibre?' — calibre '+x.calibre:''}${x.identificacao?' — '+x.identificacao:''}`;}
function reconcile(items,text){
 const lines=String(text||'').split('\n'),used=new Set();
 return items.filter(item=>{const i=lines.findIndex((line,index)=>!used.has(index)&&line.trim()===(item.linha||format(item)).trim());if(i<0)return false;used.add(i);return true});
}
function itemData(field){return reconcile(parse(field?.dataset.items38),field?.value||'');}
function lineIndex(items,item,text){
 const lines=String(text||'').split('\n'),used=new Set();
 for(const x of items){const i=lines.findIndex((line,index)=>!used.has(index)&&line.trim()===(x.linha||format(x)).trim());if(i>=0){used.add(i);if(x.id===item.id)return i}}
 return -1;
}
function editable(field){return field&&!field.disabled&&!field.readOnly;}
function emit(field){field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));}
let guTimer;
let internal=false,active=null,popup=null,suggestions=[],highlight=-1,editing=null,query='';
function write(field,value){internal=true;field.value=value;emit(field);internal=false;}
function animalRows(){return rows('animalBody').map(row=>({id:rowId(row),row,nome:original(row.cells[4],'textarea')[0]?.value.trim()||'',quantidade:qty(original(row,'input[type="number"]')[0]?.value)}));}
function classify(field){
 const row=field.closest('tr'),cell=field.closest('td');if(!row||!cell)return '';
 if(row.closest('#procBody'))return cell.cellIndex===0?'gu':cell.cellIndex===3?'proc':'';
 if(row.closest('#animalBody'))return cell.cellIndex===2?'gu':cell.cellIndex===4?'animal':'';
 if(row.closest('#tblObjetosPreview')&&row.parentElement.children[0]===row&&cell.cellIndex===1)return 'arma';
 if(row.closest('#tblVeiculosObjetosPreview')&&row.parentElement.children[0]===row&&(cell.cellIndex===1||cell.cellIndex===2))return 'veiculo';
 return '';
}
function ensurePopup(){
 if(popup)return popup;
 popup=document.createElement('div');popup.id='bpma38-popup';popup.className='bpma-data-tools no-print';popup.hidden=true;document.body.appendChild(popup);return popup;
}
function position(){
 if(!active||!popup)return;
 const viewport=window.visualViewport;
 if(window.innerWidth<=720){const h=viewport?.height||innerHeight;popup.style.width=(innerWidth-12)+'px';popup.style.left='6px';popup.style.maxHeight=Math.max(150,h-16)+'px';popup.style.top=((viewport?.offsetTop||0)+Math.max(8,h-Math.min(popup.scrollHeight,h-16)))+'px';return;}
 const r=active.getBoundingClientRect(),width=Math.min(420,window.innerWidth-16),height=Math.min(430,window.innerHeight-24);
 popup.style.width=width+'px';popup.style.maxHeight=height+'px';
 popup.style.left=Math.max(8,Math.min(r.left,window.innerWidth-width-8))+'px';
 const top=r.bottom+3;popup.style.top=Math.max(8,top+Math.min(popup.scrollHeight,height)>window.innerHeight-8?r.top-Math.min(popup.scrollHeight,height)-3:top)+'px';
}
function close(){if(active)active.setAttribute('aria-expanded','false');active=null;editing=null;if(popup)popup.hidden=true;}
function chooseList(field){
 const kind=field.dataset.kind38;
 if(kind==='gu')return guarnicoes().map(x=>({...x,nome:x.texto,tipo:'gu'}));
 if(kind==='animal')return catalog.animais.map(nome=>({nome,tipo:'Animais'}));
 if(kind==='arma')return catalog.armas.map(nome=>({nome,tipo:'Armas'}));
 if(kind==='veiculo')return catalog.veiculos.map(nome=>({nome,tipo:'Veículos'}));
 return [['Animais',catalog.animais],['Veículos',catalog.veiculos],['Materiais',catalog.materiais]].flatMap(([tipo,names])=>names.map(nome=>({nome,tipo})));
}
function recentKey(){let user='local';try{user=JSON.parse(sessionStorage.getItem('bpma_local_session_v1')||'{}').id||user}catch{}return 'bpma_sugestoes39_'+user;}
function recentNames(){try{return JSON.parse(localStorage.getItem(recentKey())||'[]')}catch{return []}}
function remember(name){try{localStorage.setItem(recentKey(),JSON.stringify([name,...recentNames().filter(x=>x!==name)].slice(0,12)))}catch{}}
function draw(){
 if(!active||!editable(active)){close();return;}
 ensurePopup();popup.hidden=false;active.setAttribute('aria-expanded','true');highlight=-1;
 const kind=active.dataset.kind38,items=itemData(active),term=norm(query);
 const recent=recentNames();suggestions=chooseList(active).filter(x=>norm(x.nome).includes(term)||norm(x.tipo).includes(term)).sort((a,b)=>{if(term)return Number(norm(b.nome).startsWith(term))-Number(norm(a.nome).startsWith(term));const ai=recent.indexOf(a.nome),bi=recent.indexOf(b.nome);return (ai<0?999:ai)-(bi<0?999:bi)});
 popup.innerHTML=`<div class="bpma38-caption">${kind==='gu'?'Guarnições do quadro 1':kind==='animal'?'Escolha o animal':'Adicionar item'}<button type="button" data-close38 aria-label="Fechar">×</button></div><input type="search" data-search39 value="${esc(query)}" placeholder="Buscar nas sugestões…" aria-label="Buscar nas sugestões" style="width:100%;padding:10px;margin:7px 0;border:1px solid #cedcd4;border-radius:6px"><small class="bpma38-hint">Selecione ou use Incluir outro. Você também pode escrever no campo do relatório.</small>${items.length?`<div class="bpma38-managed">${items.map(x=>`<div><span>${esc(x.linha||format(x))}</span><button type="button" data-edit38="${esc(x.id)}" aria-label="Editar ${esc(x.nome)}">Editar</button><button type="button" data-remove38="${esc(x.id)}" aria-label="Excluir ${esc(x.nome)}">×</button></div>`).join('')}</div>`:''}<div class="bpma38-options" role="listbox">${suggestions.map((x,i)=>`<button type="button" role="option" data-choice38="${i}">${esc(x.nome)}${kind==='proc'?`<small>${esc(x.tipo)}</small>`:''}</button>`).join('')||'<small>Nenhum item encontrado. Escolha “Incluir outro”.</small>'}</div><button type="button" data-other38>+ Incluir outro</button>`;
 position();
}
function open(field,reset=true){if(!editable(field))return;active=field;query=reset?'':query;editing=null;draw();}
function currentLine(field){const text=field.value,pos=field.selectionStart??text.length,start=text.lastIndexOf('\n',pos-1)+1,end=text.indexOf('\n',pos);return {start,end:end<0?text.length:end,text:text.slice(start,end<0?text.length:end)};}
function replaceQuery(field,value,replaceAll=false){
 if(replaceAll){write(field,value);return;}
 const line=currentLine(field);
 const isProvisional=query&&norm(line.text)===norm(query)&&!itemData(field).some(x=>(x.linha||format(x))===line.text);
 const next=isProvisional?field.value.slice(0,line.start)+value+field.value.slice(line.end):[field.value.trim(),value].filter(Boolean).join('\n');write(field,next);
}
function form(item){
 if(!active||!editable(active))return;
 editing=item.id?item:null;
 const kind=active.dataset.kind38;
 if(kind==='gu'&&item.tipo==='gu'){active.dataset.gu38=item.id;active.dataset.guSource38=item.aliases[0];write(active,item.texto);close();return;}
 const type=item.tipo||(kind==='arma'?'Armas':kind==='veiculo'?'Veículos':'Animais');
 const name=item.nome==='Outros'?'':item.nome;
 const opts=(values,current)=>values.map(x=>`<option ${x===current?'selected':''}>${esc(x)}</option>`).join('');
 popup.innerHTML=`<div class="bpma38-caption">${editing?'Editar item':'Confirmar item'}<button type="button" data-close38 aria-label="Fechar">×</button></div><form id="bpma38-form"><label>Descrição<input name="nome" value="${esc(name)}" required autocomplete="off"></label>${kind==='proc'?`<label>Categoria<select name="tipo">${opts(['Animais','Veículos','Materiais'],type)}</select></label>`:`<input type="hidden" name="tipo" value="${esc(type)}">`}${kind==='animal'?`<label>Quantidade<input name="animalQuantidade" type="number" inputmode="numeric" min="1" max="999" step="1" value="${original(active.closest('tr'),'input[type=number]')[0]?.value>0?original(active.closest('tr'),'input[type=number]')[0].value:1}" required></label>`:''}${kind==='gu'||kind==='animal'?'':`<div class="bpma38-inline"><label>Quantidade<input name="quantidade" type="number" min="0.001" step="any" value="${esc(item.quantidade||1)}" required></label><label>Unidade<select name="unidade">${opts(['un.','kg','m³','L','m'],item.unidade||'un.')}</select></label></div>${kind==='arma'?`<label>Calibre<input name="calibre" list="bpma38-calibres" value="${esc(item.calibre||'')}" required><datalist id="bpma38-calibres">${catalog.calibres.map(x=>`<option value="${esc(x)}"></option>`).join('')}</datalist></label>`:''}<label>Identificação / observação<input name="identificacao" value="${esc(item.identificacao||'')}"></label>${kind==='proc'?`<label data-link38-wrap>Animal já registrado<select name="vinculo"><option value="">Ainda não registrado</option>${animalRows().filter(x=>x.nome&&x.quantidade>0).map(x=>`<option value="${esc(x.id)}" ${item.vinculo===x.id?'selected':''}>${esc(x.nome)} · ${x.quantidade}</option>`).join('')}</select></label><label data-counted38-wrap><input type="checkbox" name="jaContado" ${item.jaContado?'checked':''}>Veículo já contado na ordem pública</label>`:''}`}<div class="bpma38-formactions"><button type="button" data-back38>Voltar</button><button type="submit">${editing?'Salvar alteração':'Adicionar'}</button></div><small role="status" id="bpma38-error"></small></form>`;
 formVisibility();position();popup.querySelector('[name="nome"]')?.focus();
}
function formVisibility(){
 const f=popup?.querySelector('form');if(!f)return;const type=f.elements.tipo?.value;
 const unit=f.elements.unidade;if(unit){unit.disabled=type!=='Materiais';if(type!=='Materiais')unit.value='un.';}
 const q=f.elements.quantidade;if(q){q.step=type==='Materiais'?'any':'1';q.min=type==='Materiais'?'0':'1';}
 const link=f.querySelector('[data-link38-wrap]');if(link)link.hidden=type!=='Animais';
 const counted=f.querySelector('[data-counted38-wrap]');if(counted)counted.hidden=type!=='Veículos';
}
function syncTotal(field,oldItems,newItems){
 if(field.dataset.kind38!=='arma')return;
 const total=original(field.closest('tr'),'input')[0];if(!total)return;
 const sum=a=>a.reduce((n,x)=>n+qty(x.quantidade),0);write(total,Math.max(0,qty(total.value)-sum(oldItems)+sum(newItems)));
}
function commit(field,entry,oldId){
 const oldItems=itemData(field);
 if(!oldId){const duplicate=oldItems.find(x=>x.tipo===entry.tipo&&norm(x.nome)===norm(entry.nome)&&x.calibre===entry.calibre&&x.unidade===entry.unidade&&x.identificacao===entry.identificacao&&x.vinculo===entry.vinculo&&x.jaContado===entry.jaContado);if(duplicate&&!entry.vinculo&&confirm('Este item já está na lista. Somar a quantidade?')){oldId=duplicate.id;entry.id=duplicate.id;entry.quantidade+=qty(duplicate.quantidade);}}
 const old=oldItems.find(x=>x.id===oldId),next=oldItems.filter(x=>x.id!==oldId);
 const lines=field.value.split('\n');entry.linha=format(entry);
 if(old){const index=lineIndex(oldItems,old,field.value);if(index>=0)lines[index]=entry.linha;write(field,lines.join('\n'));}
 else replaceQuery(field,entry.linha);
 next.push(entry);field.dataset.items38=JSON.stringify(next);syncTotal(field,oldItems,next);emit(field);
}
function remove(field,id){
 if(!editable(field))return;
 const items=itemData(field),item=items.find(x=>x.id===id);if(!item)return;
 const index=lineIndex(items,item,field.value),lines=field.value.split('\n');if(index>=0)lines.splice(index,1);
 const next=items.filter(x=>x.id!==id);field.dataset.items38=JSON.stringify(next);write(field,lines.join('\n'));syncTotal(field,items,next);draw();
}
function clear(field){
 if(!editable(field))return;
 const items=itemData(field);delete field.dataset.items38;delete field.dataset.gu38;delete field.dataset.guSource38;delete field.closest('tr').dataset.gu37;
 write(field,'');syncTotal(field,items,[]);
 if(field.dataset.kind38==='animal'){const q=original(field.closest('tr'),'input[type="number"]')[0];if(q)write(q,'0');}
 close();
}
function findGu(field){if(!field)return null;const key=field.dataset.gu38||field.closest('tr')?.dataset.gu37,source=field.dataset.guSource38;return guarnicoes().find(x=>x.id===key||x.aliases.includes(key)||x.aliases.includes(source));}
function refreshGU(){
 document.querySelectorAll('.bpma38-source[data-kind38="gu"]').forEach(field=>{
  const gu=findGu(field);if(!gu||!editable(field))return;
  field.dataset.gu38=gu.id;field.dataset.guSource38=field.dataset.guSource38||gu.aliases[0];if(field.value!==gu.texto)write(field,gu.texto);
 });
}
function migrate(field){
 if(field.dataset.items38)return;
 const kind=field.dataset.kind38,row=field.closest('tr');let data=[];
 if(kind==='proc'&&field.value===row.dataset.procText37)data=parse(row.dataset.proc37);
 if((kind==='arma'||kind==='veiculo')&&field.value===field.dataset.detailText36)data=parse(field.dataset.detail36).map(x=>({...x,tipo:kind==='arma'?'Armas':'Veículos',unidade:'un.',identificacao:x.placa||''}));
 if(data.length){
  // A linha impressa antiga é preservada; não se reescreve o texto para migrar o detalhe.
  const lines=field.value.split('\n'),taken=new Set();
  data=data.map(x=>{const amounts=[String(x.quantidade),new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3}).format(qty(x.quantidade))];
   const prefixes=amounts.flatMap(q=>[q+' '+x.nome,q+' '+(x.unidade||'un.')+' '+x.nome]);
   const i=lines.findIndex((line,index)=>!taken.has(index)&&prefixes.some(prefix=>line.startsWith(prefix)));if(i<0)return null;taken.add(i);return {...x,id:x.id||uid(),linha:lines[i]};}).filter(Boolean);
  field.dataset.items38=JSON.stringify(data);
 }
}
function enhance(){
 // Remove todos os formulários auxiliares antigos; o painel agora fica fora da tabela.
 document.querySelectorAll('.bpma-data-tools:not(.bpma38-toolbar):not(#bpma38-popup):not(.cpu39-nav):not(.cpu39-recovery)').forEach(el=>el.remove());
 document.querySelectorAll('#procBody textarea,#animalBody textarea,#tblObjetosPreview textarea,#tblVeiculosObjetosPreview textarea').forEach(field=>{
  const kind=classify(field);if(!kind)return;field.dataset.kind38=kind;field.classList.add('bpma38-source');field.setAttribute('aria-autocomplete','list');field.setAttribute('aria-expanded','false');
  migrate(field);
  if(!field.parentElement.classList.contains('bpma38-field')){
   const wrap=document.createElement('div');wrap.className='bpma38-field';field.parentElement.insertBefore(wrap,field);wrap.appendChild(field);
   const tools=document.createElement('div');tools.className='bpma-data-tools bpma38-toolbar no-print';tools.innerHTML='<button type="button" data-open38 title="Selecionar ou adicionar" aria-label="Selecionar ou adicionar">+</button><button type="button" data-clear38 title="Limpar campo" aria-label="Limpar campo">×</button>';wrap.appendChild(tools);
  }
 });refreshGU();
}
function location(field){const row=field.closest('tr'),body=row?.parentElement,table=field.closest('table');return {table:table?.id,row:[...body.children].indexOf(row),cell:field.closest('td').cellIndex,kind:field.dataset.kind38};}
function locate(x){const table=document.getElementById(x.table),row=table?.querySelectorAll('tbody tr')[x.row];return row?original(row.cells[x.cell],'textarea')[0]:null;}
function capture38(){return [...document.querySelectorAll('.bpma38-source')].map(field=>({...location(field),items:itemData(field),gu:field.dataset.gu38||'',guSource:field.dataset.guSource38||''}));}
function restore38(data){
 close();document.querySelectorAll('.bpma38-source').forEach(f=>{delete f.dataset.items38;delete f.dataset.gu38;delete f.dataset.guSource38});
 if(Array.isArray(data))data.forEach(x=>{const f=locate(x);if(f){f.dataset.items38=JSON.stringify(x.items||[]);f.dataset.gu38=x.gu||'';f.dataset.guSource38=x.guSource||'';}});
 enhance();
}
function capture(){return [];} // A partir de 4.0.39 o detalhe completo usa capture38.
function capture37(){return {};}
function restore(data){
 document.querySelectorAll('[data-detail36]').forEach(f=>{delete f.dataset.detail36;delete f.dataset.detailText36});
 (Array.isArray(data)?data:[]).forEach(x=>{const cell=document.getElementById(x.id)?.querySelector('tbody tr')?.cells[x.cell],field=cell&&original(cell,'textarea')[0];if(field){field.dataset.detail36=JSON.stringify(x.entries||[]);field.dataset.detailText36=x.text||'';}});
}
function restore37(data){
 ['procBody','animalBody'].forEach(id=>rows(id).forEach(row=>{delete row.dataset.gu37;delete row.dataset.proc37;delete row.dataset.procText37}));
 (data?.proc||[]).forEach((x,i)=>{const row=rows('procBody')[i];if(row){row.dataset.row37=x.id;row.dataset.gu37=x.gu||'';row.dataset.proc37=JSON.stringify(x.entries||[]);row.dataset.procText37=x.text||'';}});
 (data?.animal||[]).forEach((x,i)=>{const row=rows('animalBody')[i];if(row){row.dataset.row37=x.id;row.dataset.gu37=x.gu||'';}});
}
function stats(){
 const animals=animalRows(),animais=animals.filter(x=>x.quantidade>0).map(x=>({nome:x.nome||'Não informado',quantidade:x.quantidade,origem:original(x.row,'select')[0]?.value||'Não informada',destino:original(x.row.cells[6],'textarea')[0]?.value.trim()||'Não informado'}));
 const data={version:3,animais,armas:[],veiculos:[],materiais:[],guarnicoes:guarnicoes(),acoes:[]};
 const weapon=document.querySelector('#tblObjetosPreview tbody tr');
 if(weapon)data.armas=itemData(original(weapon,'textarea')[0]);
 const vehicle=document.querySelector('#tblVeiculosObjetosPreview tbody tr');
 if(vehicle)[1,2].forEach(i=>data.veiculos.push(...itemData(original(vehicle.cells[i],'textarea')[0]).map(x=>({...x,situacao:i===1?'Apreendido':'Recuperado'}))));
 rows('procBody').forEach(row=>{
  const field=original(row.cells[0],'textarea')[0],gu=findGu(field),cat=original(row,'.natureza-cat')[0]?.value||'',conclusion=original(row.cells[2],'textarea')[0]?.value.trim();
  if(cat||conclusion||field?.value.trim())data.acoes.push({vtr:gu?.vtr||'Não vinculada',autuante:gu?.autuante||'Não vinculado',turno:'',natureza:cat||'Não informada'});
  itemData(original(row.cells[3],'textarea')[0]).forEach(x=>{
   if(x.tipo==='Animais'&&!animals.some(a=>a.id===x.vinculo&&a.quantidade>0))data.animais.push({...x,origem:'Apreensão em ação ambiental',destino:'Ver ação ambiental'});
   if(x.tipo==='Veículos'&&!x.jaContado)data.veiculos.push({...x,situacao:'Apreendido em ação ambiental'});
   if(x.tipo==='Materiais')data.materiais.push(x);
  });
 });return data;
}
function applyStats(s){if(!s.detalhamento||s.detalhamento.version<2)return;const animals=s.detalhamento.animais;s.ambientais.animaisTotal=animals.reduce((n,x)=>n+qty(x.quantidade),0);s.ambientais.apreensaoQtd=animals.filter(x=>['Apreensão avulsa','Apreensão em ação ambiental'].includes(x.origem)).reduce((n,x)=>n+qty(x.quantidade),0);}
function aggregate(rs,key,label){const map=new Map();rs.forEach(r=>(r.stats?.detalhamento?.[key]||[]).forEach(x=>{const k=label(x);map.set(k,(map.get(k)||0)+qty(x.quantidade))}));return [...map].sort((a,b)=>b[1]-a[1]);}
function render(rs){return window.BPMA_STATS37?window.BPMA_STATS37.render(rs,rs,{},'todos'):'';}
function styles(){if(document.getElementById('bpma38-style'))return;const style=document.createElement('style');style.id='bpma38-style';style.textContent=`.bpma38-field{position:relative}.bpma38-field>textarea{padding-right:35px!important}.bpma38-toolbar{position:absolute;right:3px;top:3px;display:flex;flex-direction:column;gap:1px}.bpma38-toolbar button{width:24px;height:23px;padding:0!important;border:0!important;border-radius:4px;background:transparent!important;color:#537466;font:17px Arial!important;cursor:pointer}.bpma38-field>textarea[readonly]~.bpma38-toolbar,.bpma38-field>textarea[disabled]~.bpma38-toolbar{display:none}.bpma38-toolbar button:hover{background:#eef4f0!important}#bpma38-popup{position:fixed;z-index:100000;overflow:auto;box-sizing:border-box;background:white;border:1px solid #cedcd4;border-radius:7px;box-shadow:0 5px 18px #14392b26;padding:8px;font:12px Arial;color:#254e3b}#bpma38-popup[hidden]{display:none!important}#bpma38-popup *{box-sizing:border-box}#bpma38-popup button{cursor:pointer;font:12px Arial;border:1px solid #dce6df;border-radius:4px;background:#fff;color:#24543d;padding:6px 8px}#bpma38-popup .bpma38-caption{display:flex;justify-content:space-between;align-items:center;font-weight:bold}#bpma38-popup .bpma38-caption button{border:0;font-size:18px;padding:2px 6px}.bpma38-hint{display:block;color:#65776c;font-size:10px;margin:4px 0}.bpma38-options{max-height:220px;overflow:auto;display:grid;gap:2px}.bpma38-options button{text-align:left;border:0!important;display:flex;justify-content:space-between;gap:8px}.bpma38-options button:hover,.bpma38-options button[aria-selected=true]{background:#edf5f0!important}.bpma38-options small{color:#78867d;font-size:10px}.bpma38-managed{border-bottom:1px solid #e4ece6;margin:6px 0;padding:4px 0}.bpma38-managed>div{display:flex;gap:4px;align-items:center;margin:4px 0}.bpma38-managed span{flex:1;overflow-wrap:anywhere}.bpma38-managed button{padding:3px 5px!important}#bpma38-popup form label{display:block;margin:7px 0}#bpma38-popup form input:not([type=checkbox]):not([type=hidden]),#bpma38-popup form select{display:block;width:100%;min-height:31px;border:1px solid #d5e0d9;border-radius:4px;padding:5px;background:#fff;color:#173a2a;font:12px Arial}#bpma38-popup form [hidden]{display:none!important}.bpma38-inline{display:flex;gap:8px}.bpma38-inline>label{flex:1}.bpma38-formactions{display:flex;justify-content:space-between;margin-top:9px}#bpma38-error{display:block;color:#a51d29;margin-top:6px}@media print{#bpma38-popup,.bpma38-toolbar{display:none!important}.bpma38-field>textarea{padding-right:initial!important}}`;document.head.appendChild(style);}
document.addEventListener('click',e=>{if(e.target.classList?.contains('bpma38-source'))open(e.target);});
document.addEventListener('input',e=>{
 if(internal)return;
 if(e.target.matches('[data-search39]')){const start=e.target.selectionStart;query=e.target.value;draw();const search=popup.querySelector('[data-search39]');search.focus();try{search.setSelectionRange(start,start)}catch{}return;}
 if(e.target.closest('#recursosBody')){clearTimeout(guTimer);guTimer=setTimeout(refreshGU,200);return;}
 if(e.target.classList?.contains('bpma38-source')){
  const field=e.target;
  if(field.dataset.kind38==='gu'){delete field.dataset.gu38;delete field.dataset.guSource38;delete field.closest('tr').dataset.gu37;query=field.value;}
  else{field.dataset.items38=JSON.stringify(itemData(field));const line=currentLine(field);query=itemData(field).some(x=>(x.linha||format(x))===line.text)?'':line.text;}
  active=field;editing=null;draw();
 }
});
document.addEventListener('change',e=>{if(e.target.closest('#bpma38-form')&&e.target.name==='tipo')formVisibility();});
document.addEventListener('click',e=>{
 const target=e.target.closest('button');
 if(target?.matches('[data-del-proc],[data-del-animal]')){
  const row=target.closest('tr');if(row){delete row.dataset.gu37;delete row.dataset.proc37;delete row.dataset.procText37;row.querySelectorAll('.bpma38-source').forEach(f=>{delete f.dataset.items38;delete f.dataset.gu38;delete f.dataset.guSource38});}close();return;
 }
 if(target?.matches('[data-open38],[data-clear38]')){const f=target.closest('.bpma38-field').querySelector('textarea');if(!editable(f))return;if(target.matches('[data-clear38]'))clear(f);else{f.focus();open(f)}return;}
 if(target?.closest('#bpma38-popup')){
  if(target.matches('[data-close38]'))close();
  else if(target.matches('[data-back38]')){editing=null;query='';draw();}
  else if(target.hasAttribute('data-choice38'))form(suggestions[Number(target.dataset.choice38)]);
  else if(target.hasAttribute('data-other38'))form({nome:query||'Outros'});
  else if(target.hasAttribute('data-remove38'))remove(active,target.dataset.remove38);
  else if(target.hasAttribute('data-edit38')){const item=itemData(active).find(x=>x.id===target.dataset.edit38);if(item)form(item);}
  return;
 }
 if(e.target.closest('#bpma38-popup'))return;
 if(active&&e.target!==active&&!e.target.closest('.bpma38-field'))close();
});
document.addEventListener('submit',e=>{
 if(e.target.id!=='bpma38-form')return;e.preventDefault();if(!active||!editable(active)){close();return;}
 const f=e.target,get=name=>f.elements[name]?.value||'',kind=active.dataset.kind38,nome=get('nome').trim(),type=get('tipo');
 const linked=type==='Animais'?animalRows().find(x=>x.id===get('vinculo')):null;
 const amount=linked?.quantidade||Number(get('quantidade')),name=linked?.nome||nome;
 const fail=msg=>{document.getElementById('bpma38-error').textContent=msg};
 if(!name)return fail('Informe a descrição.');
 if(kind==='animal'){const n=Number(get('animalQuantidade'));if(!Number.isInteger(n)||n<1||n>999)return fail('Informe uma quantidade de 1 a 999.');write(original(active.closest('tr'),'input[type=number]')[0],String(n));}
 if(kind==='gu'||kind==='animal'){remember(name);write(active,name);delete active.dataset.gu38;delete active.dataset.guSource38;delete active.closest('tr').dataset.gu37;close();return;}
 if(!Number.isFinite(amount)||amount<=0||(type!=='Materiais'&&!Number.isInteger(amount)))return fail('Informe quantidade válida; animais, armas e veículos exigem números inteiros.');
 const calibre=get('calibre').trim();if(kind==='arma'&&(!calibre||calibre==='Outros'))return fail('Informe o calibre ou Não identificado.');
 const entry={id:editing?.id||uid(),tipo:type,nome:name,quantidade:amount,unidade:type==='Materiais'?get('unidade'):'un.',calibre,identificacao:get('identificacao').trim(),vinculo:linked?.id||'',jaContado:type==='Veículos'&&f.elements.jaContado?.checked===true};
 remember(name);commit(active,entry,editing?.id);query='';editing=null;draw();
});
document.addEventListener('keydown',e=>{
 if(!active||popup?.hidden)return;
 if(e.key==='Escape'){close();return;}
 if(e.target!==active||popup.querySelector('form'))return;
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const delta=e.key==='ArrowDown'?1:-1;highlight=Math.max(0,Math.min(suggestions.length-1,highlight+delta));popup.querySelectorAll('[data-choice38]').forEach((el,i)=>el.setAttribute('aria-selected',i===highlight?'true':'false'));popup.querySelector(`[data-choice38="${highlight}"]`)?.scrollIntoView({block:'nearest'});}
 if(e.key==='Enter'&&highlight>=0&&suggestions[highlight]){e.preventDefault();form(suggestions[highlight]);}
});
window.visualViewport?.addEventListener('resize',position);window.visualViewport?.addEventListener('scroll',position);
window.addEventListener('resize',position);window.addEventListener('scroll',position,true);window.addEventListener('beforeprint',close);
document.addEventListener('DOMContentLoaded',()=>{styles();enhance();['recursosBody','procBody','animalBody'].forEach(id=>{const el=document.getElementById(id);if(el)new MutationObserver(enhance).observe(el,{childList:true});});});
window.BPMA_CPU_DETAIL={catalog,guarnicoes,stats,applyStats,capture,restore,capture37,restore37,capture38,restore38,aggregate,render,format,reconcile,lineIndex,commit,remove,migrate};
})();
