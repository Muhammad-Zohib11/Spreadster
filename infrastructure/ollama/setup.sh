#!/bin/bash
# ============================================================
# SPREADSTER — Ollama Setup Script
# Installs and configures Ollama as a system service
# Run as: sudo bash setup.sh
# ============================================================

set -e

echo "═══════════════════════════════════════════════"
echo "  SPREADSTER — Ollama Installation"
echo "═══════════════════════════════════════════════"

# Install Ollama
echo "[1/4] Installing Ollama..."
curl -fsSL https://ollama.com/install.sh | sh

# Configure Ollama to bind on all interfaces (for Cloudflare tunnel)
echo "[2/4] Configuring Ollama service..."
sudo mkdir -p /etc/systemd/system/ollama.service.d

sudo tee /etc/systemd/system/ollama.service.d/override.conf > /dev/null <<'EOF'
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
Environment="OLLAMA_ORIGINS=*"
Environment="OLLAMA_NUM_PARALLEL=2"
Environment="OLLAMA_MAX_LOADED_MODELS=2"
EOF

# Reload and enable service
echo "[3/4] Enabling Ollama service..."
sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl restart ollama

# Wait for service to start
sleep 3
echo "[4/4] Verifying Ollama is running..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
  echo "✅ Ollama is running at http://localhost:11434"
else
  echo "⚠️  Ollama may still be starting up. Check: sudo systemctl status ollama"
fi

echo ""
echo "Next steps:"
echo "  1. Pull AI models: bash pull-models.sh"
echo "  2. Set up Cloudflare tunnel: bash ../../cloudflare/tunnel.sh"
echo "═══════════════════════════════════════════════"
