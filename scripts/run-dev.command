#!/usr/bin/env bash
set -euo pipefail

ROOT_PATH="$(cd "$(dirname "$0")/.." && pwd)"

if ! ollama list >/dev/null 2>&1; then
  echo "Starting Ollama..."
  osascript <<'APPLESCRIPT'
tell application "Terminal"
  activate
  do script "ollama serve"
end tell
APPLESCRIPT

  for attempt in {1..20}; do
    if ollama list >/dev/null 2>&1; then
      break
    fi
    sleep 0.5
  done

  if ! ollama list >/dev/null 2>&1; then
    echo "Ollama did not become ready. Check the Ollama Terminal window for the error."
    exit 1
  fi
fi

for port in 8000 8001 5173; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Port $port is already in use. Stop that process and run this launcher again."
    exit 1
  fi
done

osascript - "$ROOT_PATH" <<'APPLESCRIPT'
on run argv
  set rootPath to item 1 of argv
  tell application "Terminal"
    activate
    do script "cd " & quoted form of (rootPath & "/services/monitoring") & " && ../investigator/.venv/bin/python -m uvicorn app.main:app --reload --port 8000"
    do script "cd " & quoted form of (rootPath & "/services/investigator") & " && source .venv/bin/activate && uvicorn app.main:app --reload --port 8001"
    do script "cd " & quoted form of (rootPath & "/web") & " && npm run dev"
  end tell
end run
APPLESCRIPT

echo "RootWatch is starting. Open http://localhost:5173"
