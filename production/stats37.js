/* Estatísticas CPU: dados salvos, filtros comuns e detalhes com unidades. */
(() => {
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3}).format(Number(n)||0);
const positive=n=>Math.max(0,Number(n)||0);
const art={
 shotgun:'<path d="M5 10h35v10H25l-3 5 4 13H15l-5-17H5z"/><path d="M7 14h31M30 10V7h5v3M24 20v8h-9M19 21q0 5 4 5M15 28l5 1m-4 4 5 1M9 10V8h4v2"/>',
 cuffs:'<g transform="rotate(-18 13 29)"><ellipse cx="13" cy="29" rx="9" ry="11"/><ellipse cx="13" cy="29" rx="5" ry="7"/><path d="M9 17v-4h8v5"/><circle cx="13" cy="16" r=".8"/></g><g transform="rotate(18 35 29)"><ellipse cx="35" cy="29" rx="9" ry="11"/><ellipse cx="35" cy="29" rx="5" ry="7"/><path d="M31 18v-5h8v4"/><circle cx="35" cy="16" r=".8"/></g><path d="M16 12l4-5q3-3 5 1l2 4m-5-4 3-2q4-1 5 3l2 4"/>',
 coins:'<ellipse cx="18" cy="12" rx="12" ry="5"/><path d="M6 12v7c0 7 24 7 24 0v-7M6 20v7c0 4 10 6 16 4M6 28v7c0 4 9 6 16 4"/><circle cx="33" cy="30" r="11"/><path d="M36 25h-5q-4 0-3 4 1 2 5 2 5 0 4 4-1 2-7 1m3-14v17"/>',
 bird:'<path d="M9 26q-3-12 10-13l7 1q0-10 7-10 6 1 5 7l6 3-7 2q0 13-17 15L5 36l5-10z"/><path d="M15 25q9-1 13-9M23 31l-1 8m7-10 2 9m-12 1h7m2-1h7"/><circle cx="34" cy="9" r="1"/>',
 paw:'<path d="M13 26q2-7 8-7 5 0 8 7l5 7q1 6-5 6-5-3-8-3-4 0-8 3-7 0-5-6z"/><ellipse cx="9" cy="17" rx="4" ry="6" transform="rotate(-25 9 17)"/><ellipse cx="18" cy="10" rx="4" ry="6"/><ellipse cx="28" cy="10" rx="4" ry="6"/><ellipse cx="37" cy="18" rx="4" ry="6" transform="rotate(25 37 18)"/>',
 car:'<path d="M7 25l5-11h23l5 11v12H7zM7 25h33M16 15l-3 9h21l-3-9M8 37v4h7v-4m17 0v4h7v-4"/><path d="M11 30h6m13 0h6m-16 4h8"/>',
 leaf:'<path d="M8 36Q2 8 39 5Q44 39 14 38M8 41L31 17M17 32l-1-10m8 2 9-1"/>',
 file:'<path d="M10 4h20l9 9v29H10zM30 4v10h9M16 21h17m-17 7h17m-17 7h12"/>',
 people:'<circle cx="17" cy="13" r="6"/><path d="M5 39v-9q1-10 12-10t12 10v9M30 8q10-1 10 7t-9 6m2 4q10 0 10 10v4"/>',
 material:'<path d="M6 15l16-9 17 9v24H6zM6 15l16 9 17-9M22 24v15M14 10l17 10v9M6 31l16 8 17-8"/>',
 balance:'<path d="M23 5v35M14 41h18M8 13h31M9 13l-6 17h13L9 13zm28 0-6 17h13l-7-17zM3 30q6 8 13 0m15 0q6 8 13 0"/>'
};
function icon(key){return `<svg viewBox="0 0 48 48" width="38" height="38" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${art[key]||art.file}</svg>`;}
function sum(rows,path){return rows.reduce((n,r)=>{let v=r.stats;for(const k of path.split('.'))v=v?.[k];return n+positive(v)},0)}
function filteredDetails(rows,key,filters={}){
 return rows.flatMap(r=>(r.stats?.detalhamento?.[key]||[]).map(x=>({...x,report:r})));
}
function filter(rows,f){
 return rows.filter(r=>{
 const actions=r.stats?.detalhamento?.acoes||[],gus=r.stats?.detalhamento?.guarnicoes||[];
 if(f.vtr&&!gus.some(x=>x.vtr===f.vtr)&&!actions.some(x=>x.vtr===f.vtr))return false;
 if(f.autuante&&!actions.some(x=>x.autuante===f.autuante)&&!gus.some(x=>x.autuante===f.autuante))return false;
 if(f.natureza&&!actions.some(x=>x.natureza===f.natureza))return false;
 return true;
 });
}
function group(items,label,value=x=>positive(x.quantidade)){
 const map=new Map();for(const x of items){const k=label(x);map.set(k,(map.get(k)||0)+value(x));}return [...map].sort((a,b)=>b[1]-a[1]);
}
function table(title,data,label='Descrição',unit='Quantidade'){
 return `<section class="panel stats37-table"><h3>${esc(title)}</h3><div class="table-wrap"><table><thead><tr><th>${esc(label)}</th><th>${esc(unit)}</th></tr></thead><tbody>${data.map(([k,n])=>`<tr><td>${esc(k)}</td><td>${fmt(n)}</td></tr>`).join('')||'<tr><td colspan="2">Sem dados para os filtros selecionados.</td></tr>'}</tbody></table></div></section>`;
}
function select(id,label,values,current){return `<label>${esc(label)}<select id="${id}"><option value="">Todos</option>${[...new Set(values.filter(Boolean))].sort().map(v=>`<option value="${esc(v)}" ${current===v?'selected':''}>${esc(v)}</option>`).join('')}</select></label>`;}
function render(allRows,cache,f,view='resumo'){
 const rows=filter(allRows,f),details=key=>filteredDetails(rows,key),animals=details('animais'),vehicles=details('veiculos'),weapons=details('armas'),materials=details('materiais'),actions=details('acoes');
 const covered=rows.filter(r=>r.stats?.detalhamento?.version>=2).length;
 const allActions=filteredDetails(allRows,'acoes'),allGus=filteredDetails(allRows,'guarnicoes');
 const now=new Date(),year=now.getFullYear(),month=String(now.getMonth()+1).padStart(2,'0');
 const cards=[
 ['Procedimentos ambientais',sum(rows,'ambientais.procedimentos'),'leaf'],['Proc. administrativos',sum(rows,'ambientais.procAdm'),'file'],['TCO ambientais',sum(rows,'ambientais.tco'),'file'],['APF ambientais',sum(rows,'ambientais.apf'),'cuffs'],['UFRPB aplicadas',sum(rows,'ambientais.ufrPb'),'coins'],['Animais resgatados',sum(rows,'ambientais.resgateQtd'),'paw'],['Animais apreendidos',sum(rows,'ambientais.apreensaoQtd'),'bird'],['Armas de fogo',sum(rows,'ordemPublica.armasFogo'),'shotgun'],['Prisões de adultos',sum(rows,'ordemPublica.adultoFlagrante')+sum(rows,'ordemPublica.adultoMandado'),'cuffs'],['Veículos detalhados',vehicles.reduce((n,x)=>n+positive(x.quantidade),0),'car'],['Itens de materiais (categorias)',new Set(materials.map(x=>x.nome+' '+x.unidade)).size,'material'],['Entrega voluntária de animais',sum(rows,'ambientais.entregaQtd'),'people']
 ];
 const metrics=cards.map(([label,n,key])=>key==='coins'?window.BPMA50.card(rows,icon(key)):`<a href="#stats37details" class="stats37-card">${icon(key)}<span><small>${esc(label)}</small><b>${fmt(n)}</b></span></a>`).join('');
 const animalTable=table('Animais por identificação e origem',group(animals,x=>`${x.nome} · ${x.origem}`));
 const destinationTable=table('Animais por destino',group(animals,x=>x.destino||'Não informado'));
 const weaponTable=table('Armas por tipo e calibre',group(weapons,x=>`${x.nome} · ${x.calibre||'Não informado'}`));
 const vehicleTable=table('Veículos por categoria e situação (unidades detalhadas)',group(vehicles,x=>`${x.nome} · ${x.situacao}`));
 const materialTable=table('Materiais por item e unidade',group(materials,x=>`${x.nome} (${x.unidade||'un.'})`));
 const guTable=table('Ações ambientais por VTR e autuante',group(actions,x=>`${x.vtr} · ${x.autuante}`,()=>1),'Guarnição / autuante','Ações');
 const natureTable=table('Naturezas ambientais',Object.entries({Fauna:'fauna',Flora:'flora','Poluição':'poluicao','Mineração':'mineracao',Pesca:'pesca','Recursos hídricos':'recursosHidricos','Unidade de conservação':'uc','Queimada / incêndio':'queimadaIncendio','Licenciamento':'licenciamento',Outros:'outros'}).map(([label,k])=>[label,sum(rows,'ambientais.natureza.'+k)]),'Natureza','Ações');
 const environmentalTable=table('Resultados ambientais e animais',[['Procedimentos ambientais',sum(rows,'ambientais.procedimentos')],['TCO',sum(rows,'ambientais.tco')],['APF',sum(rows,'ambientais.apf')],['Proc. administrativos',sum(rows,'ambientais.procAdm')],['UFRPB',sum(rows,'ambientais.ufrPb')],['Sem procedimento formal',sum(rows,'ambientais.semProcedimento')],['Animais total',sum(rows,'ambientais.animaisTotal')],['Resgate (quantidade)',sum(rows,'ambientais.resgateQtd')],['Entrega voluntária (quantidade)',sum(rows,'ambientais.entregaQtd')],['Apreensão (quantidade)',sum(rows,'ambientais.apreensaoQtd')],['Resgate (registros)',sum(rows,'ambientais.resgateRegistros')],['Entrega voluntária (registros)',sum(rows,'ambientais.entregaRegistros')],['Apreensão avulsa (registros)',sum(rows,'ambientais.apreensaoRegistros')]]);
 const operationalTable=table('Emprego por turno (soma dos serviços)',[['Efetivo diurno',sum(rows,'recursos.efetivoDia')],['Ordinário diurno',sum(rows,'recursos.ordinarioDia')],['P.O.R. diurno',sum(rows,'recursos.porDia')],['Efetivo noturno',sum(rows,'recursos.efetivoNoite')],['Ordinário noturno',sum(rows,'recursos.ordinarioNoite')],['P.O.R. noturno',sum(rows,'recursos.porNoite')]],'Indicador','Empregos');
 const publicTable=table('Ordem pública — totais informados no CPU',[['Adultos presos em flagrante',sum(rows,'ordemPublica.adultoFlagrante')],['Adultos por mandado',sum(rows,'ordemPublica.adultoMandado')],['Menores em flagrante',sum(rows,'ordemPublica.menorFlagrante')],['Menores por mandado de apreensão',sum(rows,'ordemPublica.menorApreensao')],['Armas de fogo',sum(rows,'ordemPublica.armasFogo')],['Munições',sum(rows,'ordemPublica.municoes')],['Armas brancas',sum(rows,'ordemPublica.armasBrancas')],['Drogas (unidades)',sum(rows,'ordemPublica.drogasUnidades')],['Drogas (gramas)',sum(rows,'ordemPublica.drogasGramas')],['Veículos apreendidos (registros legados)',sum(rows,'ordemPublica.veiculosApreendidos')],['Veículos recuperados (registros legados)',sum(rows,'ordemPublica.veiculosRecuperados')],['Objetos apreendidos (registros)',sum(rows,'ordemPublica.objetosApreendidos')],['Objetos recuperados (registros)',sum(rows,'ordemPublica.objetosRecuperados')],['TCO adulto flagrante',sum(rows,'ordemPublica.tcoAdultoFlagrante')],['TCO adulto mandado',sum(rows,'ordemPublica.tcoAdultoMandado')],['TCO menor flagrante',sum(rows,'ordemPublica.tcoMenorFlagrante')],['TCO menor mandado',sum(rows,'ordemPublica.tcoMenorApreensao')]]);
 const adminTable=table('Alterações e informações complementares',[['Faltas',sum(rows,'alteracoes.faltas')],['Permutas',sum(rows,'alteracoes.permutas')],['Atestados',sum(rows,'alteracoes.atestados')],['Dispensas',sum(rows,'alteracoes.dispensas')],['TAT (registros)',sum(rows,'complementares.tat')],['Descompressões (registros)',sum(rows,'complementares.descompressoes')]]);
 const activityTable=table('Atividades desempenhadas',Object.entries({Total:'total','Operações':'operacoes','Fiscalizações':'fiscalizacoes','Patrulhamentos':'patrulhamentos','Apoios':'apoios','Unidades de conservação':'uc','Ações educativas':'educativas',Outros:'outros'}).map(([label,k])=>[label,sum(rows,'atividades.'+k)]));
 const months=group(rows,r=>(r.stats?.dataServico||r.updatedAt||'').slice(0,7),r=>positive(r.stats?.ambientais?.procedimentos)).sort((a,b)=>a[0].localeCompare(b[0]));
 const monthly=table('Evolução mensal das ações ambientais',months,'Mês','Ações');
 const tabs=[['resumo','Resumo'],['guarnicoes','Guarnições'],['fauna','Fauna'],['apreensoes','Apreensões'],['naturezas','Naturezas'],['operacional','Emprego'],['evolucao','Evolução'],['todos','Todos']];
 let body=view==='resumo'?`<div class="stats37-grid">${metrics}</div>${natureTable}${monthly}`:view==='guarnicoes'?guTable:view==='fauna'?animalTable+destinationTable:view==='apreensoes'?weaponTable+vehicleTable+materialTable:view==='naturezas'?natureTable:view==='operacional'?operationalTable+activityTable+adminTable:[monthly].join('');
 if(view==='todos')body=`<div class="stats37-grid">${metrics}</div>`+guTable+animalTable+destinationTable+weaponTable+vehicleTable+materialTable+natureTable+environmentalTable+operationalTable+activityTable+publicTable+adminTable+monthly;
 const reportTable=`<details id="stats37details" class="panel"><summary>Conferir relatórios que compõem os indicadores (${rows.length})</summary><div class="table-wrap"><table><thead><tr><th>CPU</th><th>Data do serviço</th><th>Unidade</th><th>Situação</th><th>Ação</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.numero)}</td><td>${esc(r.stats?.dataServico||'')}</td><td>${esc(r.unidade)}</td><td>${esc(r.status)}</td><td><button class="btn" data-stats-report="${esc(r.id)}">Abrir CPU</button></td></tr>`).join('')}</tbody></table></div></details>`;
 return `<style>.stats37-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:16px 0}.stats37-card{display:flex;align-items:center;gap:14px;background:white;border:1px solid #dce7e0;border-radius:10px;padding:20px;color:#07543c;text-decoration:none}.stats37-card small{display:block;color:#53685d}.stats37-card b{display:block;font-size:30px}.stats37-filters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.stats37-filters label{display:grid;gap:4px;font-size:12px}.stats37-filters select,.stats37-filters input{min-height:34px;border:1px solid #dde5df;border-radius:5px;background:#fff;padding:5px 8px;width:100%;box-sizing:border-box}.stats37-table td:last-child{font-weight:600}.stats37-table h3{display:flex;align-items:center;gap:8px}.stats37-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}#stats37details summary{cursor:pointer;font-weight:bold}@media(max-width:700px){.stats37-grid,.stats37-filters{grid-template-columns:repeat(2,minmax(0,1fr))}.stats37-card{padding:12px;gap:8px}.stats37-card b{font-size:24px}}@media print{.stats37-actions,.stats-filter-panel,.stats37-card svg,button{display:none!important}.stats37-grid{grid-template-columns:repeat(4,1fr)}}</style>
 <div class="panel stats-filter-panel"><h3>Estatísticas CPU</h3><p>Dados dos campos do CPU. Relatórios de teste ficam fora dos indicadores oficiais.</p><div class="stats37-actions"><button class="btn" data-stats-preset="month" data-start="${year}-${month}-01">Mês atual</button><button class="btn" data-stats-preset="year" data-start="${year}-01-01">Ano atual</button><button class="btn" data-stats-preset="all">Todo histórico</button></div><div class="stats37-filters"><label>Data inicial<input id="statsInicio" type="date" value="${esc(f.inicio)}"></label><label>Data final<input id="statsFim" type="date" value="${esc(f.fim)}"></label>${select('statsUnidade','Unidade',cache.map(x=>x.unidade),f.unidade)}${select('statsStatus','Situação',['Finalizado'],f.status)}${select('statsVtr','VTR',allGus.map(x=>x.vtr),f.vtr)}${select('statsAutuante','Autuante',allGus.map(x=>x.autuante),f.autuante)}${select('statsNatureza','Natureza',allActions.map(x=>x.natureza),f.natureza)}</div><div class="stats37-actions"><button id="statsClear" class="btn">Limpar filtros</button><button id="statsExportCSV" class="btn">Exportar CSV detalhado</button>${!rows.length&&JSON.parse(sessionStorage.getItem('bpma_local_session_v1')||'{}').role==='admin'?'<button class="btn" data-ufr-config>⚙ Valor UFRPB / Economia</button>':''}</div><div class="stats-tabs">${tabs.map(([k,label])=>`<button class="stats-tab ${view===k?'active':''}" data-stats-view="${k}">${label}</button>`).join('')}</div></div>
 <div class="note">${rows.length} CPU(s) no filtro · ${covered} com integração 5.0. Detalhes de versões anteriores aparecem quando disponíveis. Empregos por turno não equivalem a militares únicos. Filtros de VTR/autuante/natureza selecionam CPUs completos; os demais indicadores representam todo o conteúdo desses CPUs.</div>${rows.length?body:'<div class="panel">Nenhum CPU encontrado.</div>'}${reportTable}`;
}
function csv(rows){
 const headers=['CPU','Data serviço','Unidade','Situação','Categoria','Item','Origem / situação','Calibre','Quantidade','Unidade medida','VTR','Autuante','Turno'];
 const data=[headers];
 for(const r of rows){
 const common=[r.numero,r.stats?.dataServico||'',r.unidade,r.status],d=r.stats?.detalhamento||{};
 for(const key of ['animais','armas','veiculos','materiais'])for(const x of d[key]||[])data.push([...common,key,x.nome,x.origem||x.situacao||'',x.calibre||'',x.quantidade,x.unidade||'un.','','','']);
 for(const x of d.acoes||[])data.push([...common,'ações',x.natureza,'','','1','ação',x.vtr,x.autuante,x.turno]);
 for(const [label,path] of [['Procedimentos','ambientais.procedimentos'],['TCO ambientais','ambientais.tco'],['APF ambientais','ambientais.apf'],['Proc. adm.','ambientais.procAdm'],['UFRPB','ambientais.ufrPb'],['Animais total','ambientais.animaisTotal'],['Armas total','ordemPublica.armasFogo'],['Efetivo dia','recursos.efetivoDia'],['Efetivo noite','recursos.efetivoNoite']])data.push([...common,'total CPU',label,'','',sum([r],path),'','','','']);
 }
 const cell=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
 const blob=new Blob(['\ufeff'+data.map(line=>line.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='BPMA_Estatisticas_CPU_4_0_37.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
window.BPMA_STATS37={render,icon,filter,group,sum,csv};
})();
