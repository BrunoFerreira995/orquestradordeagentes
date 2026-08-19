"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type User } from "../web-api";
export default function Dashboard(){ const [user,setUser]=useState<User|null>(null); const [status,setStatus]=useState("carregando"); const [tasks,setTasks]=useState<unknown[]>([]); const [workers,setWorkers]=useState<unknown[]>([]);
  useEffect(()=>{api.me().then(setUser).then(()=>Promise.all([api.orchestratorStatus(),api.orchestratorTasks(),api.orchestratorWorkers()])).then(([orchestrator,tasksResult,workersResult])=>{setStatus(orchestrator.enabled?(orchestrator.error?"indisponível":"conectado"):"desativado");setTasks(tasksResult.data??[]);setWorkers(workersResult.data??[]);}).catch(()=>setStatus("não autenticado"));},[]);
  return <main><nav><Link href="/">Conta</Link> · <Link href="/dashboard">Dashboard</Link> · <Link href="/users">Usuários</Link> · <Link href="/settings">Configurações</Link></nav><h1>Dashboard do projeto</h1><p>Usuário: {user?.email??"—"}</p><p>Orquestrador: {status}</p><p>Tasks: {tasks.length}</p><p>Workers: {workers.length}</p></main>;
}
