#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -d src/zeus-site/.git ]; then
  echo "Initializing submodules..."
  git submodule update --init --recursive
fi

echo "Ensuring sparse-checkout is configured for zeus/ ..."
git -C src/zeus-site sparse-checkout set zeus/
git -C src/zeus-site sparse-checkout list

echo "Pulling latest from tracked branch..."
git submodule update --remote --merge

echo "Done. Contents available under src/zeus-site/zeus"