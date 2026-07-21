#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; cd "$project_dir"
for dependency_dir in backend/node_modules frontend/node_modules; do
  [[ -d "$dependency_dir" ]] || { echo "Missing $dependency_dir; install locked dependencies before startup." >&2; exit 1; }
done
[[ -f backend/dist/index.js ]] || { echo "Missing backend/dist; run the backend production build before startup." >&2; exit 1; }
[[ -d frontend/dist ]] || { echo "Missing frontend/dist; run the frontend production build before startup." >&2; exit 1; }
node -e "require('./backend/node_modules/dotenv').config({path:'.env',quiet:true}); const r=require('./backend/dist/core/runtime'); r.validateRuntime(); if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')"
api_port="${BACKEND_PORT:-${PORT:-4000}}"; ui_port="${FRONTEND_PORT:-3001}"
api_host="${HOST:-${BACKEND_HOST:-127.0.0.1}}"; ui_host="${FRONTEND_HOST:-127.0.0.1}"
for port in "$api_port" "$ui_port"; do
  if lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $port is occupied; refusing to terminate another process." >&2; exit 1; fi
done
cleanup(){ kill "$api_pid" "$ui_pid" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
env HOST="$api_host" BACKEND_PORT="$api_port" npm --prefix backend start & api_pid=$!
npm --prefix frontend run preview -- --host "$ui_host" --port "$ui_port" --strictPort & ui_pid=$!
while kill -0 "$api_pid" 2>/dev/null && kill -0 "$ui_pid" 2>/dev/null; do sleep 1; done
exit 1
