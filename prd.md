# Notate product requirements

> Latest owner decision: omit Search and Export from the side panel. Their controls and handlers have been removed; older search/export requirements and verification describe a superseded build. Folder filtering remains.

> September 17 folder update (supersedes older group-picker descriptions below): user-facing groups are now folders, with existing storage keys retained for compatibility. The note composer shows an icon-only Lucide folder-plus create button followed by a single horizontal scrollable row of folders, newest first. One folder per annotation; clicking its selected folder again removes membership. Existing folders are assigned only here, never renamed/recolored here. Right-click a folder in the side panel → Edit opens the combined name/color editor. Folder creation still offers a name/color. Chronological order replaces manual dragging. New folder timestamps are explicit; legacy order uses earliest available note time. Current runtime is updated; live Chrome layout remains unverified.

Version: launch baseline, September 16, 2026. Status: recommended specification; implementation completeness is tracked in [AUDIT](docs/AUDIT.md). Owner: Sooim Kang. Target: release candidate/submission by Friday September 18, with weekend contingency through September 20. Store approval timing is external.

Positioning refinement: September 17, 2026. The owner explicitly centers the action of annotating live webpages. Primary action label in this specification: **Annotate**; current runtime still says **New**.

## 1. Problem and promise

People want to put their thoughts beside what they are looking at on a website: an observation about a design, a question about a claim, an interpretation of a passage, or feedback on an element. Taking a screenshot and moving it to another tool interrupts that act. A bookmark alone provides no way to annotate the specific detail in context.

**Definition:** Notate is a live webpage annotation tool. It lets people select an element and attach a personal text annotation directly to it while browsing.

**Promise:** “Annotate live webpages, right where your thoughts happen.”

**Core loop:** Annotate → select an element → write → Save → view the annotation in context → continue browsing. Organizing and returning to annotations extend this loop. Writing an annotation is useful immediately; it need not be justified by a future retrieval task.

The live page is the primary workspace. The side panel supports viewing, organizing, and revisiting annotations. “Live” means annotating the actual webpage while it remains a usable website; it does not mean live collaboration, recorded interactions, or a frozen historical copy. If the page changes, Notate must preserve the annotation even when its original element disappears.

## 2. Audience and jobs

Primary launch audience: designers, students, and researchers annotating material as they browse. Secondary: people comparing products or collecting reading notes. These are hypotheses to validate, not completed market research.

| Situation | Job | Successful outcome |
| --- | --- | --- |
| A designer notices a useful navigation pattern | Mark the element and explain the useful detail | Return later and understand the observation in context |
| A student finds an important claim | Keep a personal interpretation beside the source | Find the source and explanation again |
| A researcher compares references across sites | Collect notes under one project group | Filter pages and see only relevant notes/counts |
| A saved page changes | Recover the reason it was saved | Read the note, open the source, and optionally reattach it |

Not a collaborative review platform, citation manager, screenshot editor, website archive, or general freeform canvas for launch.

## 3. Product principles

1. Annotating is the primary job. Make selecting a detail, expressing a thought, and seeing it attached to the live page direct and clear. Groups, search, and recall serve that action.
2. The host website remains usable. Target-picking is temporary and explicit.
3. Persistence comes before polish claims. No silent data loss, fabricated success, or disappearing records.
4. One clear primary action per surface/state. Avoid duplicated Done/Clear/Move toolbars.
5. Small, consistent customization. Group names/colors provide organization without per-note design work.
6. Fail informatively. Unsupported pages, permission failures, and missing targets have different messages and recovery.

## 4. Launch requirements

P0 means launch gate. P1 improves the launch but is removable if it jeopardizes P0. Status here is a requirement, not an implementation claim.

