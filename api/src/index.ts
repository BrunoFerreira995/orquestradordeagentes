import { Database } from "bun:sqlite";
import { createApp } from "./app";
import { ensureAuthSchema, seedAdmin } from "./auth";

const db = new Database(process.env.DB_PATH ?? "data/agents.db");
ensureAuthSchema(db);
await seedAdmin(db);
const app = createApp(db).listen(Number(process.env.PORT ?? 3000));

console.log(`API listening on http://${app.server?.hostname}:${app.server?.port}`);
