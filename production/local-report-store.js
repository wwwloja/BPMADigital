(() => {
  const DB_NAME='bpma-digital-local-reports';
  const DB_VERSION=2; // 4.0: limpeza única dos dados locais de desenvolvimento
  const STORE='reports';
  let dbPromise=null;

  function openDb(){
    if(dbPromise) return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{
        const db=req.result;
        let store;
        if(!db.objectStoreNames.contains(STORE)){
          store=db.createObjectStore(STORE,{keyPath:'id'});
        }else{
          store=req.transaction.objectStore(STORE);
          // Migração 4.0: inicia a operação real sem BO/RFA/rascunhos locais antigos.
          store.clear();
        }
        if(!store.indexNames.contains('tipo')) store.createIndex('tipo','tipo',{unique:false});
        if(!store.indexNames.contains('authorId')) store.createIndex('authorId','authorId',{unique:false});
        if(!store.indexNames.contains('updatedAt')) store.createIndex('updatedAt','updatedAt',{unique:false});
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error('Não foi possível abrir o armazenamento local.'));
    });
    return dbPromise;
  }

  async function withStore(mode,fn){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,mode);
      const store=tx.objectStore(STORE);
      let result;
      try{ result=fn(store,tx); }
      catch(err){ reject(err); return; }
      tx.oncomplete=()=>resolve(result);
      tx.onerror=()=>reject(tx.error||new Error('Falha no armazenamento local.'));
      tx.onabort=()=>reject(tx.error||new Error('Operação local cancelada.'));
    });
  }

  async function put(record){
    const copy={...record,updatedAt:new Date().toISOString()};
    await withStore('readwrite',store=>{store.put(copy)});
    return copy;
  }

  async function get(id){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readonly');
      const req=tx.objectStore(STORE).get(id);
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>reject(req.error||new Error('Falha ao ler rascunho local.'));
    });
  }

  async function list(tipo=''){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readonly');
      const store=tx.objectStore(STORE);
      const req=tipo && store.indexNames.contains('tipo')
        ? store.index('tipo').getAll(tipo)
        : store.getAll();
      req.onsuccess=()=>{
        const rows=Array.isArray(req.result)?req.result:[];
        rows.sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')));
        resolve(rows);
      };
      req.onerror=()=>reject(req.error||new Error('Falha ao listar rascunhos locais.'));
    });
  }

  async function remove(id){
    await withStore('readwrite',store=>{store.delete(id)});
    return true;
  }

  function newId(prefix='local'){
    const id=(globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`);
    return `${prefix}-${id}`;
  }

  window.BPMA_LOCAL_REPORTS={openDb,put,get,list,remove,newId};
})();
