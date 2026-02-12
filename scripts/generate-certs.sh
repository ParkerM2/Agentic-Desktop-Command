#!/bin/bash
# Generate self-signed TLS certificates for Claude-UI Hub
# Usage: ./scripts/generate-certs.sh [output-dir]

CERT_DIR="${1:-./certs}"
mkdir -p "$CERT_DIR"

openssl req -x509 -nodes -days 3650 \
  -newkey rsa:2048 \
  -keyout "$CERT_DIR/server.key" \
  -out "$CERT_DIR/server.crt" \
  -subj "/C=US/ST=Local/L=Local/O=Claude-UI/CN=claude-ui.local" \
  -addext "subjectAltName=DNS:claude-ui.local,DNS:localhost,IP:127.0.0.1,IP:192.168.0.0/16,IP:10.0.0.0/8"

echo "Certificates generated in $CERT_DIR/"
echo "  - server.crt (certificate)"
echo "  - server.key (private key)"
