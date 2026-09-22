# Implementation audit — September 16, 2026
 
## CSS isolation update — September 17

Removed the injected root font-size override and remote font import. On-page custom properties now use the `--notate-` prefix and are defined on owned containers/explicit annotation targets. Generic data-color/action and reduced-motion selectors are scoped; mode/target classes are namespaced. UI dimensions and placement use a fixed pixel baseline rather than the website's root font size.

Browser evidence: tools/css-isolation.html passed six assertions covering host typography, variables, action controls, motion, folder color, and stable toolbar sizing as the host root changes from 10px to 24px. Static checks and all 19 Node tests pass. A03's outward style leakage is addressed. This remains light-DOM UI: aggressive website selectors can still affect extension controls, so live multi-site extension QA remains required before closing overall compatibility validation. The side panel's font/network review is separate.

## Storage implementation update — September 17

All annotation create/edit/move/delete/clear and folder create/edit/delete operations now use the service-worker queue in scripts/storage-writer.js through notateMutate. Each operation reads fresh state, modifies notes by stable ID, and acknowledges only after storage.set resolves. Stale edits compare the fields being changed; moves merge position only. Folder metadata and annotation changes commit in one storage.set call. A bounded list of 128 request receipts prevents duplicate transport retries, including after a worker restart while the receipt remains retained. No data migration or deletion is performed on installation.

Composer drafts survive failures, repeated saves are blocked, failed deletions keep notes, failed drags restore saved positions, and folder dialogs retain input on failure. New-note IDs are retained across retries. The previous whole-library client writers have been removed. 19 automated tests pass, including concurrency, conflicts, quota failures, retry behavior and UI recovery. Static checks pass. Loaded-Chrome multi-tab and worker-suspension QA remains a release verification step; these tests do not substitute for it. Earlier findings describe the pre-fix implementation.

## Scope and evidence

Reviewed the tracked source, manifest, styles, original README, and recent git history through a50e3d2. Included existing local changes to popup.js, webpage.js, style.css, and webpage.css from this conversation. Did not reset or commit them. This audit adds documentation and a read-only checker; it does not fix the findings below.

Evidence levels: **code** = directly observed implementation; **isolated reproduction** = executed source/helper in a Node VM with synthetic data/mocked dependencies; **browser** = loaded extension observed in Chrome. No fresh live Chrome UI, permissions, accessibility, performance, or store-upload validation was performed for this audit.

## What exists

- MV3 native side panel, toolbar opening, background tab activation/injection.
- Element-targeted text notes, local create/edit/delete, reload restoration, stacking and manual offsets.
- Hidden, preview, annotation, and move mechanics, although interaction boundaries remain inconsistent.
- All/group filters with page-based results and filtered counts in the current working tree.
- Group assignment, new-group composer subview, group rename/recolor/delete, pointer reordering.
- Single group string per note; deletion of a group preserves notes.
- Escaped note markup, helpers with injection guards, some reduced-motion/contrast styles, icon fallback.

Recent work is substantially UI iteration rather than a tested reliability pass. Group pill/filter changes are present but live browser behavior remains unverified.

## Findings

All findings below remain open unless explicitly marked otherwise. “Blocker” is a launch requirement, not a claim that every user has already encountered it.

