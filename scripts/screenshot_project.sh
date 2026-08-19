#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_DIR="."
for ((index=1; index <= $#; index++)); do
  if [ "${!index}" = "--project-dir" ]; then next=$((index + 1)); PROJECT_DIR="${!next:-.}"; fi
done
if ! (cd "$PROJECT_DIR" && node -e "require.resolve('playwright')") >/dev/null 2>&1; then
  echo "Playwright não encontrado; instalando em $PROJECT_DIR..."
  (cd "$PROJECT_DIR" && npm install -D playwright && npx playwright install chromium)
fi

node "$ROOT/scripts/screenshot_project.mjs" "$@"
