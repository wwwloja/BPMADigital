(() => {
  const BUCKET='bpma-files';
  const PDF_RETENTION_DAYS=365;

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

  async function request(path,{method='GET',body=null,prefer='',rawBody=null,contentType='application/json',extraHeaders={}}={}){
    const {url,key}=config();
    const s=await auth();
    const headers={
      apikey:key,
      Authorization:`Bearer ${s.access_token}`,
      Accept:'application/json',
      ...extraHeaders
    };
    let requestBody;
    if(rawBody!==null){
      headers['Content-Type']=contentType;
      requestBody=rawBody;
    }else if(body!==null){
      headers['Content-Type']='application/json';
      requestBody=JSON.stringify(body);
    }
    if(prefer) headers.Prefer=prefer;

    let response;
    try{
      response=await fetch(url+path,{method,headers,body:requestBody});
    }catch{
      throw new Error('Não foi possível conectar ao Supabase.');
    }

    const text=await response.text();
    let data=null;
    if(text){
      try{data=JSON.parse(text)}catch{data=text}
    }
    if(!response.ok){
      const msg=data?.message||data?.error_description||data?.error||data?.hint||data?.details||`Erro ${response.status}`;
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
      pdf:dados?.pdf||null,
      dados,
      prefilledFromTemplate:!!dados?.prefilledFromTemplate
    };
  }

  function isTestUser(session){
    const u=String(session?.user||session?.usuario||'').trim().toLowerCase();
    return u==='testecpu' || u==='testeop';
  }

  function numberForNewCPU(test=false){
    const d=new Date();
    const pad=n=>String(n).padStart(2,'0');
    const day=`${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
    const time=`${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const rand=Math.random().toString(36).slice(2,5).toUpperCase();
    return `${test?'TESTE-CPU':'CPU'}-${day}-${time}-${rand}`;
  }

  function encodeObjectPath(path){
    return String(path).split('/').map(encodeURIComponent).join('/');
  }

  function safeFilename(name){
    return String(name||'CPU.pdf')
      .replace(/[\\/:*?"<>|]+/g,'_')
      .replace(/\s+/g,'_')
      .replace(/_+/g,'_')
      .replace(/^_|_$/g,'')
      .replace(/\.pdf$/i,'')+'.pdf';
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
      numero:numberForNewCPU(isTestUser(session)),
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
          lazyCreated:true,
          testMode:isTestUser(session),
          semValidadeOperacional:isTestUser(session)
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
        autor:record?.autor||record?.dados?.meta?.autor||'Usuário',
        testMode:!!record?.dados?.meta?.testMode,
        semValidadeOperacional:!!record?.dados?.meta?.testMode
      }
    };
    const body={dados,stats:record?.dados?.meta?.testMode?null:stats};
    if(numero) body.numero=numero;
    return patch(record.id,body);
  }

  async function finalize(record,state,stats,numero){
    const now=new Date().toISOString();
    const previous=Number(record?.dados?.version?.number)||0;
    const number=previous+1;
    const history=[...(record?.dados?.version?.history||[]),{number,at:now}];
    const dados={
      ...(record?.dados||{}),
      state,
      prefilledFromTemplate:false,
      testMode:!!record?.dados?.meta?.testMode,
      semValidadeOperacional:!!record?.dados?.meta?.testMode,
      version:{number,history},
      serviceIdentity: record?.dados?.serviceIdentity || {dataServico:stats?.dataServico||'',createdAt:record?.createdAt||now},
      audit:{...(record?.dados?.audit||{}),lastFinalizedAt:now,corrections:Math.max(0,number-1)}
    };
    const body={
      dados,
      stats:record?.dados?.meta?.testMode?null:stats,
      status:'Finalizado',
      finalized_at:now
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

  async function deletePdfObject(path){
    if(!path)return;
    try{
      await request(`/storage/v1/object/${BUCKET}/${encodeObjectPath(path)}`,{method:'DELETE'});
    }catch(err){
      console.warn('PDF CPU não removido do Storage:',err);
    }
  }

  async function startRevision(id){
    const current=await get(id);
    if(!current) throw new Error('Relatório CPU não encontrado.');
    if(current.status!=='Finalizado')return current;
    const version=current.dados?.version||{number:1,history:[{number:1,at:current.finalizedAt||current.updatedAt}]};
    const dados={...(current.dados||{}),pdf:null,version,audit:{...(current.dados?.audit||{}),lastRevisionStartedAt:new Date().toISOString()}};
    const updated=await patch(id,{status:'Em revisão',finalized_at:null,dados});
    if(current.pdf?.path) await deletePdfObject(current.pdf.path);
    return updated;
  }
  const reopen=startRevision;

  async function archivePdf(record,blob,filename){
    if(!record?.id) throw new Error('Relatório CPU inválido para arquivamento do PDF.');
    if(!(blob instanceof Blob) || blob.size<1000) throw new Error('PDF CPU vazio ou inválido.');

    const path=`${record.id}/cpu_pdf/relatorio.pdf`;
    await request(`/storage/v1/object/${BUCKET}/${encodeObjectPath(path)}`,{
      method:'POST',
      rawBody:blob,
      contentType:'application/pdf',
      extraHeaders:{'x-upsert':'true'}
    });

    const current=await get(record.id);
    if(!current) throw new Error('Relatório CPU não encontrado após gerar PDF.');

    const createdAt=new Date();
    const expiresAt=new Date(createdAt.getTime()+(PDF_RETENTION_DAYS*24*60*60*1000));
    const dados={
      ...(current.dados||{}),
      pdf:{
        path,
        filename:safeFilename(filename||`CPU_${current.numero}.pdf`),
        mime:'application/pdf',
        size:Number(blob.size)||0,
        created_at:createdAt.toISOString(),
        expires_at:expiresAt.toISOString(),
        retention_days:PDF_RETENTION_DAYS
      }
    };

    try{
      return await patch(record.id,{dados});
    }catch(err){
      await deletePdfObject(path);
      throw err;
    }
  }

  async function signedPdfUrl(path,expiresIn=1800){
    if(!path) throw new Error('PDF CPU não disponível.');
    const data=await request(`/storage/v1/object/sign/${BUCKET}/${encodeObjectPath(path)}`,{
      method:'POST',
      body:{expiresIn}
    });
    const signed=data?.signedURL||data?.signedUrl||data?.signed_url||'';
    if(!signed) throw new Error('Não foi possível gerar o acesso temporário ao PDF CPU.');
    if(/^https?:\/\//i.test(signed))return signed;
    const {url}=config();
    return signed.startsWith('/storage/v1') ? url+signed : `${url}/storage/v1${signed.startsWith('/')?'':'/'}${signed}`;
  }

  async function cancel(id,reason=''){
    const current=await get(id); if(!current)throw new Error('Relatório CPU não encontrado.');
    if(current.status!=='Finalizado' && current.status!=='Em revisão')throw new Error('Somente relatório finalizado pode ser cancelado.');
    const now=new Date().toISOString();
    const dados={...(current.dados||{}),cancelamento:{at:now,reason:String(reason||'').slice(0,500)}};
    if(current.pdf?.path) await deletePdfObject(current.pdf.path);
    return patch(id,{status:'Cancelado',dados,finalized_at:null});
  }

  async function remove(id){
    const current=await get(id);
    if(current?.pdf?.path) await deletePdfObject(current.pdf.path);
    await request(`/rest/v1/reports?id=eq.${encodeURIComponent(id)}&tipo=eq.CPU`,{
      method:'DELETE',
      prefer:'return=minimal'
    });
    return true;
  }

  function friendlyError(err){
    const s=String(err?.message||'');
    const l=s.toLowerCase();
    if(l.includes('row-level security')||l.includes('permission denied')||l.includes('violates row-level')) return 'Seu perfil não possui permissão para esta operação. Se o erro ocorreu no PDF do CPU, execute o patch 3.9.4 no Supabase.';
    if(l.includes('payload')||l.includes('too large')) return 'O PDF ficou grande demais para o envio. Tente gerar novamente.';
    if(l.includes('jwt')||err?.status===401) return 'Sua sessão expirou. Saia e entre novamente.';
    if(l.includes('conectar')||l.includes('failed to fetch')) return 'Não foi possível conectar ao Supabase. Verifique a internet.';
    return s||'Não foi possível concluir a operação com o Relatório CPU.';
  }

  window.BPMA_CPU={
    listVisible,get,create,saveState,finalize,clear,reopen,startRevision,remove,
    archivePdf,signedPdfUrl,PDF_RETENTION_DAYS,friendlyError
  };
})();
