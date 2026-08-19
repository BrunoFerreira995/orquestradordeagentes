import { beforeEach, describe, expect, test } from "bun:test";
import { api } from "../auth/web-api";

const values = new Map<string, string>();
Object.defineProperty(globalThis, "window", { value: {}, configurable: true });
Object.defineProperty(globalThis, "localStorage", { value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) }, configurable: true });

beforeEach(() => { values.clear(); });

describe("cliente da API", () => {
  test("salva token após login", async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ token: "token-1", user: { id: 1, email: "admin@test.local", role: "admin", permissions: ["tasks:read"] } }), { status: 200 })) as typeof fetch;
    const user = await api.login("admin@test.local", "password123");
    expect(user.role).toBe("admin");
    expect(localStorage.getItem("project_token")).toBe("token-1");
  });

  test("envia Bearer token nas chamadas autenticadas", async () => {
    values.set("project_token", "token-2");
    let authorization = "";
    globalThis.fetch = (async (_input, init) => { authorization = new Headers(init?.headers).get("authorization") ?? ""; return new Response(JSON.stringify({ id: 1, email: "admin@test.local", role: "admin", permissions: [] }), { status: 200 }); }) as typeof fetch;
    await api.me();
    expect(authorization).toBe("Bearer token-2");
  });
});
