(() => {
window.BPMA_FINAL_ADMIN={panel:()=>`<div class="panel"><h3>Inicialização da versão final</h3><p>Mantém o Admin conectado e cria a conta <b>testecpu</b> (perfil CPU). Arquiva os demais acessos, libera suas matrículas e limpa a auditoria. Os relatórios permanecem preservados.</p><label>Senha para testecpu <input id="finalTestPassword" type="password" minlength="8" maxlength="72" autocomplete="new-password"></label><label>Digite ZERAR USUARIOS E AUDITORIA <input id="finalConfirmation" autocomplete="off"></label><button id="resetFinalUsers" class="btn">Inicializar usuários e auditoria</button><p id="finalResetResult" role="status"></p></div>`};
document.addEventListener('click',async e=>{
 if(e.target.id!=='resetFinalUsers')return;
 const out=document.getElementById('finalResetResult');
 if(document.getElementById('finalConfirmation').value!=='ZERAR USUARIOS E AUDITORIA'){out.textContent='Confira a frase de confirmação.';return;}
 const password=document.getElementById('finalTestPassword').value;
 if(password.length<8||new TextEncoder().encode(password).length>72){out.textContent='A senha deve ter ao menos 8 caracteres e no máximo 72 bytes.';return;}
 e.target.disabled=true;out.textContent='Inicializando…';
 try{const result=await window.BPMA_USERS.resetFinal(password);out.textContent=`Concluído: ${result.archived} acessos arquivados. Mantidos Admin e testecpu. Auditoria zerada.`;document.getElementById('finalTestPassword').value='';location.reload();}
 catch(err){out.textContent=window.BPMA_USERS.friendlyError(err);e.target.disabled=false;}
});
})();
