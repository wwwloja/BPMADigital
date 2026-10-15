/* Apresentação da tela inicial. As permissões e ações continuam no index.html. */
function homeIcon(name){return window.BPMA_ICONS.render(name);}
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
