#!/bin/bash
# Rebuild the ChatGPT side panel + welcome graphics combo on your Mac.
# Run from ~/notate-extension (or any clone of sooimkang07/functions).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

BACKUP="${HOME}/notate-local-backup"
RECOVERY_DIR="$ROOT/recovery/20260919-100034"
EXTRACT="/tmp/notate-recovery-extract"
BRANCH="cursor/chatgpt-welcome-recovery-6f57"

echo "=== 1) Fetch recovery branch (ChatGPT side panel + welcome) ==="
git fetch origin "$BRANCH"
git checkout -B "$BRANCH" "origin/$BRANCH"

echo
echo "=== 2) Overlay ChatGPT-local welcome files from backup (preferred) ==="
if [[ -d "$BACKUP" ]]; then
	mkdir -p scripts styles
	[[ -f "$BACKUP/welcome.html" ]] && cp -f "$BACKUP/welcome.html" .
	[[ -f "$BACKUP/welcome-fixed.html" && ! -f welcome.html ]] && cp -f "$BACKUP/welcome-fixed.html" welcome.html
	[[ -f "$BACKUP/welcome.css" ]] && cp -f "$BACKUP/welcome.css" styles/welcome.css
	[[ -f "$BACKUP/tokens.css" ]] && cp -f "$BACKUP/tokens.css" styles/tokens.css
	[[ -f "$BACKUP/welcome.js" ]] && cp -f "$BACKUP/welcome.js" scripts/welcome.js
	[[ -f "$BACKUP/setup-sync.js" ]] && cp -f "$BACKUP/setup-sync.js" scripts/setup-sync.js
	[[ -f "$BACKUP/pin-reminder.js" ]] && cp -f "$BACKUP/pin-reminder.js" scripts/pin-reminder.js
	echo "Copied welcome assets from $BACKUP"
else
	echo "No $BACKUP — using committed welcome scripts from git."
fi

echo
echo "=== 3) Inspect stash (local WIP on 1.14 side panel tip) ==="
if git stash list | grep -q .; then
	git stash list
	echo
	git stash show --stat stash@{0} || true
	echo
	echo "Stash is kept. To try overlaying only UI files from it:"
	echo "  git checkout stash@{0} -- index.html styles/style.css scripts/popup.js"
	echo "Review with git diff, then keep or discard."
else
	echo "No git stash entries."
fi

echo
echo "=== 4) Extract recovery tarballs for inspection ==="
if [[ -d "$RECOVERY_DIR" ]]; then
	rm -rf "$EXTRACT"
	mkdir -p "$EXTRACT/before" "$EXTRACT/restored-1.14"
	if [[ -f "$RECOVERY_DIR/before-recovery.tar.gz" ]]; then
		tar -xzf "$RECOVERY_DIR/before-recovery.tar.gz" -C "$EXTRACT/before"
		echo "Extracted before-recovery.tar.gz → $EXTRACT/before"
	fi
	if [[ -f "$RECOVERY_DIR/restored-1.14-with-cursor-fix.tar.gz" ]]; then
		tar -xzf "$RECOVERY_DIR/restored-1.14-with-cursor-fix.tar.gz" -C "$EXTRACT/restored-1.14"
		echo "Extracted restored-1.14-with-cursor-fix.tar.gz → $EXTRACT/restored-1.14"
	fi
	echo "Top-level extracted paths:"
	find "$EXTRACT" -maxdepth 3 -type f \( -name 'index.html' -o -name 'style.css' -o -name 'popup.js' -o -name 'welcome*' -o -name 'manifest.json' \) 2>/dev/null | head -40
else
	echo "No $RECOVERY_DIR — skip tarball extract."
fi

echo
echo "=== 5) Verify build ==="
grep '"version"' manifest.json || true
ls -la welcome.html styles/welcome.css styles/tokens.css scripts/welcome.js scripts/setup-sync.js scripts/pin-reminder.js
grep -E 'sidePanel|side_panel|default_popup' manifest.json || true

echo
echo "=== 6) Chrome reload ==="
echo "1. chrome://extensions → Remove Notate"
echo "2. Load unpacked → $ROOT"
echo "3. Confirm Version 1.20 (side panel, not popup)"
echo "4. Open chrome-extension://<id>/welcome.html to check graphics"
echo "5. Click the toolbar icon — side panel should dock on the right"
