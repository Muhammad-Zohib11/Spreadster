#!/bin/bash
# ============================================================
# SPREADSTER — Pull Required Ollama Models
# ============================================================

set -e

OLLAMA_URL="http://localhost:11434"

check_ollama() {
  if ! curl -s "$OLLAMA_URL/api/tags" > /dev/null 2>&1; then
    echo "❌ Ollama is not running. Start it with: sudo systemctl start ollama"
    exit 1
  fi
}

pull_model() {
  local MODEL=$1
  echo ""
  echo "Pulling: $MODEL"
  echo "─────────────────────────────────"
  ollama pull "$MODEL"
  echo "✅ $MODEL ready"
}

echo "═══════════════════════════════════════════════"
echo "  SPREADSTER — Pulling AI Models"
echo "═══════════════════════════════════════════════"
check_ollama

# Primary coding model — best for generating spreadsheet JSON
pull_model "deepseek-coder:6.7b"

# Fallback coding model
pull_model "qwen2.5-coder:7b"

# Context / conversation model — for prompt enhancement
pull_model "llama3.1:8b"

echo ""
echo "═══════════════════════════════════════════════"
echo "✅ All models pulled successfully!"
echo ""
echo "Installed models:"
ollama list
echo "═══════════════════════════════════════════════"
