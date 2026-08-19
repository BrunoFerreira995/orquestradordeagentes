import { createHash, randomUUID } from "node:crypto";
import { Database } from "bun:sqlite";

export type Role = "admin" | "operator" | "viewer";
export type User = { id: number; email: string; role: Role };

const digest = (value: string) => createHash("sha256").update(value).digest("hex");

export function ensureAuthSchema(db: Database) {
  db.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'viewer', active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id)); CREATE TABLE IF NOT EXISTS password_reset_tokens (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires_at TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id)); CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id INTEGER, actor_email TEXT NOT NULL, action TEXT NOT NULL, resource TEXT, details TEXT, created_at TEXT NOT NULL);`);
}

export async function seedAdmin(db: Database) {
  const email = process.env.ADMIN_EMAIL; const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || db.query("SELECT id FROM users WHERE email=?").get(email.toLowerCase())) return;
  db.query("INSERT INTO users(email,password_hash,role,created_at) VALUES(?,?,?,datetime('now'))").run(email, await Bun.password.hash(password), "admin");
}

export function audit(db: Database, actor: User | null, action: string, resource = "", details: unknown = {}) {
  db.query("INSERT INTO audit_log(actor_user_id,actor_email,action,resource,details,created_at) VALUES(?,?,?,?,?,datetime('now'))").run(actor?.id ?? null, actor?.email ?? "system", action, resource, JSON.stringify(details));
}

export async function createUser(db: Database, email: string, password: string, role: Role) {
  const result = db.query("INSERT INTO users(email,password_hash,role,created_at) VALUES(?,?,?,datetime('now')) RETURNING id,email,role,active,created_at").get(email.toLowerCase(), await Bun.password.hash(password), role);
  return result;
}

export async function changePassword(db: Database, userId: number, current: string, next: string) {
  const row: any = db.query("SELECT password_hash FROM users WHERE id=? AND active=1").get(userId);
  if (!row || !(await Bun.password.verify(current, row.password_hash))) return false;
  db.query("UPDATE users SET password_hash=? WHERE id=?").run(await Bun.password.hash(next), userId); return true;
}

export async function resetPassword(db: Database, userId: number, next: string) {
  const result = db.query("UPDATE users SET password_hash=? WHERE id=? AND active=1").run(await Bun.password.hash(next), userId); return result.changes > 0;
}

export function createRecoveryToken(db: Database, email: string) {
  const row: any = db.query("SELECT id,email FROM users WHERE email=? AND active=1").get(email.toLowerCase());
  if (!row) return null;
  const token=randomUUID()+randomUUID(); const expires=new Date(Date.now()+30*60*1000).toISOString();
  db.query("INSERT INTO password_reset_tokens(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,datetime('now'))").run(digest(token),row.id,expires);
  return { token, email: row.email, expires_at: expires, user_id: row.id };
}

export async function consumeRecoveryToken(db: Database, token: string, next: string) {
  const row:any=db.query("SELECT user_id,expires_at,used FROM password_reset_tokens WHERE token_hash=?").get(digest(token));
  if (!row || row.used || new Date(row.expires_at).getTime() <= Date.now()) return null;
  const ok=await resetPassword(db,row.user_id,next); if (!ok) return null;
  db.query("UPDATE password_reset_tokens SET used=1 WHERE token_hash=?").run(digest(token));
  db.query("DELETE FROM sessions WHERE user_id=?").run(row.user_id);
  return row.user_id as number;
}

export async function authenticate(db: Database, authorization?: string): Promise<User | null> {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7);
  if (process.env.API_TOKEN && token === process.env.API_TOKEN) return { id: 0, email: "service", role: "admin" };
  const row: any = db.query("SELECT u.id,u.email,u.role,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?").get(digest(token));
  if (!row || new Date(row.expires_at).getTime() <= Date.now()) return null;
  return { id: row.id, email: row.email, role: row.role };
}

export const can = (user: User | null, roles: Role[]) => !!user && roles.includes(user.role);

export async function createSession(db: Database, email: string, password: string) {
  const row: any = db.query("SELECT id,email,password_hash,role FROM users WHERE email=?").get(email.toLowerCase());
  if (!row || !(await Bun.password.verify(password, row.password_hash))) return null;
  const token = randomUUID() + randomUUID(); const expires = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  db.query("INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,datetime('now'))").run(digest(token), row.id, expires);
  return { token, expires_at: expires, user: { id: row.id, email: row.email, role: row.role as Role } };
}
