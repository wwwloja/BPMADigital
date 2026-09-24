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
      const msg=data?.message||data?.error_description||data?.hint||data?.details||`Erro ${response.status}`;
      const err=new Error(msg);
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
      tipo:'CPU',
      numero:row.numero||'CPU',
      unidade:row.unidade||'',
      authorId:row.author_id,
      autor:dados?.meta?.autor||dados?.meta?.usuario||'Usuário',
      status:row.status||'Rascunho',
      createdAt:row.created_at,
      updatedAt:row.updated_at,
      finalizedAt:row.finalized_at,
      state:dados?.state||null,
      stats:row.stats||null,
      dados,
      prefilledFromTemplate:!!dados?.prefilledFromTemplate
    };
  }

  function numberForNewCPU(){
    const d=new Date();
    const pad=n=>String(n).padStart(2,'0');
    const day=`${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
    const time=`${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const rand=Math.random().toString(36).slice(2,5).toUpperCase();
    return `CPU-${day}-${time}-${rand}`;
  }

  async function listVisible(){
    const rows=await request(
      '/rest/v1/reports?tipo=eq.CPU&select=id,tipo,numero,status,unidade,author_id,dados,stats,created_at,updated_at,finalized_at&order=updated_at.desc'
    );
    return Array.isArray(rows)?rows.map(normalize):[];
  }

  async function get(id){
    const rows=await request(
      `/rest/v1/reports?id=eq.${encodeURIComponent(id)}&tipo=eq.CPU&select=id,tipo,numero,status,unidade,author_id,dados,stats,created_at,updated_at,finalized_at`
    );
    return normalize(Array.isArray(rows)?rows[0]:rows);
  }

  async function create(session,initialState=null){
    if(!session?.id) throw new Error('Sessão inválida.');
    const payload={
      tipo:'CPU',
      numero:numberForNewCPU(),
      status:'Rascunho',
      unidade:session.unit,
      author_id:session.id,
      dados:{
        state:initialState||null,
        prefilledFromTemplate:false,
        meta:{
          autor:session.name,
          usuario:session.user,
          email:session.email||'',
          lazyCreated:true
        }
      },
      stats:null
    };

    const rows=await request('/rest/v1/reports',{
      method:'POST',
      body:payload,
      prefer:'return=representation'
    });
    return normalize(Array.isArray(rows)?rows[0]:rows);
  }

  async function patch(id,body){
    const rows=await request(`/rest/v1/reports?id=eq.${encodeURIComponent(id)}&tipo=eq.CPU`,{
      method:'PATCH',
      body,
      prefer:'return=representation'
    });
    return normalize(Array.isArray(rows)?rows[0]:rows);
  }

  async function saveState(record,state,stats,numero){
    const dados={
      ...(record?.dados||{}),
      state,
      prefilledFromTemplate:false,
      meta:{
        ...(record?.dados?.meta||{}),
        autor:record?.autor||record?.dados?.meta?.autor||'Usuário'
      }
    };
    const body={dados,stats};
    if(numero) body.numero=numero;
    return patch(record.id,body);
  }

  async function finalize(record,state,stats,numero){
    const dados={
      ...(record?.dados||{}),
      state,
      prefilledFromTemplate:false
    };
    const body={
      dados,
      stats,
      status:'Finalizado',
      finalized_at:new Date().toISOString()
    };
    if(numero) body.numero=numero;
    return patch(record.id,body);
  }

  async function clear(id,state,stats){
    const current=await get(id);
    if(!current) throw new Error('Relatório CPU não encontrado.');
    const dados={...(current.dados||{}),state,prefilledFromTemplate:false};
    return patch(id,{dados,stats});
  }

  async function reopen(id){
    return patch(id,{status:'Reaberto',finalized_at:null});
  }

  async function remove(id){
    await request(`/rest/v1/reports?id=eq.${encodeURIComponent(id)}&tipo=eq.CPU`,{
      method:'DELETE',
      prefer:'return=minimal'
    });
    return true;
  }

  function friendlyError(err){
    const s=String(err?.message||'');
    const l=s.toLowerCase();
    if(l.includes('row-level security')||l.includes('permission denied')||l.includes('violates row-level')) return 'Seu perfil não possui permissão para esta operação.';
    if(l.includes('jwt')||err?.status===401) return 'Sua sessão expirou. Saia e entre novamente.';
    if(l.includes('conectar')||l.includes('failed to fetch')) return 'Não foi possível conectar ao Supabase. Verifique a internet.';
    return s||'Não foi possível concluir a operação com o Relatório CPU.';
  }

  window.BPMA_CPU={
    listVisible,get,create,saveState,finalize,clear,reopen,remove,friendlyError
  };
})();
