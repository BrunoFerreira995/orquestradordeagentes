#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_INPUT="${1:-workspace/backend}"
if [[ "$TARGET_INPUT" = /* ]]; then
  TARGET="$TARGET_INPUT"
else
  TARGET="$ROOT/$TARGET_INPUT"
fi

case "$TARGET" in
  "$ROOT/workspace"/*) ;;
  *) echo "Destino deve estar dentro de $ROOT/workspace" >&2; exit 1 ;;
esac

if [ -e "$TARGET" ] && [ "$(find "$TARGET" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
  echo "Destino não está vazio: $TARGET" >&2
  exit 1
fi

command -v bun >/dev/null 2>&1 || {
  echo "Bun não encontrado; instale em https://bun.sh" >&2
  exit 1
}

mkdir -p "$TARGET"
bun create elysia "$TARGET"

echo "Backend Elysia criado em: $TARGET"
echo "Para iniciar: cd \"$TARGET\" && bun run dev"
