# Notate — instructions for coding agents

> Current working location: `/Users/sooimkang/notate-extension`, branch `main`. This is the authoritative restored workspace. Keep routine work here on `main`; do not switch to historical branches, reset to older remote snapshots, or copy another checkout over this folder. Preserve uncommitted work. Create another branch only when the owner requests it. Historical recovery archives live in the ignored `recovery/` directory.

> September 18 UI: use “notes” in user-facing copy; empty library says “No saved notes yet” at the first row position. Onboarding is inset with a rounded border on all sides and extra space before folders. Saved notes have a subtle bottom-right paper fold. Focus-color tokens are removed; keyboard focus uses currentColor.

> Latest owner decision: omit Search and Export from the side panel. Their controls and handlers have been removed; older search/export requirements and verification describe a superseded build. Folder filtering remains.

> Current dark-mode scope: ONLY the side panel (including its confirmation dialog) follows system dark mode. On-page notes, composer, toolbar, and page confirmation keep their original light-theme appearance. Dark sidebar folder fills are 24% at rest, 34% on hover, full pastel when selected. This supersedes earlier on-page dark-theme instructions.

> Dark theme: follow prefers-color-scheme automatically. Panel, toolbar, folder forms and confirmation dialogs use charcoal surfaces and light ink. Grouped notes/editors retain pastel paper with dark ink; ungrouped notes/editors use neutral charcoal. Folder filters use subdued tinted backgrounds until selected, then pastel with dark text. Injected dark UI tokens are scoped to Notate containers. Earlier white-only guidance applies to light mode.

> Toolbar corner correction: buttons use the 4px small radius inside the toolbar’s 8px outer radius and 4px padding. This supersedes the earlier matching-radius rule.

> Current toolbar/filter refinement: unselected sidebar folders use 22% folder tint and secondary gray text; hover uses 40% tint; selected folders keep full fill and primary text. Toolbar keeps explicit Done with Esc hint and removes Click to mark. Clear confirmation requests share one pending dialog; Cancel is transparent at rest with the composer hover/active treatment. Refresh existing webpages after an extension reload to discard stale content scripts.

> Latest outline rule: saved annotated elements use their annotation's folder color; ungrouped targets remain neutral. This supersedes earlier always-neutral saved-outline guidance. If several notes share a target, the last rendered or explicitly updated note controls its single outline; removing it falls back to a remaining note.

> Latest display update: saved pages sort by newest annotation first; each page's dropdown also lists newest annotations first. Ungrouped saved notes and their editor are white. In the colored note editor, the selected folder tag uses its light default tint for contrast. Toolbar buttons use the parent's 8px corner radius.

> Latest interaction refinement: clicking the selected folder tag does nothing; only its hover/focus × removes membership. The note editor previews the folder fill immediately, or neutral gray when ungrouped. Folder-creation form remains white; webpage target outlines remain neutral location cues. Onboarding reappears once for the folder-preview update.

