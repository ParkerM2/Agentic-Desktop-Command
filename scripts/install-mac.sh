#!/usr/bin/env bash
#
# ADC macOS installer — downloads the latest release, installs it to
# /Applications, and strips com.apple.quarantine so Gatekeeper doesn't
# claim the app is "damaged".
#
# Usage:
#   curl -sSL https://github.com/ParkerM2/Agentic-Desktop-Command/releases/latest/download/install-mac.sh | bash
#
# Or download and run locally:
#   bash install-mac.sh           # latest
#   bash install-mac.sh 0.1.6     # specific version
#
# ADC is distributed unsigned (no Apple Developer subscription). This script
# is the supported install path — using `curl` to fetch the DMG avoids the
# browser-applied quarantine attribute that triggers the "damaged" dialog,
# and the final `xattr -cr` scrubs anything still attached.

set -euo pipefail

REPO="ParkerM2/Agentic-Desktop-Command"
APP_NAME="ADC"
VERSION="${1:-latest}"

log() { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

# ── Resolve arch ────────────────────────────────────────────────
arch=$(uname -m)
case "$arch" in
  arm64) asset_arch=arm64 ;;
  x86_64) asset_arch=x64 ;;
  *) fail "Unsupported architecture: $arch" ;;
esac

# ── Resolve download URL ────────────────────────────────────────
if [ "$VERSION" = "latest" ]; then
  download_base="https://github.com/${REPO}/releases/latest/download"
else
  download_base="https://github.com/${REPO}/releases/download/v${VERSION}"
fi

dmg_name="ADC-${VERSION#v}-${asset_arch}.dmg"
if [ "$VERSION" = "latest" ]; then
  # When using /latest/download, filename must match without version prefix:
  # GitHub serves the latest release asset by exact filename, so we need the
  # resolved version. Peek at the release JSON.
  latest_ver=$(curl -sSL "https://api.github.com/repos/${REPO}/releases/latest" \
    | awk -F'"' '/"tag_name":/ {print $4; exit}' \
    | sed 's/^v//')
  [ -n "$latest_ver" ] || fail "Could not resolve latest version"
  VERSION="$latest_ver"
  dmg_name="ADC-${VERSION}-${asset_arch}.dmg"
  download_base="https://github.com/${REPO}/releases/download/v${VERSION}"
fi

dmg_url="${download_base}/${dmg_name}"
tmp_dmg="$(mktemp -t adc-install).dmg"
trap 'rm -f "$tmp_dmg"' EXIT

log "Downloading ${dmg_name} (${asset_arch})..."
curl -fLSs -o "$tmp_dmg" "$dmg_url" || fail "Download failed: $dmg_url"

log "Mounting DMG..."
mount_point=$(hdiutil attach "$tmp_dmg" -nobrowse -noautoopen -quiet \
  | awk '/Volumes\// { sub(/^[^\/]*/, ""); print; exit }')
[ -n "$mount_point" ] || fail "Could not determine DMG mount point"

# Ensure we detach on any exit
cleanup() {
  rm -f "$tmp_dmg"
  if [ -n "${mount_point:-}" ] && [ -d "$mount_point" ]; then
    hdiutil detach "$mount_point" -quiet >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

src_app="${mount_point}/${APP_NAME}.app"
[ -d "$src_app" ] || fail "Could not find ${APP_NAME}.app in mounted DMG"

dest_app="/Applications/${APP_NAME}.app"

if [ -d "$dest_app" ]; then
  log "Removing existing installation at ${dest_app}..."
  rm -rf "$dest_app" || fail "Could not remove existing app (try running with sudo?)"
fi

log "Copying ${APP_NAME}.app to /Applications..."
cp -R "$src_app" "$dest_app" || fail "Copy failed — /Applications writable?"

log "Removing quarantine attributes..."
xattr -cr "$dest_app" || true

log "Installed ${APP_NAME} ${VERSION} (${asset_arch}). Launching..."
open "$dest_app"
