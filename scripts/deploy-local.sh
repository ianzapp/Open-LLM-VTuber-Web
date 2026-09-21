#!/usr/bin/env bash
# Build the web app and copy it into the backend's side-by-side preview folder.
set -euo pipefail
BACKEND="${BACKEND_DIR:-$HOME/projects/open-llm-vtuber/Open-LLM-VTuber}"
cd "$(dirname "$0")/.."
npm run build:web
mkdir -p "$BACKEND/frontend-next"
rsync -a --delete dist/web/ "$BACKEND/frontend-next/"
echo "Deployed to $BACKEND/frontend-next  ->  open /next/ on the backend"