| ID | Severity | Evidence / location | Consequence | Required remedy |
| --- | --- | --- | --- | --- |
| A01 | Blocker | safe-storage.js returns {} / false on exceptions; saveAnnotations and mutation callers ignore results | Read failure can look empty; failed save closes draft as if successful | Typed failures, retained drafts, commit acknowledgement |
| A02 | Blocker | webpage.js saveAnnotations reads and rewrites entire shared object; isolated two-writer reproduction loses one page | Concurrent notes can disappear | Central ID-based serialized mutations with retry/conflict handling |
| A03 | Blocker | styles/webpage.css sets html font-size:16px !important, global :root and data-color styles on every matched site | Extension alters host pages even before explicit annotation | Scope tokens/styles, remove global host reset, verify hostile CSS |
| A04 | Blocker | getSelector returns raw #id; many direct querySelector calls | Punctuation IDs can fail/misresolve; one invalid selector can break rendering | Escaped IDs, guarded per-note resolution, regression fixtures |
| A05 | Blocker | renderAnnotation returns silently if target absent; panel Edit fallback absent | Saved notes lose their live context with no recovery UI | Missing-target state and panel read/edit/delete; optional reattach |
| A06 | Blocker | saveFromModal can be called repeatedly; shortcut bypasses onModalSubmit group-screen guard | Duplicate writes or inconsistent group-screen Save behavior | Shared screen-aware submit path, pending state, idempotency |
| A07 | Blocker | Content arrays stale; no content storage-change listener | Panel rename/delete/recolor can be undone by later content save | Reconcile updates and mutate by ID/revision |
| A08 | Blocker | preview note click invokes openEditModal; generic key/mode handlers; close lifecycle not tied to panel session | Viewing/editing distinction and normal-page recovery are unreliable | Implement UX state contract, session cleanup, focus handling |
| A09 | Blocker | popup.js script injection failure reloads active tab | Could discard unrelated unsaved website work | Explain failure, offer deliberate refresh/retry; no automatic reload |
| A10 | Blocker | Group management via contextmenu; drag-only reorder; filters aria-selected without full tab roles; page expand lacks aria-expanded | Keyboard/screen-reader gaps | Visible management path, correct semantics and keyboard alternatives |
| A11 | Blocker | Google Fonts imports; favicon request includes saved page origin; broad manifest access | Current privacy claims need care; unnecessary network dependencies | Remove external UI requests or accurately disclose; audited permission model |
| A12 | Blocker | url-match.js strips all hashes; isolated reproduction matches /#/a with /#/b; no SPA route lifecycle | Different pages can share notes; in-memory notes may be saved under wrong route | Conservative URL identity and route-change handling |
| A13 | Blocker | Current UI has no search or visible export despite export helper/handler | Recall scales poorly; users lack an exposed data exit path | Simple search and versioned export per PRD |
| A14 | High | Direct delete has no undo/confirmation; preview handlers can edit notes | Easy unintended destructive action | Intentional deletion with recovery or confirmation |
| A15 | High | Group name is object key and sentinel; reserved names Ungrouped / __new__ accepted by normalization | Name collisions and prototype-sensitive keys undermine correctness | Stable group IDs or safe maps plus explicit legacy handling |
| A16 | High | persistGroupColor runs during ordinary note save, rewriting same-group notes | Editing one note can recolor an entire group | Separate group identity edits from note edits |
| A17 | High | background finally responds ok:true; content actions have no completion acknowledgement; global pending intent | Navigation failures can look successful; requests can collide | Structured async responses and tab/request-scoped intents |
| A18 | High | Return navigation identifies selector, not note ID | Multiple notes on one target cannot be distinguished on return | Carry note ID end-to-end |
| A19 | High | Reposition on window scroll/resize only; no mutation/resize observer for targets | Delayed images, nested scroll containers, SPA rerenders can detach cards | Bounded observations, RAF batching, unresolved target handling |
| A20 | High | No committed runtime tests, migration, browser compatibility declaration, or release package process | “Works” is not repeatably demonstrated | QA evidence and repeatable package validation |
| A21 | Medium | createPageItem groups/sorts note lists differently from a pure recency list; filters derive groups with notes | Ordering and empty-group behavior need explicit semantics | Align with UX; manage empty groups separately |
| A22 | Medium | popup.js retains obsolete Pages/Groups views and unreachable clear/export bindings; duplicated palette/CSS overrides | Future agents may mistake dormant code for shipped features | Remove/reconnect deliberately, unify tokens |
| A23 | High (developer workflow) | copy-to-local.sh DEST may equal source; fallback rm -rf destination; rsync --delete | Running helper on this checkout without rsync can delete source | Do not run on itself; implement equality guard before reuse |

Also inspect: unsaved draft dismissal by native dialog Escape, edit-field asynchronous loading, stale rendered highlights after deleting one of multiple notes on the same target, inconsistent pending-group cleanup, and global group filter preferences shared across panels. These are code-level concerns requiring focused browser tests, not independently reproduced bugs in this audit.

## Checks actually performed

- All seven scripts parse with `node --check`.
- Four packaged PNG headers and dimensions match 16/32/48/128 icon sizes.
- Node VM: pageUrlsMatch currently equates distinct hash routes (confirmed undesirable behavior).
- Node VM: notateDeleteGroup retains note text and clears membership (passed).
- Node VM with mocked storage: two concurrent executions of the actual saveAnnotations function preserve only one page (confirmed lost-update pattern).
- Earlier working-tree verification exercised All/group filtered page counts with synthetic data; not a live browser test.
- Documentation checker introduced in this pass checks syntax/assets/links. Its output is recorded by the final handoff, not a runtime certification.

## Recommended implementation order

A01/A02/A07 → A03 → A04/A05/A12/A18 → A06/A08/A09/A14/A17 → A10/A13/A16 → A11/A20 → cleanup. Work in small reviewable changes; preserve existing data. Reclassify only with a written rationale and evidence. Never mark an issue closed just because the specification describes the desired fix.


## Save-failure safety update — September 17

Failed reads now reject instead of returning an empty library. Composer writes require acknowledgement; failed create/edit retains the draft and exposes retry guidance. Pending saves block duplicate submissions and native dialog cancellation. Failed edits preserve the original in-memory record. Four new storage regression tests pass alongside the original six.

This partially addresses A01/A06. Whole-library cross-tab overwrites (A02), deletion/drag rollback, and live-browser failure tests remain open. This is not release approval. Automatic active-tab reload on injection failure was also removed.

## Navigation smoke-test follow-up — September 17

See QA.md for limited live Chrome evidence. Fixed duplicate-tab return preference in popup.js (active/current window first). URL matching preserves conventional #/ and #!/ routes; normal section anchors remain ignored. Existing records remain untouched. These changes pass four focused automated tests, but require reloaded-extension verification. SPA route-change lifecycle remains open; URL matching alone does not solve it.
