import { beforeAll, describe, expect, test } from "bun:test";
import { unlinkSync } from "node:fs";

const database = `/tmp/generated-project-${process.pid}.db`;
try { unlinkSync(database); } catch {}
process.env.DB_PATH = database; process.env.ADMIN_EMAIL = "admin@test.local"; process.env.ADMIN_PASSWORD = "password123";
const { app } = await import("../src/index");
const call = (path: string, init?: RequestInit) => app.fetch(new Request(`http://localhost${path}`, init));

describe("API Elysia", () => {
  test("expõe health check", async () => { expect((await call("/")).status).toBe(200); });
  test("integra login, sessão e permissões", async () => { const login = await call("/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "admin@test.local", password: "password123" }) }); expect(login.status).toBe(200); const { token, user } = await login.json(); expect(user.role).toBe("admin"); const me = await call("/auth/me", { headers: { authorization: `Bearer ${token}` } }); expect(me.status).toBe(200); expect((await me.json()).email).toBe("admin@test.local"); });
});
