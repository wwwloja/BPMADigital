(() => {
  function cfg(){
    const c=window.BPMA_SUPABASE_CONFIG||{};
    if(!c.url||!c.publishableKey) throw new Error('Configuração do Supabase ausente.');
    return {url:String(c.url).replace(/\/$/,''),key:String(c.publishableKey)};
  }
  async function auth(){
    let s=window.BPMA_AUTH?.loadSession?.();
    if(!s?.access_token) throw new Error('Sessão expirada.');
    if(Number(s.expires_at||0)<=Date.now()+30000) s=await window.BPMA_AUTH.refresh(s);
    if(!s?.access_token) throw new Error('Sessão expirada.');
    return s;
  }
  async function rest(path){
    const {url,key}=cfg();
    const s=await auth();
    let response;
    try{
      response=await fetch(url+path,{
        headers:{apikey:key,Authorization:`Bearer ${s.access_token}`,Accept:'application/json'}
      });
    }catch{throw new Error('Não foi possível conectar ao Supabase.')}
    const text=await response.text();
    let data=null;
    if(text){try{data=JSON.parse(text)}catch{data=text}}
    if(!response.ok){
      const err=new Error(data?.message||data?.error||data?.hint||`Erro ${response.status}`);
      err.status=response.status;throw err;
    }
    return data;
  }

  async function listAudit(filters={}){
    const qs=['select=id,user_id,action,entity,entity_id,details,created_at','order=created_at.desc','limit=500'];
    if(filters.inicio) qs.push(`created_at=gte.${encodeURIComponent(filters.inicio+'T00:00:00-03:00')}`);
    if(filters.fim) qs.push(`created_at=lte.${encodeURIComponent(filters.fim+'T23:59:59-03:00')}`);
    if(filters.action) qs.push(`action=eq.${encodeURIComponent(filters.action)}`);
    const rows=await rest('/rest/v1/audit_logs?'+qs.join('&'));
    const ids=[...new Set((rows||[]).map(r=>r.user_id).filter(Boolean))];
    let profiles=[];
    if(ids.length){
      try{
        profiles=await rest(`/rest/v1/profiles?id=in.(${ids.join(',')})&select=id,nome,usuario`);
      }catch{}
    }
    const map=new Map((profiles||[]).map(p=>[p.id,p]));
    return (rows||[]).map(r=>({
      ...r,
      actorName:map.get(r.user_id)?.nome||'',
      actorUser:map.get(r.user_id)?.usuario||''
    }));
  }

  async function backup(){
    const generated_at=new Date().toISOString();
    const [reports,profiles,settings,files] = await Promise.all([
      rest('/rest/v1/reports?select=*&order=created_at.asc'),
      rest('/rest/v1/profiles?select=id,email,nome,usuario,role,unidade,ativo,created_at,updated_at,deleted_at&order=created_at.asc'),
      rest('/rest/v1/system_settings?select=*&order=chave.asc'),
      rest('/rest/v1/report_files?select=id,report_id,category,storage_path,nome_original,mime_type,metadata,uploaded_by,created_at&order=created_at.asc')
    ]);
    let audit=[];
    try{audit=await rest('/rest/v1/audit_logs?select=*&order=created_at.asc')}catch{}
    return {
      bpma_backup_version:'3.8',
      generated_at,
      note:'Fotos e anexos permanecem no bucket privado bpma-files; o backup contém os metadados/caminhos.',
      reports:reports||[],
      profiles:profiles||[],
      system_settings:settings||[],
      report_files:files||[],
      audit_logs:audit||[]
    };
  }

  function friendlyError(err){
    const s=String(err?.message||'');
    if(err?.status===401||s.toLowerCase().includes('jwt')) return 'Sua sessão expirou. Entre novamente.';
    if(err?.status===403||s.toLowerCase().includes('permission')) return 'Seu perfil não possui permissão para esta operação.';
    return s||'Não foi possível concluir a operação.';
  }
  window.BPMA_SYSTEM={listAudit,backup,friendlyError};
})();
