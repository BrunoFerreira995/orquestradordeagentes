#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE="nextjs-elysia"
TARGET_INPUT="workspace/project"
START="false"
API_PORT="3000"
WEB_PORT="3001"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --template) TEMPLATE="${2:?Informe o nome do template}"; shift 2 ;;
    --start) START="true"; shift ;;
    --api-port) API_PORT="${2:?Informe a porta da API}"; shift 2 ;;
    --web-port) WEB_PORT="${2:?Informe a porta do frontend}"; shift 2 ;;
    *) TARGET_INPUT="$1"; shift ;;
  esac
done

case "$TEMPLATE" in nextjs-elysia|nextjs-only|elysia-only) ;; *) echo "Template desconhecido: $TEMPLATE" >&2; exit 1 ;; esac
if [[ "$TARGET_INPUT" = /* ]]; then TARGET="$TARGET_INPUT"; else TARGET="$ROOT/$TARGET_INPUT"; fi
case "$TARGET" in "$ROOT/workspace"/*) ;; *) echo "Destino deve estar dentro de $ROOT/workspace" >&2; exit 1 ;; esac

if [ -e "$TARGET" ] && [ "$(find "$TARGET" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
  echo "Destino não está vazio: $TARGET" >&2; exit 1
fi

mkdir -p "$TARGET"
case "$TEMPLATE" in
  nextjs-elysia) "$ROOT/scripts/create_nextjs.sh" "$TARGET/web"; "$ROOT/scripts/create_backend.sh" "$TARGET/api" ;;
  nextjs-only) "$ROOT/scripts/create_nextjs.sh" "$TARGET/web" ;;
  elysia-only) "$ROOT/scripts/create_backend.sh" "$TARGET/api" ;;
esac
if [ "$TEMPLATE" != "nextjs-only" ]; then
  cp "$ROOT/templates/auth/api-index.ts" "$TARGET/api/src/index.ts"
  cp "$ROOT/templates/auth/store.ts" "$TARGET/api/src/store.ts"
  cp "$ROOT/templates/auth/logger.ts" "$TARGET/api/src/logger.ts"
  cp "$ROOT/templates/auth/orchestrator.ts" "$TARGET/api/src/orchestrator.ts"
  cp "$ROOT/templates/auth/migrate.ts" "$TARGET/api/migrate.ts"
  mkdir -p "$TARGET/api/migrations"
  cp "$ROOT/templates/migrations/"*.sql "$TARGET/api/migrations/"
fi
if [ "$TEMPLATE" != "nextjs-only" ]; then (cd "$TARGET/api" && bun add postgres); fi
if [ "$TEMPLATE" != "elysia-only" ]; then
  cp "$ROOT/templates/auth/web-page.tsx" "$TARGET/web/src/app/page.tsx"
  cp "$ROOT/templates/auth/web-layout.tsx" "$TARGET/web/src/app/layout.tsx"
  mkdir -p "$TARGET/web/src/app/dashboard" "$TARGET/web/src/app/users" "$TARGET/web/src/app/settings"
  cp "$ROOT/templates/auth/web-dashboard.tsx" "$TARGET/web/src/app/dashboard/page.tsx"
  cp "$ROOT/templates/auth/web-users.tsx" "$TARGET/web/src/app/users/page.tsx"
  cp "$ROOT/templates/auth/web-settings.tsx" "$TARGET/web/src/app/settings/page.tsx"
fi
if [ "$TEMPLATE" != "elysia-only" ]; then cp "$ROOT/templates/auth/web-api.ts" "$TARGET/web/src/app/web-api.ts"; fi
if [ "$TEMPLATE" != "nextjs-only" ]; then mkdir -p "$TARGET/api/tests"; cp "$ROOT/templates/tests/api.test.ts" "$TARGET/api/tests/api.test.ts"; fi
if [ "$TEMPLATE" != "elysia-only" ]; then mkdir -p "$TARGET/web/tests"; cp "$ROOT/templates/tests/web-api.test.ts" "$TARGET/web/tests/web-api.test.ts"; fi
if [ "$TEMPLATE" != "elysia-only" ]; then bun -e 'const path=process.argv[1]; const file=JSON.parse(await Bun.file(path).text()); file.exclude=[...(file.exclude??[]),"tests"]; await Bun.write(path, JSON.stringify(file,null,2)+"\n");' "$TARGET/web/tsconfig.json"; fi
mkdir -p "$TARGET/.github/workflows"; cp "$ROOT/templates/project-ci.yml" "$TARGET/.github/workflows/ci.yml"
cp "$ROOT/templates/shared.env.example" "$TARGET/.env.example"
cp "$ROOT/templates/$TEMPLATE.json" "$TARGET/template.json"

echo "Projeto criado em: $TARGET"
echo "Frontend: cd \"$TARGET/web\" && npm run dev"
echo "Backend:  cd \"$TARGET/api\" && bun run dev"

if [ "$START" = "true" ]; then
  "$ROOT/scripts/start_project.sh" "$TARGET" --api-port "$API_PORT" --web-port "$WEB_PORT"
fi
