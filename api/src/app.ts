import { Database } from "bun:sqlite";
import { Elysia, t } from "elysia";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { authenticate, audit, can, changePassword, consumeRecoveryToken, createRecoveryToken, createSession, createUser, resetPassword } from "./auth";
import { sendRecoveryEmail } from "./email";
import { spawn } from "node:child_process";

const json = (value: string | null) => value ? JSON.parse(value) : null;

export function createApp(db: Database) {
  const requireRole = async (headers: any, status: any, roles: any[]) => { const user=await authenticate(db, headers.authorization); return can(user, roles) ? user : status(401, { error: "unauthorized" }); };
  return new Elysia()
    .onRequest(({ set }) => { set.headers["Access-Control-Allow-Origin"] = process.env.WEB_ORIGIN ?? "http://localhost:3001"; set.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"; set.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, OPTIONS"; })
    .options("/*", () => "")
    .get("/health", () => ({ status: "ok" }))
    .post("/auth/login", async ({ body, status }: any) => { const session=await createSession(db, body.email, body.password); if (!session) return status(401, { error: "invalid credentials" }); audit(db, session.user, "login"); return session; }, { body: t.Object({ email: t.String(), password: t.String() }) })
    .get("/auth/me", async ({ headers, status }) => { const user=await requireRole(headers,status,["admin","operator","viewer"]); return user; })
    .post("/auth/change-password", async ({ body, headers, status }: any) => { const user=await requireRole(headers,status,["admin","operator","viewer"]); if (user instanceof Response) return user; if (!await changePassword(db,user.id,body.current_password,body.new_password)) return status(400,{error:"current password is invalid"}); audit(db,user,"change_password",`user:${user.id}`); return {ok:true}; }, { body: t.Object({ current_password: t.String({ minLength: 8 }), new_password: t.String({ minLength: 8 }) }) })
    .post("/auth/recovery/request", async ({ body }: any) => { const recovery=createRecoveryToken(db,body.email); if (recovery) { audit(db,null,"password_recovery_requested",`user:${recovery.user_id}`); const sent=await sendRecoveryEmail(recovery.email,recovery.token); audit(db,null,sent?"password_recovery_sent":"password_recovery_email_not_configured",`user:${recovery.user_id}`); } return {accepted:true}; }, { body: t.Object({ email: t.String() }) })
    .post("/auth/recovery/reset", async ({ body, status }: any) => { const userId=await consumeRecoveryToken(db,body.token,body.new_password); if (!userId) return status(400,{error:"invalid or expired recovery token"}); audit(db,null,"password_recovery_completed",`user:${userId}`); return {ok:true}; }, { body: t.Object({ token:t.String(), new_password:t.String({minLength:8}) }) })
    .get("/tasks", async ({ query, headers, status }) => { const auth=await requireRole(headers,status,["admin","operator","viewer"]); if (auth instanceof Response) return auth;
      const limit = Math.min(Number(query.limit ?? 100), 500);
      return db.query("SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?").all(limit)
        .map((task: any) => ({ ...task, dependencies: json(task.dependencies), result: json(task.result) }));
    }, { query: t.Object({ limit: t.Optional(t.Numeric({ minimum: 1, maximum: 500 })) }) })
    .get("/tasks/:id", async ({ params, headers, status }) => { const auth=await requireRole(headers,status,["admin","operator","viewer"]); if (auth instanceof Response) return auth;
      const task: any = db.query("SELECT * FROM tasks WHERE id = ?").get(params.id);
      return task ? { ...task, dependencies: json(task.dependencies), result: json(task.result) } : status(404, { error: "task not found" });
    })
    .get("/workers", async ({ headers, status }) => { const auth=await requireRole(headers,status,["admin","operator","viewer"]); if (auth instanceof Response) return auth; return db.query("SELECT * FROM workers ORDER BY id").all(); })
    .get("/metrics", async ({ headers, status }) => { const auth=await requireRole(headers,status,["admin","operator","viewer"]); if (auth instanceof Response) return auth; return db.query("SELECT * FROM metrics ORDER BY created_at DESC LIMIT 100").all(); })
    .get("/logs/:worker", async ({ params, headers, status }) => { const auth=await requireRole(headers,status,["admin","operator","viewer"]); if (auth instanceof Response) return auth;
      const worker = params.worker.replace(/[^a-zA-Z0-9_-]/g, "");
      const path = join(process.cwd(), "..", "logs", `${worker}.log`);
      return existsSync(path) ? { worker, content: readFileSync(path, "utf8").slice(-20000) } : status(404, { error: "log not found" });
    })
    .get("/templates", async ({ headers, status }) => { const auth=await requireRole(headers,status,["admin","operator","viewer"]); if (auth instanceof Response) return auth;
      const root = join(process.cwd(), "..", "templates");
      if (!existsSync(root)) return [];
      return [...new Bun.Glob("*.json").scanSync({ cwd: root })].map(name => JSON.parse(readFileSync(join(root, name), "utf8")));
    })
    .post("/templates/:id/generate", async ({ params, body, headers, status }: any) => {
      const auth=await requireRole(headers,status,["admin"]); if (auth instanceof Response) return auth;
      if (!/^[a-z0-9-]+$/.test(params.id) || !/^workspace\/[a-zA-Z0-9_-]+$/.test(body.target)) return status(400,{error:"invalid template or target"});
      const manifestPath=join(process.cwd(),"..","templates",`${params.id}.json`); if (!existsSync(manifestPath)) return status(404,{error:"template not found"});
      const root=join(process.cwd(),".."); const child=spawn("bash",[join(root,"scripts/create_project.sh"),"--template",params.id,body.target],{cwd:root,env:process.env});
      const output:{stdout:string;stderr:string}={stdout:"",stderr:""}; child.stdout.on("data",chunk=>output.stdout+=chunk); child.stderr.on("data",chunk=>output.stderr+=chunk);
      const exit=await new Promise<number>(resolve=>child.on("close",code=>resolve(code ?? 1))); audit(db,auth,exit===0?"generate_template":"generate_template_failed",`template:${params.id}`,{target:body.target});
      return exit===0 ? {ok:true,template:params.id,target:body.target,output:output.stdout} : status(500,{error:"template generation failed",details:output.stderr});
    }, { body:t.Object({target:t.String()}) })
    .post("/tasks/:id/cancel", async ({ params, headers, status }) => {
      const auth = await requireRole(headers,status,["admin","operator"]); if (auth instanceof Response) return auth;
      const result = db.run("UPDATE tasks SET status='CANCELLED',error='cancelled from dashboard',finished_at=datetime('now') WHERE id=? AND status IN ('PENDING','READY','WAITING','RETRYING','RUNNING')", [params.id]);
      if (result.changes) audit(db,auth,"cancel_task",`task:${params.id}`); return result.changes ? { ok: true } : status(404, { error: "task not found or not cancellable" });
    })
    .post("/tasks/:id/retry", async ({ params, headers, status }) => {
      const auth = await requireRole(headers,status,["admin","operator"]); if (auth instanceof Response) return auth;
      const result = db.run("UPDATE tasks SET status='RETRYING',error=NULL,finished_at=NULL WHERE id=? AND status IN ('FAILED','BLOCKED','CANCELLED')", [params.id]);
      if (result.changes) audit(db,auth,"retry_task",`task:${params.id}`); return result.changes ? { ok: true } : status(404, { error: "task not retryable" });
    })
    .patch("/tasks/:id/priority", async ({ params, body, headers, status }) => {
      const auth = await requireRole(headers,status,["admin","operator"]); if (auth instanceof Response) return auth;
      const result = db.run("UPDATE tasks SET priority=? WHERE id=?", [body.priority, params.id]);
      if (result.changes) audit(db,auth,"change_priority",`task:${params.id}`,{priority:body.priority}); return result.changes ? { ok: true } : status(404, { error: "task not found" });
    }, { body: t.Object({ priority: t.Integer({ minimum: -100, maximum: 100 }) }) })
    .get("/users", async ({ headers, status }) => { const auth=await requireRole(headers,status,["admin"]); if (auth instanceof Response) return auth; return db.query("SELECT id,email,role,active,created_at FROM users ORDER BY email").all(); })
    .post("/users", async ({ body, headers, status }: any) => { const auth=await requireRole(headers,status,["admin"]); if (auth instanceof Response) return auth; try { const user=await createUser(db,body.email,body.password,body.role); audit(db,auth,"create_user",`user:${(user as any).id}`,{email:body.email,role:body.role}); return user; } catch { return status(409,{error:"email already exists"}); } }, { body: t.Object({ email:t.String(), password:t.String({minLength:8}), role:t.Union([t.Literal("admin"),t.Literal("operator"),t.Literal("viewer")]) }) })
    .patch("/users/:id/role", async ({ params, body, headers, status }: any) => { const auth=await requireRole(headers,status,["admin"]); if (auth instanceof Response) return auth; const result=db.query("UPDATE users SET role=? WHERE id=?").run(body.role,params.id); if (result.changes) audit(db,auth,"change_role",`user:${params.id}`,{role:body.role}); return result.changes ? {ok:true} : status(404,{error:"user not found"}); }, { body:t.Object({role:t.Union([t.Literal("admin"),t.Literal("operator"),t.Literal("viewer")])}) })
    .post("/users/:id/reset-password", async ({ params, body, headers, status }: any) => { const auth=await requireRole(headers,status,["admin"]); if (auth instanceof Response) return auth; const ok=await resetPassword(db,Number(params.id),body.new_password); if (ok) audit(db,auth,"reset_password",`user:${params.id}`); return ok ? {ok:true} : status(404,{error:"user not found"}); }, { body:t.Object({new_password:t.String({minLength:8})}) })
    .get("/audit", async ({ query, headers, status }: any) => { const auth=await requireRole(headers,status,["admin"]); if (auth instanceof Response) return auth; return db.query("SELECT id,actor_user_id,actor_email,action,resource,details,created_at FROM audit_log ORDER BY id DESC LIMIT ?").all(Math.min(Number(query.limit ?? 100),500)); }, { query:t.Object({limit:t.Optional(t.Numeric({minimum:1,maximum:500}))}) });
}
