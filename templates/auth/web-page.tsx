"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type User } from "./web-api";

export default function Home(){
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [recovery,setRecovery]=useState("");
  const [user,setUser]=useState<User|null>(null); const [message,setMessage]=useState(""); const [loading,setLoading]=useState(true); const [orchestratorState,setOrchestratorState]=useState("desconectado");
  useEffect(()=>{api.me().then(user=>{setUser(user); return api.orchestratorStatus();}).then(result=>setOrchestratorState(result.enabled?(result.error?"indisponível":"conectado"):"desativado")).catch(()=>{}).finally(()=>setLoading(false));},[]);
  const login=async()=>{try{setMessage("");setUser(await api.login(email,password));setMessage("Login realizado.");}catch(error){setMessage(error instanceof Error?error.message:"Credenciais inválidas");}};
  const requestRecovery=async()=>{try{await api.requestRecovery(recovery);setMessage("Se o e-mail existir, enviaremos as instruções.");}catch{setMessage("Não foi possível solicitar a recuperação.");}};
  const logout=async()=>{try{await api.logout();setUser(null);setMessage("Sessão encerrada.");}catch{setMessage("Não foi possível encerrar a sessão.");}};
  if(loading)return <main><p>Carregando sessão…</p></main>;
  return <main><h1>Project account</h1>{user?<section><nav><Link href="/dashboard">Dashboard</Link> · <Link href="/users">Usuários</Link> · <Link href="/settings">Configurações</Link></nav><h2>Olá, {user.email}</h2><p>Role: {user.role}</p><p>Permissões: {user.permissions.join(", ")||"nenhuma"}</p><p>Orquestrador central: {orchestratorState}</p><button onClick={logout}>Sair</button></section>:<><section><h2>Entrar</h2><input aria-label="e-mail" placeholder="e-mail" value={email} onChange={e=>setEmail(e.target.value)}/><input aria-label="senha" type="password" placeholder="senha" value={password} onChange={e=>setPassword(e.target.value)}/><button onClick={login}>Entrar</button></section><section><h2>Recuperar senha</h2><input aria-label="e-mail de recuperação" placeholder="e-mail" value={recovery} onChange={e=>setRecovery(e.target.value)}/><button onClick={requestRecovery}>Enviar instruções</button></section></>}{message&&<p role="status">{message}</p>}</main>;
}
