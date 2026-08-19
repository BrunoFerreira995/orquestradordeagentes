#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-$ROOT/workspace/nextjs-app}"

case "$TARGET" in
  "$ROOT/workspace"/*) ;;
  *) echo "Destino deve estar dentro de $ROOT/workspace" >&2; exit 1 ;;
esac

if [ -e "$TARGET" ] && [ "$(find "$TARGET" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
  echo "Destino não está vazio: $TARGET" >&2
  exit 1
fi

command -v npx >/dev/null 2>&1 || { echo "npx não encontrado; instale Node.js." >&2; exit 1; }
mkdir -p "$TARGET"
npx --yes create-next-app@latest "$TARGET" \
  --ts \
  --eslint \
  --app \
  --src-dir \
  --use-npm \
  --no-tailwind \
  --import-alias '@/*'

echo "Projeto Next.js criado em: $TARGET"
