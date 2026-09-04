#!/bin/sh
set -e

# Wait for Ollama and pull the configured model before starting the API. First
# run downloads the model (can take a few minutes on CPU). Skipped when using a
# hosted LLM (LLM_PROVIDER=openai).
PROVIDER="${LLM_PROVIDER:-local}"

if [ "$PROVIDER" = "local" ]; then
  MODEL="${OLLAMA_MODEL:-qwen2.5-coder:1.5b}"
  BASE="${OLLAMA_BASE_URL:-http://ollama:11434/v1}"
  # Strip trailing /v1 so we can call the native Ollama HTTP API.
  OLLAMA_HOST="${BASE%/v1}"

  echo ">> Waiting for Ollama at ${OLLAMA_HOST}..."
  until curl -sf "${OLLAMA_HOST}/api/tags" >/dev/null 2>&1; do
    sleep 2
  done

  echo ">> Pulling Ollama model '${MODEL}' (first run may take several minutes)..."
  if ! curl -sN -X POST "${OLLAMA_HOST}/api/pull" \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"${MODEL}\"}" \
    -o /dev/null; then
    echo ">> Failed to pull Ollama model '${MODEL}'."
    exit 1
  fi
  echo ">> Model ready."
fi

echo ">> Starting Natural Language Insights Engine..."
exec node dist/app.js
