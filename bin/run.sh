#!/usr/bin/env bash
set -euo pipefail

REPO="giwonn/codeaware"
BIN_DIR="$(cd "$(dirname "$0")" && pwd)"
BINARY="$BIN_DIR/codeaware"

detect_platform() {
  local os arch
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  arch="$(uname -m)"

  case "$os" in
    darwin) os="darwin" ;;
    linux)  os="linux" ;;
    mingw*|msys*|cygwin*) os="windows" ;;
    *) echo "Unsupported OS: $os" >&2; exit 1 ;;
  esac

  case "$arch" in
    arm64|aarch64) arch="arm64" ;;
    x86_64|amd64)  arch="x64" ;;
    *) echo "Unsupported architecture: $arch" >&2; exit 1 ;;
  esac

  echo "${os}-${arch}"
}

download_binary() {
  local platform="$1"
  local asset_name="codeaware-${platform}"
  local download_url

  # Get latest release download URL
  download_url=$(curl -sL "https://api.github.com/repos/${REPO}/releases/latest" \
    | grep "browser_download_url.*${asset_name}" \
    | head -1 \
    | cut -d '"' -f 4)

  if [ -z "$download_url" ]; then
    echo "Error: Could not find binary for platform '${platform}'" >&2
    echo "Falling back to bun..." >&2
    exec bun run "$(dirname "$BIN_DIR")/src/index.ts" "$@"
  fi

  echo "Downloading codeaware for ${platform}..." >&2
  curl -sL "$download_url" -o "$BINARY"
  chmod +x "$BINARY"
  echo "Download complete." >&2
}

# Download if binary doesn't exist
if [ ! -x "$BINARY" ]; then
  platform="$(detect_platform)"
  download_binary "$platform"
fi

exec "$BINARY" "$@"
