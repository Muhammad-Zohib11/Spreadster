#!/bin/bash
# ============================================================
# SPREADSTER — Cloudflare Tunnel Setup
# Exposes local Ollama (port 11434) to the internet
# so Vercel serverless backend can reach it
#
# Prerequisites:
#   - cloudflared installed: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
#   - Cloudflare account (free tier is sufficient)
# ============================================================

set -e

echo "═══════════════════════════════════════════════"
echo "  SPREADSTER — Cloudflare Tunnel Setup"
echo "═══════════════════════════════════════════════"

# Check cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
  echo "Installing cloudflared..."
  # Linux (Debian/Ubuntu)
  curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
  sudo dpkg -i cloudflared.deb
  rm cloudflared.deb
fi

echo ""
echo "Option A: Quick tunnel (temporary URL, no login required)"
echo "─────────────────────────────────────────────────────────"
echo "Run: cloudflared tunnel --url http://localhost:11434"
echo "This gives you a URL like: https://random-name.trycloudflare.com"
echo "Copy this URL into your Vercel env: OLLAMA_BASE_URL=https://random-name.trycloudflare.com"
echo ""
echo "Option B: Named tunnel (persistent URL, recommended for production)"
echo "──────────────────────────────────────────────────────────────────"
echo "1. Login: cloudflared tunnel login"
echo "2. Create:  cloudflared tunnel create spreadster-ollama"
echo "3. Config:  see config.yml below"
echo "4. Install as service: sudo cloudflared service install"
echo ""

# Create a config template for named tunnel
TUNNEL_ID="${1:-YOUR_TUNNEL_ID}"
mkdir -p ~/.cloudflared

cat > ~/.cloudflared/config.yml << EOF
tunnel: $TUNNEL_ID
credentials-file: /root/.cloudflared/$TUNNEL_ID.json

ingress:
  - hostname: ollama.YOUR_DOMAIN.com
    service: http://localhost:11434
    originRequest:
      httpHostHeader: localhost
  - service: http_status:404
EOF

echo "Config template written to ~/.cloudflared/config.yml"
echo ""
echo "Quick Start (no login):"
echo "  cloudflared tunnel --url http://localhost:11434"
echo ""
echo "After getting tunnel URL, set in Vercel:"
echo "  OLLAMA_BASE_URL=https://your-tunnel-url.trycloudflare.com"
echo "═══════════════════════════════════════════════"
