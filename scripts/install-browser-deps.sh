#!/usr/bin/env bash
set -euo pipefail

# Browser dependency bootstrap for Puppeteer-based checks.
# Intended for GitHub Actions, Codespaces and fresh Ubuntu/Debian environments.
# Safe to run repeatedly.

if ! command -v apt-get >/dev/null 2>&1; then
  echo "[install-browser-deps] apt-get not found; skipping OS dependency install."
  exit 0
fi

if [[ "${EUID}" -ne 0 ]]; then
  SUDO="sudo"
else
  SUDO=""
fi

$SUDO apt-get update
$SUDO apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libasound2t64 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libexpat1 \
  libgbm1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  xdg-utils

echo "[install-browser-deps] Browser dependencies installed."
