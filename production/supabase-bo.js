(() => {
  const TYPE='BO';

  function store(){
    if(!window.BPMA_LOCAL_REPORTS) throw new Error('Armazenamento local indisponível. Atualize o BPMA Digital.');
    return window.BPMA_LOCAL_REPORTS;
  }

  function numberForNewBO(){
    const d=new Date();
    const pad=n=>String(n).padStart(2,'0');
    const day=`${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
    const time=`${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const rand=Math.random().toString(36).slice(2,5).toUpperCase();
    return `BO-${day}-${time}-${rand}`;
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
      id:store().newId('bo'),tipo:TYPE,numero:numberForNewBO(),status:'Rascunho',
      unidade:session.unit||'',authorId:session.id,autor:session.name||session.user||'Usuário',
      createdAt:now,updatedAt:now,finalizedAt:null,
      state:initialState||null,
      dados:{state:initialState||null,meta:{autor:session.name||'',usuario:session.user||'',email:session.email||'',localOnly:true}}
    };
    return store().put(row);
  }

  async function saveState(record,state){
    const current=(await get(record?.id))||record;
    if(!current?.id) throw new Error('BO local não encontrado.');
    const dados={...(current.dados||{}),state,meta:{...(current.dados?.meta||{}),localOnly:true}};
    return store().put({...current,state,dados});
  }

  async function finalize(id,state){
    const current=await get(id);
    if(!current) throw new Error('BO local não encontrado.');
    const now=new Date().toISOString();
    const dados={...(current.dados||{}),state,meta:{...(current.dados?.meta||{}),localOnly:true}};
    return store().put({...current,state,dados,status:'Finalizado',finalizedAt:now});
  }

  async function clear(id){
    const current=await get(id);
    if(!current) throw new Error('BO local não encontrado.');
    return store().put({...current,state:null,dados:{...(current.dados||{}),state:null}});
  }

  async function reopen(id){
    const current=await get(id);
    if(!current) throw new Error('BO local não encontrado.');
    return store().put({...current,status:'Reaberto',finalizedAt:null});
  }

  async function remove(id){ return store().remove(id); }

  function friendlyError(err){
    const s=String(err?.message||'');
    if(s.toLowerCase().includes('quota')) return 'O armazenamento local deste aparelho está cheio. Gere/salve os PDFs e exclua rascunhos antigos.';
    return s||'Não foi possível concluir a operação com o BO neste aparelho.';
  }

  window.BPMA_BO={LOCAL_ONLY:true,listVisible,get,create,saveState,finalize,clear,reopen,remove,friendlyError};
})();
