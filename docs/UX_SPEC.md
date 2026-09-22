# UX and interaction specification

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

Status: required launch behavior; compare with AUDIT.md for current gaps. Primary action: **Annotate** (specified label; current runtime: New). Use **annotation** for the attached thought and **note** where a shorter object label is clearer; **group**, **All**, **Annotate**, **Save**, **Cancel**, **Edit**, **Hide notes**. Sentence case. “Done” must not mean both leave editing and hide all notes.

## Surfaces and hierarchy

The live webpage is the primary workspace. Make Annotate immediately discoverable; entering a group, searching, or managing the library must never be required before writing. The panel supports the on-page activity.

### Side panel

1. Header: Notate identity, primary Annotate button, small More button.
2. Current-page context: title/domain and Show notes / Hide notes. Explain unsupported pages in place of actionable capture.
3. Search input: “Search notes”; clear button when populated.
4. Horizontally scrolling All + group filters. Selected group uses its fill; others are neutral text. Preserve scroll and focus through rerenders.
5. Page list ordered by most recent matching note activity (legacy page updatedAt fallback). Each row: local generic page icon or safely sourced icon, page title, domain, visible note count, separate expand control, overflow menu.
6. Expanded notes: readable preview, group name if helpful in All, Open/locate action, Edit and overflow accessible without hover. Expand the current page initially when it contains results; preserve expansions during updates.
7. Small status region for Saved, undo, and failures. Help/Export/Privacy/Delete all live in More; destructive actions remain separated.

Page title opens/focuses its source. Chevron only expands/collapses and exposes aria-expanded/aria-controls. Note selection opens source in viewing mode and emphasizes the exact note ID; multiple notes on one target remain individually selectable. Panel search/filtering affects panel counts only at launch; do not silently introduce an on-page filter.

### On-page layer

Non-interactive overlay areas use pointer-events:none. Only cards and controls take pointer input. Highlight the selected target lightly without changing its layout. Never mutate the website root font, margins, or general colors. Offer Hide notes without requiring the user to find Chrome controls.

### Composer

A named dialog positioned near the target, clamped to the viewport. If space is limited, center within the viewport. Order: note text → optional group pill/add button → Cancel / Save. Placeholder: “Add your thoughts about this…” One font and text size. Note editing has no group color editor.

Group chooser: existing names as mutually exclusive buttons, divider when names exist, then an SVG plus and “New group.” With no selection show the add-group control; after selection show exactly one group pill. Clicking pill opens switching. A small × at its top-left appears on hover and keyboard focus; has a larger usable hit area and accessible name “Remove from group.” Removing group is not deleting the note. No “No group” option.

New group subview: name input, six named color swatches, Back and Save. Save validates and updates the draft membership, then returns to the note composer. The note is persisted only by its own Save. Canceling the full draft should not leave an accidental empty group. Reusing an existing group name selects it without silently changing that group's color. Whitespace-only names fail inline. Proposed limits: group names 1–60 characters; note text 1–10,000 characters. Preserve legacy longer text and allow export; do not truncate during migration.

## State machine

Use one base state and explicit transient dialog state, rather than independent flags with contradictory combinations.

| State | Entry | Page behavior | Exit |
| --- | --- | --- | --- |
| Hidden | Initial page load / Hide notes | Completely normal; no note layer or interception | Show notes → Viewing; Annotate → Picking |
| Viewing | Show notes / library return / successful save | Normal navigation and interaction; cards visible | Annotate → Picking; Edit → Editing; Hide notes → Hidden |
| Picking | Annotate | Highlight candidate; one target selection consumes click without navigation | Target → Creating; Escape/Cancel → previous state |
| Creating | Target selected | Named composer owns focus; draft not yet stored | Save success → Viewing; Cancel → previous state |
| Editing | Explicit Edit on existing note | Composer owns focus; original retained until success | Save success → Viewing; Cancel → Viewing |
| Saving | Valid Save/shortcut | Disable duplicate submission; retain draft | Ack → Viewing; error → composer with Retry |
| Group subview | New group from composer | Preserve note draft, target, return state | Save group draft → composer; Back → unchanged prior group |

If retained, reposition is a bounded note interaction with a drag handle and keyboard equivalent, not a permanent global mode. Update only offset fields; do not rewrite stale copies of other notes.

## Detailed flows

### First use

Toolbar click → side panel → one sentence: “Annotate this page. Select something and add your thoughts.” → Annotate. A short local-storage disclosure belongs in Help/onboarding without interrupting capture. First-run completion must not depend on watching a video.

### Save

Annotate → choose target → autofocus text → type → optional group → Save. Cmd/Ctrl+Enter invokes the same screen-aware submission path as the button. Empty text stays open with an inline message. Show saving state until the write acknowledges. On failure retain all text/group/target and offer Retry. Never reload the website automatically to recover injection.

### Return

Open panel → search/filter → expand page → choose note → focus matching tab or open URL → enter Viewing → resolve anchor → scroll/highlight once. If site access is unavailable, explain and offer a user-triggered grant/retry. Avoid changing the tab while a dirty composer is open without offering Keep editing/Discard. A note with missing target still opens in the panel.

### Edit or remove

Select note → Edit → save/cancel. Escape cancels the nearest transient UI; with a dirty draft, ask to discard rather than silently lose work. Escape from a group chooser just closes it. Escape from Picking restores normal browsing. Escape in a focused host text field must not hijack ordinary typing when Notate has no active transient interaction.

