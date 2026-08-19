"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type User } from "../web-api";
export default function Settings(){ const [user,setUser]=useState<User|null>(null); useEffect(()=>{api.me().then(setUser).catch(()=>{});},[]); return <main><nav><Link href="/">Conta</Link> · <Link href="/dashboard">Dashboard</Link> · <Link href="/users">Usuários</Link> · <Link href="/settings">Configurações</Link></nav><h1>Configurações</h1><p>Conta: {user?.email??"não autenticada"}</p><p>Role: {user?.role??"—"}</p><p>API configurada por NEXT_PUBLIC_API_URL.</p></main>; }
