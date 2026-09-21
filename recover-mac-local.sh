#!/bin/bash
# Recover the Mac-local 1.18 tip: side panel + welcome Getting Started graphics.
# That build was never fully pushed to GitHub. It may still be in your Mac
# reflog (5a502e1 / 257e8fa), stash, or recovery/*.tar.gz.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

BACKUP="${HOME}/notate-local-backup"
RECOVERY_DIR="$ROOT/recovery/20260919-100034"
EXTRACT="/tmp/notate-recovery-extract"
FALLBACK_BRANCH="cursor/chatgpt-welcome-recovery-6f57"
# Local 1.18 tips from Mac reflog (side panel 1.14 + Getting Started)
CANDIDATES=(5a502e1 257e8fa 2b73d33)

overlay_welcome_backup() {
	if [[ ! -d "$BACKUP" ]]; then
		echo "No $BACKUP — keeping tree welcome files as-is."
		return
	fi
	mkdir -p scripts styles
	[[ -f "$BACKUP/welcome.html" ]] && cp -f "$BACKUP/welcome.html" .
	[[ -f "$BACKUP/welcome-fixed.html" && ! -f welcome.html ]] && cp -f "$BACKUP/welcome-fixed.html" welcome.html
	[[ -f "$BACKUP/welcome.css" ]] && cp -f "$BACKUP/welcome.css" styles/welcome.css
	[[ -f "$BACKUP/tokens.css" ]] && cp -f "$BACKUP/tokens.css" styles/tokens.css
	[[ -f "$BACKUP/welcome.js" ]] && cp -f "$BACKUP/welcome.js" scripts/welcome.js
	[[ -f "$BACKUP/setup-sync.js" ]] && cp -f "$BACKUP/setup-sync.js" scripts/setup-sync.js
	[[ -f "$BACKUP/pin-reminder.js" ]] && cp -f "$BACKUP/pin-reminder.js" scripts/pin-reminder.js
	echo "Overlaid welcome assets from $BACKUP"
}

echo "=== 0) Reflog (look for 1.18 / 5a502e1 / Getting Started) ==="
git reflog | head -40 || true

echo
echo "=== 1) Try Mac-local 1.18 tip commits ==="
FOUND=""
for c in "${CANDIDATES[@]}"; do
	if git cat-file -t "$c" >/dev/null 2>&1; then
		ver=$(git show "$c:manifest.json" 2>/dev/null | grep '"version"' | head -1 || true)
		echo "Found $c → $ver"
		FOUND="$c"
		break
	else
		echo "Missing $c"
	fi
done

if [[ -n "$FOUND" ]]; then
	echo "Checking out local tip $FOUND onto cursor/local-1.18-recovery-6f57"
	git checkout -B cursor/local-1.18-recovery-6f57 "$FOUND"
	overlay_welcome_backup
else
	echo
	echo "Local 1.18 SHAs not in this clone. Falling back to GitHub recovery branch."
	git fetch origin "$FALLBACK_BRANCH"
	git checkout -B "$FALLBACK_BRANCH" "origin/$FALLBACK_BRANCH"
	overlay_welcome_backup
fi

echo
echo "=== 2) Stash ==="
if git stash list | grep -q .; then
	git stash list
	git stash show --stat 'stash@{0}' || true
	echo "Optional: git checkout stash@{0} -- index.html styles/style.css scripts/popup.js"
else
	echo "No stash."
fi

echo
echo "=== 3) Recovery tarballs ==="
if [[ -d "$RECOVERY_DIR" ]]; then
	rm -rf "$EXTRACT"
	mkdir -p "$EXTRACT/before" "$EXTRACT/restored-1.14"
	[[ -f "$RECOVERY_DIR/before-recovery.tar.gz" ]] && tar -xzf "$RECOVERY_DIR/before-recovery.tar.gz" -C "$EXTRACT/before"
	[[ -f "$RECOVERY_DIR/restored-1.14-with-cursor-tour.tar.gz" ]] && tar -xzf "$RECOVERY_DIR/restored-1.14-with-cursor-tour.tar.gz" -C "$EXTRACT/restored-1.14"
	echo "Extracted under $EXTRACT — looking for manifest + welcome:"
	find "$EXTRACT" -type f \( -name 'manifest.json' -o -name 'welcome.html' -o -name 'index.html' \) 2>/dev/null | head -40
	# If a tarball has a higher/local welcome build, print its version
	while IFS= read -r man; do
		echo "-- $man"
		grep '"version"' "$man" || true
	done < <(find "$EXTRACT" -type f -name 'manifest.json' 2>/dev/null | head -10)
else
	echo "No $RECOVERY_DIR"
fi

echo
echo "=== 4) Verify ==="
grep '"version"' manifest.json || true
git branch --show-current
ls -la welcome.html styles/welcome.css scripts/welcome.js scripts/setup-sync.js scripts/pin-reminder.js 2>&1 || true
grep -E 'sidePanel|side_panel|default_popup' manifest.json || true

echo
echo "=== 5) Chrome ==="
echo "Remove Notate → Load unpacked → $ROOT"
echo "If this was the real 1.18 tip, version may read 1.18 (or whatever that commit had)."
echo "Open chrome-extension://<id>/welcome.html and confirm side panel via toolbar icon."
