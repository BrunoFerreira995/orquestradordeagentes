import { Database } from "bun:sqlite";
import postgres from "postgres";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type Store = { driver:string; get:(q:string,v?:unknown[])=>Promise<any>; all:(q:string,v?:unknown[])=>Promise<any[]>; run:(q:string,v?:unknown[])=>Promise<{changes:number}>; exec:(q:string)=>Promise<void> };

export function createStore(): Store {
  if ((process.env.DB_DRIVER ?? "sqlite") === "postgres") {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL é obrigatório quando DB_DRIVER=postgres");
    const sql = postgres(process.env.DATABASE_URL, { max: Number(process.env.DB_POOL_SIZE ?? 10), idle_timeout: 20 });
    const normalize=(q:string)=>q.replace(/\?/g,()=>`$${++placeholder}`);
    let placeholder=0;
    const query=async(q:string,v:unknown[]=[])=>{placeholder=0;return sql.unsafe(normalize(q),v as any[])};
    return {driver:"postgres",get:async(q,v=[])=>{const rows=await query(q,v);return rows[0]},all:async(q,v=[])=>query(q,v),run:async(q,v=[])=>{const result:any=await query(q,v);return {changes:result.count??result.length}},exec:async(q)=>{await sql.unsafe(q)}};
  }
  const path=process.env.DB_PATH??"data/project.db"; mkdirSync(dirname(path),{recursive:true}); const db = new Database(path);
  const normalize=(q:string)=>q.replace(/CURRENT_TIMESTAMP \+ INTERVAL '8 hours'/g,"datetime('now','+8 hours')").replace(/CURRENT_TIMESTAMP \+ INTERVAL '30 minutes'/g,"datetime('now','+30 minutes')");
  return {driver:"sqlite",get:async(q,v=[])=>db.query(normalize(q)).get(...v as any[]),all:async(q,v=[])=>db.query(normalize(q)).all(...v as any[]),run:async(q,v=[])=>{const result:any=db.query(normalize(q)).run(...v as any[]);return {changes:result.changes??0}},exec:async(q)=>{db.exec(q)}};
}
