#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
if [ -z "${PYTHON_BIN:-}" ]; then
  if [ -x "$ROOT/.venv/bin/python" ]; then PYTHON_BIN="$ROOT/.venv/bin/python"; else PYTHON_BIN="python3"; fi
fi
"$PYTHON_BIN" -m src.main status
