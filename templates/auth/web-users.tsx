"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type User } from "../web-api";
export default function Users(){ const [users,setUsers]=useState<User[]>([]); const [message,setMessage]=useState("carregando"); useEffect(()=>{api.users().then(value=>{setUsers(value);setMessage("")}).catch(error=>setMessage(error instanceof Error?error.message:"Acesso negado"));},[]); return <main><nav><Link href="/">Conta</Link> · <Link href="/dashboard">Dashboard</Link> · <Link href="/users">Usuários</Link> · <Link href="/settings">Configurações</Link></nav><h1>Usuários</h1>{message&&<p>{message}</p>}<ul>{users.map(user=><li key={user.id}>{user.email} — {user.role}</li>)}</ul></main>; }
