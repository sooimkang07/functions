#!/bin/bash
# Copy Notate out of iCloud/Desktop onto a local folder Chrome can load without waiting.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
DEST="${HOME}/notate-extension"

mkdir -p "$DEST"

if command -v rsync >/dev/null 2>&1; then
	rsync -a --delete \
		--exclude '.git' \
		--exclude '.DS_Store' \
		--exclude '.vscode' \
		"$ROOT/" "$DEST/"
else
	rm -rf "$DEST"
	mkdir -p "$DEST"
	cp -R "$ROOT/manifest.json" "$ROOT/index.html" "$ROOT/scripts" "$ROOT/styles" "$ROOT/images" "$DEST/"
fi

echo "Copied Notate to: $DEST"
echo
echo "Then in Chrome:"
echo "1. Open chrome://extensions"
echo "2. Turn on Developer mode"
echo "3. Remove the old unpacked copy if it pointed at Desktop/iCloud"
echo "4. Load unpacked and choose: $DEST"
echo
echo "Chrome needs every extension file on local disk. iCloud cloud-only files will keep breaking Load unpacked."
