import { Database } from "bun:sqlite";
import { Elysia, t } from "elysia";

const json = (value: string | null) => value ? JSON.parse(value) : null;

export function createApp(db: Database) {
  return new Elysia()
    .get("/health", () => ({ status: "ok" }))
    .get("/tasks", ({ query }) => {
      const limit = Math.min(Number(query.limit ?? 100), 500);
      return db.query("SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?").all(limit)
        .map((task: any) => ({ ...task, dependencies: json(task.dependencies), result: json(task.result) }));
    }, { query: t.Object({ limit: t.Optional(t.Numeric({ minimum: 1, maximum: 500 })) }) })
    .get("/tasks/:id", ({ params, status }) => {
      const task: any = db.query("SELECT * FROM tasks WHERE id = ?").get(params.id);
      return task ? { ...task, dependencies: json(task.dependencies), result: json(task.result) } : status(404, { error: "task not found" });
    })
    .get("/workers", () => db.query("SELECT * FROM workers ORDER BY id").all())
    .get("/metrics", () => db.query("SELECT * FROM metrics ORDER BY created_at DESC LIMIT 100").all());
}
