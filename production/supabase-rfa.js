(() => {
  const TYPE='RFA';

  function store(){
    if(!window.BPMA_LOCAL_REPORTS) throw new Error('Armazenamento local indisponível. Atualize o BPMA Digital.');
    return window.BPMA_LOCAL_REPORTS;
  }

  function numberForNewRFA(){
    const d=new Date();
    const pad=n=>String(n).padStart(2,'0');
    const day=`${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
    const time=`${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const rand=Math.random().toString(36).slice(2,5).toUpperCase();
    return `RFA-${day}-${time}-${rand}`;
  }

  async function listVisible(){ return store().list(TYPE); }
  async function get(id){
    const row=await store().get(id);
    return row?.tipo===TYPE?row:null;
  }

  async function create(session,initialState=null){
    if(!session?.id) throw new Error('Sessão inválida.');
    const now=new Date().toISOString();
    const row={
      id:store().newId('rfa'),tipo:TYPE,numero:numberForNewRFA(),status:'Rascunho',
      unidade:session.unit||'',authorId:session.id,autor:session.name||session.user||'Usuário',
      createdAt:now,updatedAt:now,finalizedAt:null,
      state:initialState||null,prefilledFromTemplate:false,
      dados:{state:initialState||null,prefilledFromTemplate:false,meta:{autor:session.name||'',usuario:session.user||'',email:session.email||'',localOnly:true}}
    };
    return store().put(row);
  }

  async function saveState(record,state,numero){
    const current=(await get(record?.id))||record;
    if(!current?.id) throw new Error('RFA local não encontrado.');
    const dados={...(current.dados||{}),state,prefilledFromTemplate:false,meta:{...(current.dados?.meta||{}),localOnly:true}};
    return store().put({...current,numero:numero||current.numero,state,dados,prefilledFromTemplate:false});
  }

  async function finalize(record,state,numero){
    const current=(await get(record?.id))||record;
    if(!current?.id) throw new Error('RFA local não encontrado.');
    const now=new Date().toISOString();
    const previous=Number(current.dados?.version?.number)||0;
    const number=previous+1;
    const history=[...(current.dados?.version?.history||[]),{number,at:now}];
    const dados={...(current.dados||{}),state,prefilledFromTemplate:false,meta:{...(current.dados?.meta||{}),localOnly:true},version:{number,history}};
    return store().put({...current,numero:numero||current.numero,state,dados,status:'Finalizado',finalizedAt:now,prefilledFromTemplate:false});
  }

  async function clear(id){
    const current=await get(id);
    if(!current) throw new Error('RFA local não encontrado.');
    return store().put({...current,state:null,dados:{...(current.dados||{}),state:null}});
  }

  async function startRevision(id){
    const current=await get(id);
    if(!current) throw new Error('RFA local não encontrado.');
    if(current.status!=='Finalizado')return current;
    const oldVersion=current.dados?.version;
    const version=oldVersion||{number:1,history:[{number:1,at:current.finalizedAt||current.updatedAt}]};
    return store().put({...current,status:'Em revisão',finalizedAt:null,dados:{...(current.dados||{}),version}});
  }
  const reopen=startRevision;

  async function remove(id){ return store().remove(id); }

  // Compatibilidade com a interface do RFA. Na 3.9.4 fotos/anexos ficam somente
  // no IndexedDB do aparelho enquanto o relatório estiver sendo trabalhado.
  async function uploadPhoto(_reportId,dataUrl){ return dataUrl; }
  async function signedPhotoUrl(path){ return path; }
  async function syncPhotoSet(){ return true; }
  async function listPhotoFiles(){ return []; }
  async function uploadDocument(_reportId,file){
    return {path:'',mime:String(file?.type||''),name:String(file?.name||'Anexo')};
  }
  async function signedFileUrl(path){ return path; }
  async function syncDocumentSet(){ return true; }
  async function listDocumentFiles(){ return []; }
  async function deleteDocumentFile(){ return true; }

  function friendlyError(err){
    const s=String(err?.message||'');
    if(s.toLowerCase().includes('quota')) return 'O armazenamento local deste aparelho está cheio. Salve o PDF e remova rascunhos antigos.';
    return s||'Não foi possível concluir a operação com o RFA neste aparelho.';
  }

  window.BPMA_RFA={
    LOCAL_ONLY:true,listVisible,get,create,saveState,finalize,clear,reopen,remove,
    startRevision,uploadPhoto,signedPhotoUrl,syncPhotoSet,listPhotoFiles,
    uploadDocument,signedFileUrl,syncDocumentSet,listDocumentFiles,deleteDocumentFile,
    friendlyError
  };
})();
