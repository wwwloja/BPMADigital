(() => {
  const BUCKET='bpma-files';

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
      const message=data?.message||data?.error_description||data?.error||data?.hint||data?.details||`Erro ${response.status}`;
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
      tipo:'RFA',
      numero:row.numero||'RFA',
      unidade:row.unidade||'',
      authorId:row.author_id,
      autor:dados?.meta?.autor||dados?.meta?.usuario||'Usuário',
      status:row.status||'Rascunho',
      createdAt:row.created_at,
      updatedAt:row.updated_at,
      finalizedAt:row.finalized_at,
      state:dados?.state||null,
      dados,
      prefilledFromTemplate:!!dados?.prefilledFromTemplate
    };
  }

  function numberForNewRFA(){
    const d=new Date();
    const pad=n=>String(n).padStart(2,'0');
    const day=`${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
    const time=`${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const rand=Math.random().toString(36).slice(2,5).toUpperCase();
    return `RFA-${day}-${time}-${rand}`;
  }

  async function listVisible(){
    const rows=await request(
      '/rest/v1/reports?tipo=eq.RFA&select=id,tipo,numero,status,unidade,author_id,dados,created_at,updated_at,finalized_at&order=updated_at.desc'
    );
    return Array.isArray(rows)?rows.map(normalize):[];
  }

  async function get(id){
    const rows=await request(
      `/rest/v1/reports?id=eq.${encodeURIComponent(id)}&tipo=eq.RFA&select=id,tipo,numero,status,unidade,author_id,dados,created_at,updated_at,finalized_at`
    );
    return normalize(Array.isArray(rows)?rows[0]:rows);
  }

  async function create(session,template=null){
    if(!session?.id) throw new Error('Sessão inválida.');
    const payload={
      tipo:'RFA',
      numero:numberForNewRFA(),
      status:'Rascunho',
      unidade:session.unit,
      author_id:session.id,
      dados:{
        state:template||null,
        prefilledFromTemplate:!!template,
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
    const rows=await request(`/rest/v1/reports?id=eq.${encodeURIComponent(id)}&tipo=eq.RFA`,{
      method:'PATCH',
      body,
      prefer:'return=representation'
    });
    return normalize(Array.isArray(rows)?rows[0]:rows);
  }

  async function saveState(record,state,numero){
    const dados={
      ...(record?.dados||{}),
      state,
      prefilledFromTemplate:false,
      meta:{
        ...(record?.dados?.meta||{}),
        autor:record?.autor||record?.dados?.meta?.autor||'Usuário'
      }
    };
    const body={dados};
    if(numero) body.numero=numero;
    return patch(record.id,body);
  }

  async function finalize(record,state,numero){
    const dados={
      ...(record?.dados||{}),
      state,
      prefilledFromTemplate:false
    };
    const body={
      dados,
      status:'Finalizado',
      finalized_at:new Date().toISOString()
    };
    if(numero) body.numero=numero;
    return patch(record.id,body);
  }

  async function clear(id){
    const current=await get(id);
    if(!current) throw new Error('RFA não encontrado.');
    const dados={...(current.dados||{}),state:null,prefilledFromTemplate:false};
    return patch(id,{dados});
  }

  async function reopen(id){
    return patch(id,{status:'Reaberto',finalized_at:null});
  }

  function encodeObjectPath(path){
    return String(path).split('/').map(encodeURIComponent).join('/');
  }

  function dataUrlToBlob(dataUrl){
    const [head,data]=String(dataUrl).split(',');
    const mime=(head.match(/data:([^;]+)/)||[])[1]||'image/jpeg';
    const binary=atob(data);
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
    return new Blob([bytes],{type:mime});
  }

  function extForMime(mime){
    if(mime==='image/png')return 'png';
    if(mime==='image/webp')return 'webp';
    if(mime==='image/gif')return 'gif';
    return 'jpg';
  }

  async function uploadPhoto(reportId,dataUrl){
    const blob=dataUrlToBlob(dataUrl);
    const ext=extForMime(blob.type);
    const path=`${reportId}/foto_rfa/${crypto.randomUUID()}.${ext}`;
    const encoded=encodeObjectPath(path);

    await request(`/storage/v1/object/${BUCKET}/${encoded}`,{
      method:'POST',
      rawBody:blob,
      contentType:blob.type,
      extraHeaders:{'x-upsert':'false'}
    });

    const s=await auth();
    await request('/rest/v1/report_files',{
      method:'POST',
      body:{
        report_id:reportId,
        category:'foto_rfa',
        storage_path:path,
        nome_original:`foto-rfa.${ext}`,
        mime_type:blob.type,
        metadata:{},
        uploaded_by:s.user.id
      },
      prefer:'return=minimal'
    });

    return path;
  }

  async function signedPhotoUrl(path,expiresIn=3600){
    const encoded=encodeObjectPath(path);
    const data=await request(`/storage/v1/object/sign/${BUCKET}/${encoded}`,{
      method:'POST',
      body:{expiresIn}
    });
    const signed=data?.signedURL||data?.signedUrl||data?.signed_url||'';
    if(!signed) throw new Error('Não foi possível gerar URL temporária da foto.');
    if(/^https?:\/\//i.test(signed))return signed;
    const {url}=config();
    return signed.startsWith('/storage/v1')
      ? url+signed
      : `${url}/storage/v1${signed.startsWith('/')?'':'/'}${signed}`;
  }

  async function listPhotoFiles(reportId){
    const rows=await request(
      `/rest/v1/report_files?report_id=eq.${encodeURIComponent(reportId)}&category=eq.foto_rfa&select=id,storage_path,mime_type`
    );
    return Array.isArray(rows)?rows:[];
  }

  async function deletePhotoFile(file){
    if(!file?.storage_path)return;
    const encoded=encodeObjectPath(file.storage_path);
    try{
      await request(`/storage/v1/object/${BUCKET}/${encoded}`,{method:'DELETE'});
    }catch(err){
      console.warn('Objeto de foto não removido do Storage:',err);
    }
    if(file.id){
      try{
        await request(`/rest/v1/report_files?id=eq.${encodeURIComponent(file.id)}`,{
          method:'DELETE',
          prefer:'return=minimal'
        });
      }catch(err){
        console.warn('Metadado de foto não removido:',err);
      }
    }
  }

  async function syncPhotoSet(reportId,desiredPaths){
    const desired=new Set((desiredPaths||[]).filter(Boolean));
    const files=await listPhotoFiles(reportId);
    for(const f of files){
      if(!desired.has(f.storage_path)){
        await deletePhotoFile(f);
      }
    }
  }

  async function remove(id){
    const files=await listPhotoFiles(id);
    for(const f of files) await deletePhotoFile(f);

    await request(`/rest/v1/reports?id=eq.${encodeURIComponent(id)}&tipo=eq.RFA`,{
      method:'DELETE',
      prefer:'return=minimal'
    });
    return true;
  }

  function friendlyError(err){
    const s=String(err?.message||'');
    const l=s.toLowerCase();
    if(l.includes('row-level security')||l.includes('permission denied')||l.includes('violates row-level')) return 'Seu perfil não possui permissão para esta operação.';
    if(l.includes('payload')||l.includes('too large')) return 'O arquivo é grande demais para envio. Tente uma foto menor.';
    if(l.includes('jwt')||err?.status===401) return 'Sua sessão expirou. Saia e entre novamente.';
    if(l.includes('conectar')||l.includes('failed to fetch')) return 'Não foi possível conectar ao Supabase. Verifique a internet.';
    return s||'Não foi possível concluir a operação com o RFA.';
  }

  window.BPMA_RFA={
    listVisible,get,create,saveState,finalize,clear,reopen,remove,
    uploadPhoto,signedPhotoUrl,syncPhotoSet,listPhotoFiles,friendlyError
  };
})();
