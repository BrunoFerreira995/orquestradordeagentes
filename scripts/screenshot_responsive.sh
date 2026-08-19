#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
URL="http://localhost:4101"
API_URL="http://localhost:4100"
PROJECT_DIR="workspace/meu-projeto/web"
OUTPUT="screenshots/meu-projeto"
EMAIL=""
PASSWORD=""
HEADED="false"
WAIT="800"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --url) URL="${2:?Informe a URL do frontend}"; shift 2 ;;
    --api-url) API_URL="${2:?Informe a URL da API}"; shift 2 ;;
    --project-dir) PROJECT_DIR="$2"; shift 2 ;;
    --output) OUTPUT="$2"; shift 2 ;;
    --email) EMAIL="$2"; shift 2 ;;
    --password) PASSWORD="$2"; shift 2 ;;
    --headed) HEADED="true"; shift ;;
    --wait) WAIT="$2"; shift 2 ;;
    *) echo "Opção desconhecida: $1" >&2; exit 1 ;;
  esac
done

COMMON=(--url "$URL" --api-url "$API_URL" --project-dir "$PROJECT_DIR" --email "$EMAIL" --password "$PASSWORD" --wait "$WAIT")
[ "$HEADED" = "true" ] && COMMON+=(--headed)

for viewport in mobile:390x844 tablet:768x1024 desktop:1440x1000; do
  name="${viewport%%:*}"
  size="${viewport#*:}"
  echo "Capturando $name ($size)..."
  "$ROOT/scripts/screenshot_project.sh" "${COMMON[@]}" --output "$OUTPUT/$name" --viewport "$size"
done

echo "Screenshots responsivos salvos em: $OUTPUT/{mobile,tablet,desktop}"
