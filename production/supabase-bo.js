(() => {
  function config(){
    const cfg=window.BPMA_SUPABASE_CONFIG||{};
    if(!cfg.url||!cfg.publishableKey) throw new Error('Configuração do Supabase ausente.');
    return {url:String(cfg.url).replace(/\/$/,''),key:String(cfg.publishableKey)};
  }

  async function auth(){
    let s=window.BPMA_AUTH?.loadSession?.();
    if(!s?.access_token) throw new Error('Sessão expirada. Entre novamente.');
    if(Number(s.expires_at||0)<=Date.now()+30000){
      s=await window.BPMA_AUTH.refresh(s);
    }
    if(!s?.access_token) throw new Error('Sessão expirada. Entre novamente.');
    return s;
  }

  async function request(path,{method='GET',body=null,prefer=''}={}){
    const {url,key}=config();
    const s=await auth();
    const headers={
      apikey:key,
      Authorization:`Bearer ${s.access_token}`,
      Accept:'application/json'
    };
    if(body!==null) headers['Content-Type']='application/json';
    if(prefer) headers.Prefer=prefer;

    let response;
    try{
      response=await fetch(url+path,{
        method,headers,
        body:body===null?undefined:JSON.stringify(body)
      });
    }catch{
      throw new Error('Não foi possível conectar ao Supabase.');
    }

    const text=await response.text();
    let data=null;
    if(text){
      try{data=JSON.parse(text)}catch{data=text}
    }

    if(!response.ok){
      const message=data?.message||data?.error_description||data?.hint||data?.details||`Erro ${response.status}`;
      const err=new Error(message);
      err.status=response.status;
      throw err;
    }
    return data;
  }

  function normalize(row){
    if(!row)return null;
    const dados=row.dados||{};
    return {
      id:row.id,
      tipo:'BO',
      numero:row.numero||'BO',
      unidade:row.unidade||'',
      authorId:row.author_id,
      autor:dados?.meta?.autor||dados?.meta?.usuario||'Usuário',
      status:row.status||'Rascunho',
      createdAt:row.created_at,
      updatedAt:row.updated_at,
      finalizedAt:row.finalized_at,
      state:dados?.state||null,
      dados
    };
  }

  function numberForNewBO(){
    const d=new Date();
    const pad=n=>String(n).padStart(2,'0');
    const day=`${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
    const time=`${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const rand=Math.random().toString(36).slice(2,5).toUpperCase();
    return `BO-${day}-${time}-${rand}`;
  }

  async function listVisible(){
    const rows=await request(
      '/rest/v1/reports?tipo=eq.BO&select=id,tipo,numero,status,unidade,author_id,dados,created_at,updated_at,finalized_at&order=updated_at.desc'
    );
    return Array.isArray(rows)?rows.map(normalize):[];
  }

  async function get(id){
    const rows=await request(
      `/rest/v1/reports?id=eq.${encodeURIComponent(id)}&tipo=eq.BO&select=id,tipo,numero,status,unidade,author_id,dados,created_at,updated_at,finalized_at`
    );
    const row=Array.isArray(rows)?rows[0]:null;
    return normalize(row);
  }

  async function create(session){
    if(!session?.id) throw new Error('Sessão inválida.');
    const payload={
      tipo:'BO',
      numero:numberForNewBO(),
      status:'Rascunho',
      unidade:session.unit,
      author_id:session.id,
      dados:{
        state:null,
        meta:{
          autor:session.name,
          usuario:session.user,
          email:session.email||''
        }
      }
    };
    const rows=await request('/rest/v1/reports',{
      method:'POST',
      body:payload,
      prefer:'return=representation'
    });
    return normalize(Array.isArray(rows)?rows[0]:rows);
  }

  async function patch(id,body){
    const rows=await request(`/rest/v1/reports?id=eq.${encodeURIComponent(id)}&tipo=eq.BO`,{
      method:'PATCH',
      body,
      prefer:'return=representation'
    });
    return normalize(Array.isArray(rows)?rows[0]:rows);
  }

  async function saveState(record,state){
    const dados={
      ...(record?.dados||{}),
      state,
      meta:{
        ...(record?.dados?.meta||{}),
        autor:record?.autor||record?.dados?.meta?.autor||'Usuário'
      }
    };
    return patch(record.id,{dados});
  }

  async function finalize(id,state){
    const current=await get(id);
    if(!current) throw new Error('BO não encontrado.');
    const dados={...(current.dados||{}),state};
    const now=new Date().toISOString();
    return patch(id,{
      dados,
      status:'Finalizado',
      finalized_at:now
    });
  }

  async function clear(id){
    const current=await get(id);
    if(!current) throw new Error('BO não encontrado.');
    const dados={...(current.dados||{}),state:null};
    return patch(id,{dados});
  }

  async function reopen(id){
    return patch(id,{status:'Reaberto',finalized_at:null});
  }

  async function remove(id){
    await request(`/rest/v1/reports?id=eq.${encodeURIComponent(id)}&tipo=eq.BO`,{
      method:'DELETE',
      prefer:'return=minimal'
    });
    return true;
  }

  function friendlyError(err){
    const s=String(err?.message||'');
    const l=s.toLowerCase();
    if(l.includes('row-level security')||l.includes('permission denied')) return 'Seu perfil não possui permissão para esta operação.';
    if(l.includes('jwt')||err?.status===401) return 'Sua sessão expirou. Saia e entre novamente.';
    if(l.includes('conectar')||l.includes('failed to fetch')) return 'Não foi possível conectar ao Supabase. Verifique a internet.';
    return s||'Não foi possível concluir a operação com o BO.';
  }

  window.BPMA_BO={
    listVisible,get,create,saveState,finalize,clear,reopen,remove,friendlyError
  };
})();
