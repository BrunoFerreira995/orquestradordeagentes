import { Elysia, t } from "elysia";
import { randomUUID } from "node:crypto";
import { createStore } from "./store";
import { migrate } from "../migrate";
import { createLogger } from "./logger";
import { orchestrator } from "./orchestrator";

type Role="admin"|"operator"|"viewer";
const permissions:Record<Role,string[]>={admin:["tasks:read","tasks:write","users:manage","audit:read"],operator:["tasks:read","tasks:write"],viewer:["tasks:read"]};
const logger=createLogger("project-api"); const requestIds=new WeakMap<Request,string>();
const store=createStore(); await migrate(store);
const adminEmail=process.env.ADMIN_EMAIL; const adminPassword=process.env.ADMIN_PASSWORD;
if(adminEmail&&adminPassword&&!await store.get("SELECT id FROM users WHERE email=?",[adminEmail.toLowerCase()])) await store.run("INSERT INTO users(email,password_hash,role,created_at) VALUES(?,?,?,CURRENT_TIMESTAMP)",[adminEmail.toLowerCase(),await Bun.password.hash(adminPassword),"admin"]);
const userFromToken=async(token?:string):Promise<any>=>token?store.get("SELECT u.id,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>CURRENT_TIMESTAMP",[token]):null;
const requireRole=async(headers:any,status:any,roles:Role[])=>{const user=await userFromToken(headers.authorization?.replace("Bearer ",""));return user&&roles.includes(user.role as Role)?user:status(403,{error:"forbidden"})};
export const app=new Elysia()
 .onRequest(({ request, set }) => { const requestId = request.headers.get("x-request-id") ?? randomUUID(); set.headers["x-request-id"] = requestId; set.headers["Access-Control-Allow-Origin"] = process.env.WEB_ORIGIN ?? "http://localhost:3001"; set.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, X-Request-Id"; set.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"; requestIds.set(request, requestId); logger.info("request.started", { request_id: requestId, method: request.method, path: new URL(request.url).pathname }); })
 .onAfterHandle(({ request, set }) => { logger.info("request.completed", { request_id: requestIds.get(request), status: set.status }); })
 .onError(({ request, code, error, set }) => { const requestId = requestIds.get(request); logger.error("request.failed", { request_id: requestId, code, error: error instanceof Error ? error.message : String(error) }); set.headers["x-request-id"] = requestId ?? ""; return new Response(JSON.stringify({ error: code === "VALIDATION" ? "validation_error" : "internal_error", request_id: requestId }), { status: code === "VALIDATION" ? 422 : 500, headers: { "content-type": "application/json", "x-request-id": requestId ?? "" } }); })
 .options("/*",()=>"")
 .get("/",()=>({name:"project-api",status:"ok",database:store.driver}))
 .get("/orchestrator/status",async({headers,status})=>{const user=await requireRole(headers,status,["admin","operator","viewer"]);return user?orchestrator.status():user})
 .get("/orchestrator/tasks",async({headers,status})=>{const user=await requireRole(headers,status,["admin","operator","viewer"]);return user?orchestrator.tasks():user})
 .get("/orchestrator/workers",async({headers,status})=>{const user=await requireRole(headers,status,["admin","operator","viewer"]);return user?orchestrator.workers():user})
 .post("/auth/login",async({body,status})=>{const user:any=await store.get("SELECT * FROM users WHERE email=?",[body.email.toLowerCase()]);if(!user||!(await Bun.password.verify(body.password,user.password_hash)))return status(401,{error:"invalid credentials"});const token=randomUUID()+randomUUID();await store.run("INSERT INTO sessions(token,user_id,expires_at) VALUES(?,?,CURRENT_TIMESTAMP + INTERVAL '8 hours')",[token,user.id]);return {token,user:{id:user.id,email:user.email,role:user.role,permissions:permissions[user.role as Role]}}},{body:t.Object({email:t.String(),password:t.String({minLength:8})})})
 .get("/auth/me",async({headers,status})=>{const user=await userFromToken(headers.authorization?.replace("Bearer ",""));return user?{...user,permissions:permissions[user.role as Role]}:status(401,{error:"unauthorized"})})
 .get("/auth/permissions",async({headers,status})=>{const user=await requireRole(headers,status,["admin","operator","viewer"]);return user?{role:user.role,permissions:permissions[user.role as Role]}:user})
 .get("/users",async({headers,status})=>{const user=await requireRole(headers,status,["admin"]);return user?store.all("SELECT id,email,role,created_at FROM users ORDER BY email"):user})
 .post("/users",async({headers,body,status})=>{const user=await requireRole(headers,status,["admin"]);if(!user)return user;try{return await store.get("INSERT INTO users(email,password_hash,role,created_at) VALUES(?,?,?,CURRENT_TIMESTAMP) RETURNING id,email,role",[body.email.toLowerCase(),await Bun.password.hash(body.password),body.role])}catch{return status(409,{error:"email already exists"})}},{body:t.Object({email:t.String(),password:t.String({minLength:8}),role:t.Union([t.Literal("admin"),t.Literal("operator"),t.Literal("viewer")])})})
 .get("/admin",async({headers,status})=>{const user=await requireRole(headers,status,["admin"]);return user?{ok:true}:user})
 .get("/operator",async({headers,status})=>{const user=await requireRole(headers,status,["admin","operator"]);return user?{ok:true}:user})
 .post("/auth/logout",async({headers})=>{const token=headers.authorization?.replace("Bearer ","");if(token)await store.run("DELETE FROM sessions WHERE token=?",[token]);return {ok:true}})
 .post("/auth/change-password",async({headers,body,status})=>{const user=await userFromToken(headers.authorization?.replace("Bearer ",""));if(!user)return status(401,{error:"unauthorized"});const current:any=await store.get("SELECT password_hash FROM users WHERE id=?",[user.id]);if(!(await Bun.password.verify(body.current_password,current.password_hash)))return status(400,{error:"invalid password"});await store.run("UPDATE users SET password_hash=? WHERE id=?",[await Bun.password.hash(body.new_password),user.id]);return {ok:true}},{body:t.Object({current_password:t.String({minLength:8}),new_password:t.String({minLength:8})})})
 .post("/auth/recovery/request",async({body})=>{const user:any=await store.get("SELECT id FROM users WHERE email=?",[body.email.toLowerCase()]);if(!user)return {accepted:true};const token=randomUUID()+randomUUID();await store.run("INSERT INTO recovery_tokens(token,user_id,expires_at) VALUES(?,?,CURRENT_TIMESTAMP + INTERVAL '30 minutes')",[token,user.id]);return process.env.DEV_SHOW_RECOVERY_TOKEN==="true"?{accepted:true,token}:{accepted:true}},{body:t.Object({email:t.String()})})
 .post("/auth/recovery/reset",async({body,status})=>{const row:any=await store.get("SELECT user_id FROM recovery_tokens WHERE token=? AND used=0 AND expires_at>CURRENT_TIMESTAMP",[body.token]);if(!row)return status(400,{error:"invalid or expired token"});await store.run("UPDATE users SET password_hash=? WHERE id=?",[await Bun.password.hash(body.new_password),row.user_id]);await store.run("UPDATE recovery_tokens SET used=1 WHERE token=?",[body.token]);await store.run("DELETE FROM sessions WHERE user_id=?",[row.user_id]);return {ok:true}},{body:t.Object({token:t.String(),new_password:t.String({minLength:8})})})
;
export const server = import.meta.main ? app.listen(Number(process.env.PORT??3000)) : null;
if (server) console.log(`API running at http://${app.server?.hostname}:${app.server?.port}`);
