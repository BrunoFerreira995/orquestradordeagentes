#!/usr/bin/env bash
set -euo pipefail
tmux kill-session -t ollama-agents 2>/dev/null || true
echo "Sessão ollama-agents encerrada."

