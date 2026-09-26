/* Apresentação da tela inicial. As permissões e ações continuam no index.html. */
function homeIcon(name){
  const paths={bo:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5',rfa:'M20 4c-9-2-16 2-16 9a7 7 0 0 0 7 7c7 0 11-7 9-16Z M4 20 15 9',cpu:'M8 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3 M8 2h8v4H8z M7 12h3 M14 12h3 M7 17h3 M14 17h3',term:'M12 3v18 M3 9h18 M3 15h18 M7 3l-2 18 M19 3l-2 18',arrow:'M5 12h14 M13 6l6 6-6 6',grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',user:'M20 21a8 8 0 0 0-16 0 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8',chart:'M4 3v18h17 M8 16v-4 M13 16V7 M18 16v-7',folder:'M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z'};
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.grid}"/></svg>`;
}
function termLink(className='btn app-term-link'){
  if(!session || !['cpu','operacional'].includes(session.role)) return '';
  return `<a class="${className}" href="${escAttr(TERM_FORM_URL)}" target="_blank" rel="noopener noreferrer">${homeIcon('term')}<span>Número de Termo ↗</span></a>`;
}
function newReportActions(){
  return ['BO','RFA','CPU'].filter(type=>canCreate(type)).map(type=>`<button type="button" class="btn primary" data-new-report="${type}">+ Novo ${type}</button>`).join('');
}
function renderAppHome(reps){
  const card=(key,label,desc,icon)=>`<button class="home-module home-${key}" data-go="${key}"><span class="home-icon">${homeIcon(icon)}</span><strong>${label}</strong><span>${desc}</span><span class="home-card-arrow">${homeIcon('arrow')}</span></button>`;
  const operational=session.role==='cpu'||session.role==='operacional';
  const adminLinks=[['banco','Banco de relatórios','folder'],['painel','Painel gerencial','chart'],['estatisticas','Estatísticas','chart'],['usuarios','Usuários','user'],['auditoria','Auditoria','bo'],['config','Configurações','grid']].filter(([key])=>allowed(key)&&!(operational&&key==='banco'));
  return `<div class="home-app">
    <header class="home-header"><div class="home-brand"><img src="assets/bpma.jpg" alt="Brasão do BPMA"><div><b>BPMA Digital</b><span>Policiamento ambiental</span></div></div>${allowed('config')?`<button class="home-account" data-go="config" aria-label="Abrir minha conta">${homeIcon('user')}</button>`:''}</header>
    <section class="home-welcome"><div class="home-eyebrow">SEU ESPAÇO DE TRABALHO</div><h1>Olá, ${esc(session.name||'policial')}<span class="home-dot">.</span></h1><p>${esc(session.unit||'BPMA')} <span aria-hidden="true">·</span> ${esc(roleLabels[session.role]||session.role)}</p><div class="home-welcome-line"></div></section>
    <section aria-labelledby="home-modules-title"><div class="home-section-title"><h2 id="home-modules-title">O que vamos fazer?</h2><span>Acesso rápido</span></div><div class="home-modules">
      ${allowed('bo')?card('bo','Boletim de ocorrência','Registrar uma ocorrência','bo'):''}
      ${allowed('rfa')?card('rfa','Fiscalização ambiental','Preencher relatório de fiscalização','rfa'):''}
      ${allowed('cpu')?card('cpu','Serviço CPU','Organizar os dados do serviço','cpu'):''}
      ${operational?`<a class="home-module home-term" href="${escAttr(TERM_FORM_URL)}" target="_blank" rel="noopener noreferrer"><span class="home-icon">${homeIcon('term')}</span><strong>Número de termo</strong><span>Acessar formulário externo ↗</span><span class="home-card-arrow">${homeIcon('arrow')}</span></a>`:''}
    </div></section>
    <div class="home-activity">${session.role==='cpu'?renderSharedBOToday():''}${renderDraftsInProgress()}${renderRecent(reps.slice(0,3))}</div>
    ${adminLinks.length?`<section class="home-tools" aria-labelledby="home-tools-title"><div class="home-section-title"><h2 id="home-tools-title">${operational?'Mais opções':'Gestão e ferramentas'}</h2></div><div class="home-tools-grid">${adminLinks.map(([key,label,icon])=>`<button data-go="${key}">${homeIcon(icon)}<span>${label}</span>${homeIcon('arrow')}</button>`).join('')}</div></section>`:''}
    <footer class="home-footer">BPMA Digital <span>•</span> Paraíba</footer>
  </div>`;
}
