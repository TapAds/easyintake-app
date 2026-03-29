#!/usr/bin/env bash
# Free the API listen port so `npm run dev` can start cleanly (macOS / Linux).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT=3001

if [[ -f "$REPO_ROOT/apps/api/.env" ]]; then
  LINE="$(grep -E '^[[:space:]]*PORT=' "$REPO_ROOT/apps/api/.env" | tail -1 || true)"
  if [[ -n "${LINE}" ]]; then
    PORT="${LINE#*=}"
    PORT="${PORT//\"/}"
    PORT="${PORT//\'/}"
    PORT="$(echo "$PORT" | tr -d '[:space:]')"
  fi
fi

echo "[kill-api-port] freeing TCP port ${PORT} ..."

PIDS="$(lsof -tiTCP:"${PORT}" -sTCP:LISTEN 2>/dev/null || true)"
if [[ -z "${PIDS}" ]]; then
  echo "[kill-api-port] nothing listening on ${PORT} — ok"
  exit 0
fi

# shellcheck disable=SC2086
kill -9 ${PIDS} 2>/dev/null || true

sleep 0.3
STILL="$(lsof -tiTCP:"${PORT}" -sTCP:LISTEN 2>/dev/null || true)"
if [[ -n "${STILL}" ]]; then
  echo "[kill-api-port] error: port ${PORT} still in use (PIDs ${STILL})"
  exit 1
fi

echo "[kill-api-port] port ${PORT} is free"
