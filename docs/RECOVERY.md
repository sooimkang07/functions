# Recovery — September 21, 2026

Restored the September 19 saved 1.14 runtime from `recovery/20260919-100034/restored-1.14-with-cursor-tour.tar.gz`: index, manifest, core scripts and styles. Retained current welcome.html, welcome.js, welcome.css and the newer atomic first-note completion flag in storage-writer.js. Saved notes in Chrome storage were not accessed or changed.

The reflog records repeated September 21 branch checkouts/resets, ending at fb70ed9 (1.22). Higher version numbers did not contain the newer local implementation.

Pre-restoration workspace backup: `recovery/20260921-202529/before-restore.tar.gz`. Original September 19 archive and Git stash remain intact. A restored runtime snapshot is saved alongside the new backup as `restored-runtime.tar.gz`.

Validation: tools/check.mjs passes. Current tests: 30 pass, 5 fail in setup-sync/start-hint features whose scripts were already mismatched before restoration. The recovered runtime's 29 original tests pass. Native Chrome rendering still requires reload and visual verification.

Load/reload the existing unpacked extension at `/Users/sooimkang/notate-extension`, then refresh existing webpages. Do not uninstall the extension, clear its storage, reset this checkout, or copy another project folder over it. The recovered manifest reads 1.14.

---

# Working version — September 19, 2026

Authoritative development folder: `/Users/sooimkang/notate-extension`.
Manifest version: **1.14**. Reload this unpacked folder in Chrome, then refresh existing webpages.

The Cursor graphics branch was based on the older committed a50e3d2 runtime. The newer local implementation was preserved in stash@{0}. Its eleven tracked files have been restored without dropping the stash. The supporting untracked storage, confirmation, tests, and documentation files remain in place.

Cursor’s illustrated Getting Started section was extracted from commit 5a502e1 into welcome.html, styles/welcome.css and scripts/welcome.js. The restored background opens it only on installation. The side panel retains the newer implementation.

Before-recovery files and stash diff: recovery/20260919-100034/. The restored runtime passes all 29 Node tests and tools/check.mjs. Reloaded native Chrome testing remains necessary.

Do not reset, pull over, or switch this working folder without preserving its local files. Version labels alone do not identify the latest implementation. Avoid running copy-to-local.sh from another older copy over this folder.
