#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_INPUT="workspace/meu-projeto"
DB_PATH="data/test.db"
ADMIN_EMAIL="admin@test.local"
ADMIN_PASSWORD="password123"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --db-path) DB_PATH="${2:?Informe o caminho do banco de teste}"; shift 2 ;;
    --admin-email) ADMIN_EMAIL="${2:?Informe o e-mail de teste}"; shift 2 ;;
    --admin-password) ADMIN_PASSWORD="${2:?Informe a senha de teste}"; shift 2 ;;
    *) TARGET_INPUT="$1"; shift ;;
  esac
done

if [[ "$TARGET_INPUT" = /* ]]; then TARGET="$TARGET_INPUT"; else TARGET="$ROOT/$TARGET_INPUT"; fi
case "$TARGET" in "$ROOT/workspace"/*) ;; *) echo "Projeto deve estar dentro de $ROOT/workspace" >&2; exit 1 ;; esac
[ -f "$TARGET/api/src/store.ts" ] || { echo "Adapter do projeto não encontrado: $TARGET/api/src/store.ts" >&2; exit 1; }
[ -f "$TARGET/api/migrate.ts" ] || { echo "Runner de migrations não encontrado: $TARGET/api/migrate.ts" >&2; exit 1; }

cd "$TARGET/api"
DB_PATH="$DB_PATH" ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" bun -e '
  const { createStore } = await import("./src/store");
  const { migrate } = await import("./migrate");
  const store = createStore();
  await migrate(store);
  const email = process.env.ADMIN_EMAIL.toLowerCase();
  if (!(await store.get("SELECT id FROM users WHERE email=?", [email]))) {
    await store.run("INSERT INTO users(email,password_hash,role,created_at) VALUES(?,?,?,CURRENT_TIMESTAMP)", [email, await Bun.password.hash(process.env.ADMIN_PASSWORD), "admin"]);
  }
  console.log(`Banco de teste pronto: ${process.env.DB_PATH}`);
  console.log(`Usuário: ${email}`);
'
