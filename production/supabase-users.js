(() => {
  function cfg(){
    const c=window.BPMA_SUPABASE_CONFIG||{};
    if(!c.url||!c.publishableKey) throw new Error('Configuração do Supabase ausente.');
    return {url:String(c.url).replace(/\/$/,''),key:c.publishableKey};
  }

  function token(){
    const s=window.BPMA_AUTH?.loadSession?.();
    if(!s?.access_token) throw new Error('Sessão expirada. Entre novamente.');
    return s.access_token;
  }

  async function invoke(action,payload={}){
    const {url,key}=cfg();
    const response=await fetch(`${url}/functions/v1/admin-users`,{
      method:'POST',
      headers:{
        apikey:key,
        Authorization:`Bearer ${token()}`,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({action,...payload})
    });
    const text=await response.text();
    let data={};
    try{data=text?JSON.parse(text):{}}catch{data={message:text}}
    if(!response.ok || data?.ok===false){
      const err=new Error(data?.error||data?.message||`Erro ${response.status}`);
      err.status=response.status;
      throw err;
    }
    return data;
  }

  async function list(){
    const data=await invoke('list');
    return Array.isArray(data.users)?data.users:[];
  }

  async function create(payload){
    return invoke('create',{user:payload});
  }

  async function update(payload){
    return invoke('update',{user:payload});
  }

  async function setActive(id,ativo){
    return invoke('set-active',{id,ativo:!!ativo});
  }

  async function archive(id){
    return invoke('archive',{id});
  }

  async function rest(path,{method='GET',body=null}={}){
    const {url,key}=cfg();
    const headers={
      apikey:key,
      Authorization:`Bearer ${token()}`,
      Accept:'application/json'
    };
    if(body!==null){
      headers['Content-Type']='application/json';
      headers['Prefer']='return=representation';
    }
    const response=await fetch(url+path,{
      method,headers,
      body:body===null?undefined:JSON.stringify(body)
    });
    const text=await response.text();
    let data=null;
    if(text){try{data=JSON.parse(text)}catch{data=text}}
    if(!response.ok){
      throw new Error(data?.message||data?.error||`Erro ${response.status}`);
    }
    return data;
  }

  async function loadLayerSettings(){
    const rows=await rest('/rest/v1/system_settings?chave=eq.relatorios_por_camada&select=valor');
    return Array.isArray(rows)&&rows[0]?.valor ? rows[0].valor : null;
  }

  async function syncLayerSettingsToLocal(){
    const remote=await loadLayerSettings();
    if(remote){
      localStorage.setItem('bpma_layer_reports_v1',JSON.stringify(remote));
    }
    return remote;
  }

  async function saveLayerSettings(valor){
    const rows=await rest('/rest/v1/system_settings?chave=eq.relatorios_por_camada',{
      method:'PATCH',
      body:{valor}
    });
    localStorage.setItem('bpma_layer_reports_v1',JSON.stringify(valor));
    return rows;
  }

  function friendlyError(err){
    const s=String(err?.message||'');
    const l=s.toLowerCase();
    if(l.includes('edge function')||l.includes('failed to fetch')) return 'Não foi possível acessar a função de Gestão de Usuários. Confirme se a Edge Function admin-users foi publicada.';
    if(l.includes('already been registered')||l.includes('already exists')||l.includes('duplicate')) return 'Já existe um usuário com esse e-mail ou nome de usuário.';
    if(l.includes('not authorized')||l.includes('forbidden')||err?.status===403) return 'Somente o Admin pode executar esta operação.';
    if(l.includes('jwt')||err?.status===401) return 'Sua sessão expirou. Saia e entre novamente.';
    if(l.includes('password cannot be longer than 72')) return 'A Edge Function de usuários está desatualizada. Publique a versão 3.9.3 do admin-users e tente novamente.';
    return s||'Não foi possível concluir a operação.';
  }

  window.BPMA_USERS={
    list,create,update,setActive,archive,
    loadLayerSettings,syncLayerSettingsToLocal,saveLayerSettings,
    friendlyError
  };
})();
