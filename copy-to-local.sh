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
if ! python3 - "$DEST" <<'PY'
from pathlib import Path
import sys
root = Path(sys.argv[1]) / "images"
missing = []
for name in ["icon-16.png", "icon-32.png", "icon-48.png", "icon-128.png"]:
    path = root / name
    data = path.read_bytes()[:8] if path.exists() else b""
    if data != b"\x89PNG\r\n\x1a\n":
        missing.append(name)
if missing:
    print("WARNING: these icons are missing or not real PNGs:", ", ".join(missing))
    print("In Finder, right-click images → Download Now, then run this script again.")
    sys.exit(0)
print("Icons look like real PNG files.")
PY
then
	echo "Could not verify PNG icons (python3 missing); make sure images/*.png are downloaded from iCloud."
fi
echo
echo "Then in Chrome:"
echo "1. Open chrome://extensions"
echo "2. Turn on Developer mode"
echo "3. Remove the old unpacked copy if it pointed at Desktop/iCloud"
echo "4. Load unpacked and choose: $DEST"
echo "5. Confirm the card says Version 1.12, then click Reload and Clear all on Errors"
echo
echo "Chrome needs every extension file on local disk. iCloud cloud-only files will keep breaking Load unpacked."
