#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_INPUT="workspace/project"
API_PORT="3000"
WEB_PORT="3001"
REUSE_API="false"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --api-port) API_PORT="${2:?Informe a porta da API}"; shift 2 ;;
    --web-port) WEB_PORT="${2:?Informe a porta do frontend}"; shift 2 ;;
    --reuse-api) REUSE_API="true"; shift ;;
    *) TARGET_INPUT="$1"; shift ;;
  esac
done

if [[ "$TARGET_INPUT" = /* ]]; then TARGET="$TARGET_INPUT"; else TARGET="$ROOT/$TARGET_INPUT"; fi
case "$TARGET" in "$ROOT/workspace"/*) ;; *) echo "Projeto deve estar dentro de $ROOT/workspace" >&2; exit 1 ;; esac
[ -d "$TARGET" ] || { echo "Projeto não encontrado: $TARGET" >&2; exit 1; }

API_DIR="$TARGET/api"
WEB_DIR="$TARGET/web"
LOG_DIR="$TARGET/logs"
mkdir -p "$LOG_DIR"
[ ! -d "$API_DIR" ] || [ -f "$API_DIR/src/index.ts" ] || { echo "Backend inválido: falta $API_DIR/src/index.ts" >&2; exit 1; }
[ ! -d "$WEB_DIR" ] || [ -d "$WEB_DIR/src" ] || { echo "Frontend inválido: falta $WEB_DIR/src" >&2; exit 1; }

is_port() { [[ "$1" =~ ^[0-9]+$ ]] && [ "$1" -ge 1 ] && [ "$1" -le 65535 ]; }
is_port "$API_PORT" || { echo "Porta da API inválida: $API_PORT" >&2; exit 1; }
is_port "$WEB_PORT" || { echo "Porta do frontend inválida: $WEB_PORT" >&2; exit 1; }
[ "$API_PORT" != "$WEB_PORT" ] || { echo "API e frontend devem usar portas diferentes" >&2; exit 1; }

port_pid() {
  command -v lsof >/dev/null 2>&1 || return 0
  lsof -nP -iTCP:"$1" -sTCP:LISTEN -t 2>/dev/null | head -1 || true
}
if [ -d "$API_DIR" ]; then
  EXISTING_API_PID="$(port_pid "$API_PORT")"
  if [ -n "$EXISTING_API_PID" ] && [ "$REUSE_API" != "true" ]; then echo "Porta $API_PORT já está em uso pelo PID $EXISTING_API_PID. Encerre-o ou escolha outra porta, ou use --reuse-api." >&2; exit 1; fi
fi
if [ -d "$WEB_DIR" ]; then
  EXISTING_WEB_PID="$(port_pid "$WEB_PORT")"
  [ -z "$EXISTING_WEB_PID" ] || { echo "Porta $WEB_PORT já está em uso pelo PID $EXISTING_WEB_PID. Encerre-o ou escolha outra porta." >&2; exit 1; }
fi

start_service() {
  local name="$1"; local directory="$2"; local log="$3"; shift 3
  [ -d "$directory" ] || return 0
  (cd "$directory" && exec nohup "$@" >"$log" 2>&1 < /dev/null) &
  SERVICE_PID=$!
}

if [ -d "$API_DIR" ]; then
  if [ -n "${EXISTING_API_PID:-}" ] && [ "$REUSE_API" = "true" ]; then
    API_PID="$EXISTING_API_PID"
    echo "Backend:  http://localhost:$API_PORT (reutilizado, PID $API_PID)"
  else
    start_service api "$API_DIR" "$LOG_DIR/api.log" env PORT="$API_PORT" WEB_ORIGIN="http://localhost:$WEB_PORT" bun run dev
    API_PID="$SERVICE_PID"
    echo "Backend:  http://localhost:$API_PORT (PID $API_PID)"
  fi
fi
if [ -d "$WEB_DIR" ]; then
  start_service web "$WEB_DIR" "$LOG_DIR/web.log" env NEXT_PUBLIC_API_URL="http://localhost:$API_PORT" bun run dev -- -p "$WEB_PORT"
  WEB_PID="$SERVICE_PID"
  echo "Frontend: http://localhost:$WEB_PORT (PID $WEB_PID)"
fi
sleep 1
if [ -n "${API_PID:-}" ] && ! kill -0 "$API_PID" 2>/dev/null; then echo "Backend encerrou; consulte $LOG_DIR/api.log" >&2; exit 1; fi
if [ -n "${WEB_PID:-}" ] && ! kill -0 "$WEB_PID" 2>/dev/null; then echo "Frontend encerrou; consulte $LOG_DIR/web.log" >&2; exit 1; fi
echo "Logs: $LOG_DIR"