> Latest UI revision: Clear all uses an extension-styled confirmation dialog on both surfaces, with global/page scope explicit. The selected folder collapses the chooser to one tag; its top-right × appears on hover/focus and restores all folders plus folder-plus. Ungrouped cards use a visible neutral gray (#e5e5e2), sharing grouped-card borders. Saved pages and their annotations are chronological, earliest first.

> Latest color-system clarification: all saved annotation cards share the same subtle border/shadow. Ungrouped cards are white; folder membership supplies colored fills. Yellow is reserved for the yellow folder. The composer stays white while the chosen folder pill carries its color. Scrollbars are hidden without disabling horizontal scrolling. Onboarding is versioned to reappear once for the September 17 folder update.

> Latest adjustment: Clear all is a secondary action immediately left of New in the header. Blank-space right-click no longer creates folders (including #group-tabs); folder-plus in the composer remains the creation entry point. Folder-row vertical padding matches the header. Save shows ⌘ ↵ and supports Cmd/Ctrl+Enter. The six folder colors are slightly more saturated; current CSS values supersede older palette values below.

> Latest refinement: header reads Notations. Folders are single-select pill filters with an explicit All reset. Folder creation by context menu is restricted to blank space inside #group-tabs. Annotation color squares are right-aligned by the page-count column. Ungrouped on-page notes are white with a stronger neutral border/shadow, not gray/yellow-filled. Global Clear all notations and page-toolbar Clear require scope-specific confirmation; annotation right-click offers Delete.

> Latest color-state revision (supersedes prior outline/full-fill defaults): folder controls use faint color tint at rest, darker tint on hover, and full folder fill when selected, without a black selection outline. Keyboard focus remains visible. Saved grouped cards use folder color; ungrouped cards use neutral gray and have no library color marker. Element targeting fill and saved-target outlines are neutral location cues, independent of folder color. Folder dialogs are centered; saved cards fit their text up to the maximum width.

> Latest UI refinement: Chrome owns the Notate branding; the content header is Annotations + New. Folder colors remain visible in default, hover, and selected states on both surfaces; hover darkens the fill and selection adds an inset outline. This supersedes earlier selected-only color guidance. Right-click blank side-panel space opens New folder (name/color); empty folders remain available. The page toolbar is at the right edge.

> September 17 folder update (supersedes older group-picker descriptions below): user-facing groups are now folders, with existing storage keys retained for compatibility. The note composer shows an icon-only Lucide folder-plus create button followed by a single horizontal scrollable row of folders, newest first. One folder per annotation; clicking its selected folder again removes membership. Existing folders are assigned only here, never renamed/recolored here. Right-click a folder in the side panel → Edit opens the combined name/color editor. Folder creation still offers a name/color. Chronological order replaces manual dragging. New folder timestamps are explicit; legacy order uses earliest available note time. Current runtime is updated; live Chrome layout remains unverified.

## Read before working

Read [README.md](README.md), [prd.md](prd.md), [docs/AUDIT.md](docs/AUDIT.md), and the relevant UX/style/architecture/data sections for the task. Distinguish observed implementation from proposed requirements. Check `git status` and preserve existing user changes. This repository contains uncommitted product work from September 15–16, 2026; do not discard it.

## Product invariants

- Notate is a tool for annotating live webpages directly. Center the verb Annotate and the on-page act of attaching observations, questions, interpretations, or feedback to a chosen element. Organization and recall support annotation.
- Primary workspace: the live webpage. The native Chrome side panel is the supporting library and control surface. Specify Annotate as the primary action (current runtime label: New); changing documentation does not mean the runtime label has been changed.
- Website behavior must remain normal outside explicit target-picking. Never change the host page's root typography, general element styling, or layout to fix extension UI.
- White panel background. Group name text has its group-color fill only when selected; no colored dot beside filters.
- Each note has zero or one group. No “No group” menu item; removal occurs through the pill's accessible × control. A selected pill replaces the add button and opens group switching.
- Existing groups precede a divider and SVG-plus “New group.” The group form action says **Save**.
- Groups filter the same page library. Page counts count matching notes, not all notes on those pages. All includes ungrouped notes. Deleting a group preserves its notes.
- Save success means durable storage acknowledged success. Preserve the draft and report failures. Never present a failed read as an empty library and overwrite existing data.
- Missing anchors must not delete or hide saved text from the library. Prefer an honest missing-target state over attaching to an uncertain element.
- User content is plain text. No HTML evaluation, remote executable code, remote AI processing, or telemetry added by default.

## Scope and authority

This documentation task established a launch baseline; it did not implement every proposed requirement. Complete the user's current task. Do not treat this document as authorization to publish, contact people, erase data, or implement the entire backlog in one turn. Do not spawn agents unless the user or another applicable instruction explicitly requests delegation. Routine local fixes and verification need no additional approval.

## Engineering rules

- Keep vanilla JS and the existing load model until a concrete benefit justifies change. Avoid a launch-week framework/build-system rewrite.
- Use semantic design tokens from styleguide.md. New extension CSS must be scoped and use namespaced variables; consolidate duplicated tokens incrementally.
- Separate storage, domain transformations, navigation/messaging, rendering, and interaction state. Follow proposed boundaries in ARCHITECTURE.md without claiming those files already exist.
- Prefer explicit state transitions over combinations of mode booleans. Give each user action one authoritative handler; shortcuts and buttons share validation.
- Centralize validated mutations through one writer before claiming concurrent safety. A per-tab promise queue is insufficient. Follow DATA_MODEL.md for migration constraints.
- Use stable note IDs in navigation, not only selectors. A selector can have multiple notes.
- Escape selectors with CSS.escape where appropriate and catch invalid selector queries. Use textContent or the established escaping helper for user content; validate URL schemes at navigation boundaries.
- Treat web content, imported data, and stored legacy records as untrusted. Prototype-sensitive group names must not become unsafe object keys.
- Scope DOM listeners, make injection idempotent, clean up on exit/navigation, and avoid full synchronous reflows for every pointer/scroll event.
- Preserve existing note IDs, text, timestamps, and groups during refactors. Never silently clear storage to make a migration pass.
- Do not add secrets or log note text/visited URLs for debugging. Use synthetic fixtures.
- Keep useful rationale comments; move classroom/search-history commentary to archival documentation when touching relevant sections, preserving attribution where necessary.

## Validation and handoff

Run `node tools/check.mjs`. Add focused tests for storage, migration, URL identity, and filtering changes. Follow the relevant manual QA cases for UI changes in a loaded extension; DOM mocks and syntax checks are not browser verification. Do not write trivial tests merely to mirror CSS values.

Report what changed, what was tested, what remains unverified, and any remaining launch blocker. Update AUDIT.md only when evidence supports a status change. Follow RELEASE.md gates before packaging or publishing. Never claim “works on all websites,” “fully private,” or “ready for the store” without the matching evidence and disclosures.

## Documentation authority

Latest user instruction → explicit accepted decisions → PRD/UX/style/data contracts → current implementation. Code describes reality, including bugs; it does not automatically override intended behavior. If a substantive product choice changes, record rationale in DECISIONS.md and update dependent docs together. Do not create a second lowercase agents.md; AGENTS.md is the canonical agent entry point.
