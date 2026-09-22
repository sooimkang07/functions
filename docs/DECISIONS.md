# Decision log

Date: September 16, 2026. Owner's explicit preferences are durable; recommendations below are the proposed launch baseline and may be revised with evidence. Implementation is tracked separately in AUDIT.md.

| ID | Decision | Basis | Status |
| --- | --- | --- | --- |
| D01 | White extension background | Explicit user request; implemented in local style.css | Owner preference |
| D02 | Zero or one group per annotation; pill switching/removal; no No group menu item | Explicit user request; partial working-tree implementation | Owner preference |
| D03 | Group filters show matching page note counts; no colored dots; compact selected-color fill | Explicit user request; local implementation requires browser QA | Owner preference |
| D04 | Native side panel is primary | Already implemented; sustained browsing/recall favors persistent context | Recommended baseline |
| D05 | Viewing separate from explicit picking/editing | Avoid hijacking website clicks and accidental edits | Recommended baseline |
| D06 | Save returns to viewing; New required for next note | Clear bounded task; easier exit and lower accidental creation | Recommended baseline |
| D07 | Local-first, no accounts/sync this week | Small personal tool, fewer dependencies; must disclose local limitations | Recommended baseline |
| D08 | Six group colors, no broad per-note styling | Consistent scanning/accessibility; keeps capture fast | Recommended baseline |
| D09 | Search and export are launch gates | Recall and data ownership are central, not decorative extras | Recommended baseline |
| D10 | Missing target is recoverable note state | Websites change; note text must survive anchor failure | Required reliability principle |
| D11 | Keep vanilla stack and refactor incrementally | Current project small; framework rewrite risks launch stability | Recommended engineering baseline |
| D12 | Optional per-site access target subject to end-to-end test | Reduce access without breaking saved-page return | Proposed, unresolved implementation |
| D13 | Submission target Sep 18 with weekend contingency | User requested end-of-week shipment; current audit has blockers | Planning assumption, not store guarantee |
| D14 | No screenshot/PDF/canvas/collaboration/AI expansion for launch | Focus on live contextual recall | Recommended scope boundary |

## Remaining owner-dependent inputs

Public publisher identity, support address, privacy hosting URL, developer account readiness, distribution preferences, and rights to brand assets. None are needed to complete local implementation or QA, but actual publication depends on them. Do not invent them or repeatedly stop ordinary development to ask about them.

## Remaining research/engineering decisions

- Observe new users distinguishing Save group from Save note; adjust surrounding copy if confused while keeping the requested Save label.
- Verify whether note cards obstruct dense pages enough to justify a future compact-marker view.
- Prototype/validate the final permission model before altering store justifications.
- Measure anchor resolution quality on representative sites; do not add broad fuzzy matching without ambiguity handling.
- Determine minimum Chrome version from the final API/CSS surface and actual test coverage.

Record revisions with date, rationale, affected requirements, and evidence. Keep historical decisions readable; avoid rewriting past assumptions as proven facts.

## September 17, 2026 — annotation-centered positioning

**D15 — Explicit owner direction:** Center Notate on the action/verb of **annotating live webpages**. The live webpage is the primary workspace. Observations, questions, interpretations, and feedback are all valid annotation content; remembering why something mattered is a supporting benefit, not the sole task.

This refines the rationale of D04/D09: the side panel, search, groups, and export support annotation. It does not remove reliability or data ownership requirements. The specified primary action becomes **Annotate**, replacing the generic **New** in the target UX. Runtime labels remain unchanged by this documentation revision. README, PRD, agent instructions, UX, style guide, product reasoning, and listing draft were aligned. Historical audit and prior implementation descriptions remain evidence of their dated snapshot.

## September 17, 2026 — folders replace the group picker

Owner direction: icon-only Lucide folder-plus followed by existing folders in a horizontally scrollable row, newest to oldest. Existing folder name/color edits belong to the side panel's right-click Edit dialog. Internal group keys stay compatible. New creation dates are stored in notate-folder-created-at; legacy earliest note dates approximate age. This supersedes D02's single-pill-plus behavior and manual group reordering. Clicking the selected folder again clears membership while preserving one-folder-per-note.