| ID | Priority | Requirement | Acceptance |
| --- | --- | --- | --- |
| R01 | P0 | Persistent side-panel library | Toolbar opens panel; switching tabs updates current-page context without losing library/filter state |
| R02 | P0 | Explicit annotation | Annotate → pick element → write → optional group → Save; cancel returns safely; page links do not navigate while picking |
| R03 | P0 | Separate view and edit | View permits normal browsing; selecting a note reveals it; Edit explicitly opens composer; no accidental text edits or destructive controls |
| R04 | P0 | Reliable local CRUD | Create/edit/delete survive reload and worker restart; failed writes preserve draft; concurrent tabs do not overwrite each other |
| R05 | P0 | One optional group | Assignment replaces membership; no-group state allowed through removal; no second add button once assigned |
| R06 | P0 | Consistent filters/counts | All includes every note; group selection shows only matching page notes and counts; zero-match pages disappear; no source data mutation |
| R07 | P0 | Find and return | Page rows expand; note selection targets note ID, activates/reuses a matching tab, scrolls once, emphasizes chosen note |
| R08 | P0 | Target failure recovery | Invalid/missing selectors cannot crash rendering; saved text remains readable/editable/deletable in panel; show “Original element not found” and Open page |
| R09 | P0 | Host isolation | No changes to host font size/theme/layout while hidden; extension looks consistent on hostile styles and at zoom |
| R10 | P0 | Accessible controls | Keyboard access to all panel/composer actions, visible focus, named controls, focus restoration, accessible alternative to drag/right-click/hover |
| R11 | P0 | Clear deletion | Single-note deletion has Undo or explicit confirmation; delete-page has scoped confirmation; deleting group keeps notes |
| R12 | P0 | Basic retrieval search | Search note text, page title/domain, and group name locally; intersects selected group; counts reflect resulting visible notes; clear empty state |
| R13 | P0 | Export for safekeeping | Visible Export action downloads valid versioned JSON with notes and group metadata; errors are reported; do not call this restorable backup until import exists |
| R14 | P0 | Honest privacy and permissions | Audit/remove external font/favicon requests for intended network-free UI; minimum functional permissions; accurate public policy and dashboard disclosures |
| R15 | P0 | Supported-page boundaries | Explain blocked URLs without reload loops; no automatic page reload that could discard a user's form |
| R16 | P0 | Clean release package | Only required runtime assets; repeatable validation; valid icons/manifest; fresh-install and existing-data upgrade pass |
| R17 | P1 | Reattach missing target | Choose existing orphan note → Reattach → select new element → retain note ID/text/group |
| R18 | P1 | Reorder groups and move notes | Preserve current behavior if verified; keyboard alternatives and reset position; can be removed from launch UI if unstable |
| R19 | P1 | Small onboarding | One dismissible sentence and Annotate action, Help available afterward; never require video or lengthy tour |

R12 is intentionally simple string matching, not fuzzy/semantic search. If the schedule cannot accommodate all P0 requirements, move submission rather than silently relabeling unsafe behavior as polished. R17 can wait because R08 protects access to the note itself.

## 5. Data and organization rules

A page has many notes; a note has one page and zero or one group; a group spans pages. Group color is shared identity, not a note-by-note override. Editing note text must never recolor other notes. Only New group or Edit group changes group color. Ungrouped notes use the neutral/default yellow note treatment and remain in All without an Ungrouped filter.

All is the initial filter for a fresh panel session. Preserve filter while that panel remains open. Filter state is UI preference, not note membership. Search and group combine with AND. For example, a page with 5 notes, 2 in Research, shows 2 under Research; if only one of those matches search, its count is 1. Library filtering does not silently hide other notes on the live webpage at launch; focused-note emphasis provides context without confusing membership with page visibility.

## 6. Customization and settings

Launch: group name, six group colors, optional group assignment. One legible note font, consistent size, automatic wrapping. No arbitrary typefaces, text colors, opacity sliders, rich text, stickers, uploaded images, custom themes, or permanent automatic overlays on every visit. Retain manual note positioning only if reliable and accessible; automatic placement is the default. Prefer system typography or a licensed bundled font over remote font loading.

Settings surface: Help, Export notes, Privacy, version, and deliberately separated Delete all notes. Avoid a full preferences page for choices that do not exist. JSON import with preview/merge rules is a post-launch feature; do not advertise sync/restore yet.

## 7. Out of scope

Accounts, cloud sync, public links, collaboration, comments, AI summaries, screenshot capture, recordings, hover replay, built-in PDF viewer, canvas coordinates, arbitrary embedded frames, mobile/Safari/Firefox parity, nested folders, multiple groups per note, tagging in addition to groups, browser bookmark synchronization, and captured form-field values.

## 8. Quality and success

Release success is task completion, not feature count. In a small observed study, ask at least three people to create a note, switch its group, revisit it from another tab, and recover a missing target without coaching. Target: each completes the primary annotation/view/return tasks, with no data loss or accidental site navigation; record every confusion instead of asserting statistical confidence.

Engineering targets (unmeasured until QA): zero lost writes in concurrency/restart tests; zero uncaught exceptions in the acceptance suite; usable at 320–600 px panel width and 200% zoom; responsive search in a synthetic 1,000-note library (target under 100 ms render/update on the recorded test machine); no persistent background polling; reduced motion respected. Measure these locally without adding analytics.

## 9. Definition of done

All P0 requirements have evidence in QA, audit launch blockers are closed, README/listing match shipped behavior, assets/privacy/contact information are complete, and the packaged build passes fresh install and upgrade tests. “Submitted,” “approved,” and “published” are separate states. A document set or syntax pass is not release completion.
