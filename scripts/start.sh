#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi
mkdir -p logs/diffs data workspace/{worker-1,worker-2,worker-3,worker-4}
command -v ollama >/dev/null 2>&1 || { echo "Ollama não encontrado; instale Ollama."; exit 1; }
curl -fsS "${OLLAMA_BASE_URL:-http://localhost:11434}/api/tags" >/dev/null || { echo "Ollama offline; execute ollama serve."; exit 1; }
MODEL="${OLLAMA_MODEL:-lfm2.5-thinking:latest}"
MODEL_BASE="${MODEL%:latest}"
ollama list | awk 'NR>1 {print $1}' | sed 's/:latest$//' | grep -Fqx "$MODEL_BASE" || { echo "Modelo não instalado: $MODEL (execute ollama pull $MODEL)"; ollama list; exit 1; }
if [ -z "${PYTHON_BIN:-}" ]; then
  if [ -x "$ROOT/.venv/bin/python" ]; then PYTHON_BIN="$ROOT/.venv/bin/python"; else PYTHON_BIN="python3"; fi
fi
export PYTHON_BIN
"$PYTHON_BIN" -c 'import httpx, pydantic, yaml, rich' 2>/dev/null || { echo "Dependências ausentes. Execute: $PYTHON_BIN -m pip install -r requirements.txt"; exit 1; }
"$PYTHON_BIN" -m src.main status; "$ROOT/scripts/start_workers.sh"
echo "Orchestrator pronto. Use: python -m src.main run \"sua tarefa\""
