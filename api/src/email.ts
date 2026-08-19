export async function sendRecoveryEmail(to: string, token: string) {
  const key=process.env.RESEND_API_KEY; const from=process.env.EMAIL_FROM; const app=process.env.APP_URL ?? process.env.WEB_ORIGIN ?? "http://localhost:3001";
  if (!key || !from) return false;
  const response=await fetch("https://api.resend.com/emails", { method:"POST", headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"}, body:JSON.stringify({from,to,subject:"Recuperação de acesso",html:`<p>Solicitamos a recuperação da sua senha.</p><p><a href="${app}/?recovery_token=${encodeURIComponent(token)}">Criar nova senha</a></p><p>O link expira em 30 minutos.</p>`}) });
  return response.ok;
}
