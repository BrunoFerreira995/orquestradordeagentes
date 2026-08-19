#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
if [ -z "${PYTHON_BIN:-}" ]; then
  if [ -x "$ROOT/.venv/bin/python" ]; then PYTHON_BIN="$ROOT/.venv/bin/python"; else PYTHON_BIN="python3"; fi
fi
command -v tmux >/dev/null 2>&1 || { echo "tmux não encontrado"; exit 1; }
tmux has-session -t ollama-agents 2>/dev/null && { echo "Sessão já existe: tmux attach -t ollama-agents"; exit 0; }
tmux new-session -d -s ollama-agents -n workers "$PYTHON_BIN -m src.main worker worker-1 architect"
tmux split-window -h -t ollama-agents "$PYTHON_BIN -m src.main worker worker-2 backend"
tmux split-window -v -t ollama-agents:0.0 "$PYTHON_BIN -m src.main worker worker-3 frontend"
tmux split-window -v -t ollama-agents:0.1 "$PYTHON_BIN -m src.main worker worker-4 qa"
tmux select-layout -t ollama-agents tiled
echo "Workers iniciados. Attach: tmux attach -t ollama-agents"
