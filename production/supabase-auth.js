(() => {
  const AUTH_STORAGE_KEY = 'bpma_supabase_auth_v1';
  // 3.8.3: remove sessão persistente das versões anteriores.
  try{localStorage.removeItem(AUTH_STORAGE_KEY)}catch{}

  function config(){
    const cfg = window.BPMA_SUPABASE_CONFIG || {};
    if(!cfg.url || !cfg.publishableKey){
      throw new Error('Configuração do Supabase não encontrada.');
    }
    return {url:String(cfg.url).replace(/\/$/,''), key:String(cfg.publishableKey)};
  }

  async function request(path,{method='GET',token='',body=null,headers={}}={}){
    const {url,key}=config();
    const h={apikey:key,...headers};
    if(token) h.Authorization=`Bearer ${token}`;
    if(body!==null) h['Content-Type']='application/json';

    let response;
    try{
      response=await fetch(url+path,{method,headers:h,body:body===null?undefined:JSON.stringify(body)});
    }catch(err){
      throw new Error('Não foi possível conectar ao Supabase. Verifique a internet e tente novamente.');
    }

    const text=await response.text();
    let data=null;
    if(text){
      try{data=JSON.parse(text)}catch{data=text}
    }

    if(!response.ok){
      const message=(data && (data.msg||data.message||data.error_description||data.error)) || `Erro ${response.status}`;
      const error=new Error(message);
      error.status=response.status;
      error.code=data?.code || data?.error_code || '';
      throw error;
    }
    return data;
  }

  function saveSession(data){
    if(!data?.access_token || !data?.refresh_token || !data?.user) throw new Error('Sessão inválida recebida do Supabase.');
    const saved={
      access_token:data.access_token,
      refresh_token:data.refresh_token,
      token_type:data.token_type||'bearer',
      expires_at:Date.now()+Number(data.expires_in||3600)*1000,
      user:data.user
    };
    sessionStorage.setItem(AUTH_STORAGE_KEY,JSON.stringify(saved));
    return saved;
  }

  function loadSession(){
    try{return JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY)||'null')}catch{return null}
  }

  function clearSession(){sessionStorage.removeItem(AUTH_STORAGE_KEY)}

  async function signIn(email,password){
    const data=await request('/auth/v1/token?grant_type=password',{
      method:'POST', body:{email,password}
    });
    return saveSession(data);
  }

  async function refresh(saved=loadSession()){
    if(!saved?.refresh_token) return null;
    try{
      const data=await request('/auth/v1/token?grant_type=refresh_token',{
        method:'POST',body:{refresh_token:saved.refresh_token}
      });
      return saveSession(data);
    }catch(err){
      clearSession();
      return null;
    }
  }

  async function restore(){
    let saved=loadSession();
    if(!saved) return null;
    if(!saved.access_token || !saved.user){clearSession();return null}
    if(Number(saved.expires_at||0) <= Date.now()+30000){
      saved=await refresh(saved);
    }
    return saved;
  }

  async function profile(authSession){
    if(!authSession?.access_token || !authSession?.user?.id) return null;
    const id=encodeURIComponent(authSession.user.id);
    const rows=await request(`/rest/v1/profiles?id=eq.${id}&select=id,nome,usuario,role,unidade,ativo`,{
      token:authSession.access_token,
      headers:{Accept:'application/json'}
    });
    return Array.isArray(rows)?(rows[0]||null):rows;
  }

  async function signOut(){
    const saved=loadSession();
    if(saved?.access_token){
      try{await request('/auth/v1/logout',{method:'POST',token:saved.access_token})}catch{}
    }
    clearSession();
  }


  async function sendRecovery(email,redirectTo){
    const path='/auth/v1/recover'+(redirectTo?`?redirect_to=${encodeURIComponent(redirectTo)}`:'');
    return request(path,{method:'POST',body:{email}});
  }

  async function updatePassword(password){
    let saved=await restore();
    if(!saved?.access_token) throw new Error('Sessão expirada. Entre novamente.');
    return request('/auth/v1/user',{
      method:'PUT',
      token:saved.access_token,
      body:{password}
    });
  }

  async function consumeRecoveryFromUrl(){
    const raw=String(location.hash||'').replace(/^#/,'');
    if(!raw || !raw.includes('access_token=')) return null;
    const p=new URLSearchParams(raw);
    if(p.get('type')!=='recovery') return null;

    const access_token=p.get('access_token');
    const refresh_token=p.get('refresh_token');
    if(!access_token || !refresh_token) throw new Error('Link de recuperação inválido ou incompleto.');

    const user=await request('/auth/v1/user',{token:access_token});
    const saved=saveSession({
      access_token,
      refresh_token,
      expires_in:Number(p.get('expires_in')||3600),
      token_type:p.get('token_type')||'bearer',
      user
    });
    history.replaceState({},'',location.pathname+'?recovery=1');
    return saved;
  }

  function friendlyError(err){
    const raw=String(err?.message||'').toLowerCase();
    if(raw.includes('invalid login credentials') || raw.includes('invalid_credentials')) return 'E-mail ou senha inválidos.';
    if(raw.includes('email not confirmed')) return 'O e-mail ainda não foi confirmado.';
    if(raw.includes('password') && raw.includes('weak')) return 'A nova senha não atende aos requisitos de segurança.';
    if(raw.includes('expired')) return 'O link ou a sessão expirou. Solicite novamente.';
    if(raw.includes('failed to fetch') || raw.includes('conectar')) return 'Não foi possível conectar ao Supabase. Verifique a internet.';
    return err?.message || 'Não foi possível entrar.';
  }

  window.BPMA_AUTH={signIn,restore,profile,signOut,refresh,loadSession,clearSession,sendRecovery,updatePassword,consumeRecoveryFromUrl,friendlyError};
})();
