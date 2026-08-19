#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE="nextjs-elysia"
TARGET_INPUT="workspace/project"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --template) TEMPLATE="${2:?Informe o nome do template}"; shift 2 ;;
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
cp "$ROOT/templates/shared.env.example" "$TARGET/.env.example"
cp "$ROOT/templates/$TEMPLATE.json" "$TARGET/template.json"

echo "Projeto criado em: $TARGET"
echo "Frontend: cd \"$TARGET/web\" && npm run dev"
echo "Backend:  cd \"$TARGET/api\" && bun run dev"