Single-note Delete: Undo for a short visible interval if durable undo is implemented; otherwise explicit confirmation. Page menu: “Delete notes on this page…” includes total scope, even under a filter; do not imply only visible notes are deleted. Group Delete: “Delete group? Its notes will stay in All.” Delete all: settings-only, count and explicit confirmation; optionally export first.

### Group management

Visible Manage groups action in More. Each group has rename, color, delete, and keyboard reorder controls if reorder ships. Right-click remains a convenience. Rename collision keeps editor open with an inline error; no merging without a separate explicit design. Deleting the selected group falls back to All. Empty groups may remain in management but need not appear in note filters until they have notes. Apply group color changes to rendered views after successful persistence.

## Required states and copy

| Condition | Message / response |
| --- | --- |
| Empty library | “Your annotations start on the page.” + Annotate |
| No search matches | “No notes match your search.” + Clear search |
| Filter has no matches | “No notes in this group yet.” + All / Annotate |
| Restricted page | “Notate can’t annotate this page. Open a regular website to add a note.” Library remains usable |
| Access needed | “Allow Notate on this site to show or add notes.” + Allow / Retry |
| Save failed | “Your note wasn’t saved. Your draft is still here.” + Retry |
| Read failed | “Couldn’t load your notes.” + Retry; never display ordinary empty state |
| Missing target | “Original element not found. Your note is still saved.” + Open page; Reattach if implemented |
| URL unavailable | Keep saved text visible; offer Retry; never delete the record |
| Extension reloaded | “Notate was updated. Refresh this page when you’re ready.” Preserve draft where feasible |

## Accessibility and focus

Use actual buttons for actions, text labels or accessible names for every icon, semantic headings, and a polite live region for status. Filter buttons use aria-pressed unless implementing a complete tab pattern. A button-based chooser can use normal Tab navigation; do not add menu/listbox roles without implementing their keyboard contract. Support Escape and return focus to the trigger. Modal owns focus and restores it on close. Group × appears on focus-within and works via keyboard. Drag and contextmenu have visible keyboard alternatives. Avoid capturing keys while users type into host fields.

At 200% zoom and narrow panel widths: no hidden Save, clipped dialog, or horizontal page overflow. Honor prefers-reduced-motion for scrolling and animation. Test contrast against every group fill. Ensure forced-colors mode retains boundaries/selection. Group name communicates identity independent of color.

## Keyboard target selection

Required implementation detail: entering Picking must provide an extension-owned focusable picker control with instructions, not require a mouse click. Define a bounded keyboard path through eligible visible elements (for example next/previous candidate, parent/child refinement, Enter to choose, Escape to cancel). Exclude Notate UI, scripts/styles, hidden elements, document roots, and sensitive input values. Announce candidate tag and a short safe label. Do not hijack these keys while typing in a host field outside Picking. If this mechanism cannot be made usable this week, provide an equally functional keyboard-accessible capture path and test it; do not claim full keyboard capture based only on a keyboard-accessible Save button.

## Interaction-state limitations

The live page continues to evolve. Opening a modal can dismiss a hover menu or change focus. Do not promise to freeze or reconstruct that state. If the selected target disappears before saving, retain the written draft and offer to choose another target; do not crash or attach to the document root. Existing hover/cursor/scroll metadata can be preserved as legacy context without exposing unverified replay controls.


## September 19 — welcome setup page
The standalone welcome page follows the owner’s supplied reference: large welcome heading, bordered setup checklist with progress, and a wide light-gray stage with centered browser illustrations and pill actions. Graphics embed the shipped Notate icon. Steps cover installation, opening the side panel, pinning, and the existing isolated practice exercise. Installation is already complete on entry; other checkmarks reflect completed tour actions, not inferred Chrome pin state. The Open sidebar action calls Chrome’s side-panel API directly from a click. Practice stays separate from saved notes. This changes the welcome page only.

The pin step now illustrates Chrome’s side-panel header and highlighted pin, using the actual Notate icon and “Add Notate to your Chrome toolbar” copy. There is no separate Next button on this step; selecting the practice step after viewing it acknowledges the instructions. Active checklist rows have no decorative fill or outline; keyboard focus remains visible. Completed steps use Notate’s yellow token with a small black rounded-stroke checkmark.


### September 19 — live setup progression
The installed welcome page opens the real side panel directly from its button. Same-extension, same-window ephemeral messages detect manual opening and already-open panels; opening advances to pinning. Chrome action settings determine actual pin completion, including settings-change events and focus refresh. Pinning advances to practice; selecting another tour step no longer marks pinning complete. “Not now” skips without a completion check. The reminder appears beneath Chrome’s native panel header during the pin step, on folded yellow paper with a bouncing arrow (static with reduced motion). No note storage is touched. Completed checklist circles use #FFE992. The localhost page is only a visual preview and cannot open the installed Chrome extension.

## September 21 pin-step update
The welcome page observes Chrome’s actual toolbar pin setting. Pinning completes the rounded-square pin marker and advances to Get started; already-pinned users also advance when reaching this step. One rounded white status card with a green pin icon replaces separate pin callouts. Web previews do not simulate successful pinning.

### Pin prompt placement refinement
The compact pin reminder belongs only to the side-panel document, immediately above popup-header. It appears while Chrome reports the extension is unpinned and disappears after pinning. Its yellow circle contains a smaller pin icon; the arrow gently bounces upward toward Chrome’s native pin control, with reduced motion respected. The welcome page retains automatic step advancement but contains no pin popup.
