# Verification and release acceptance

> Latest owner decision: omit Search and Export from the side panel. Their controls and handlers have been removed; older search/export requirements and verification describe a superseded build. Folder filtering remains.

## Current verification status

Code review, syntax checks, icon checks, and selected isolated reproductions exist; full runtime QA is **not run**. Each future run must record build/commit, working-tree changes, Chrome version, OS, fixture/site, expected/actual result, and evidence. Do not copy a prior pass to a changed build.

`node tools/check.mjs` is the lightweight static check. It verifies parseable runtime JS, manifest asset presence, PNG dimensions, and relative Markdown links. It does not validate permissions against Chrome, CSS rendering, storage correctness, extension installation, or accessibility.

## Automated tests to implement with fixes

| Area | Cases |
| --- | --- |
| Repository | Missing storage versus failed read; failed write retains data; quota failure; two tabs different pages and same page; stale update; duplicate request; worker restart between write and acknowledgement |
| Groups | Create/rename/recolor/delete; duplicate trimmed names; reserved/prototype names; one membership; group deletion keeps notes; note save never recolors group |
| Filters/search | All includes ungrouped; counts equal visible child notes; no-match pages omitted; group AND search; Unicode; text/title/domain/group matching; no input mutation |
| Anchors | Escaped punctuation/numeric IDs; absent target; invalid legacy selector; reordered siblings; duplicate quote; delayed content; wrong candidate rejected |
| URLs | Root/trailing slash policy; query-distinct pages; ordinary section hash; hash router pages; redirects; malformed URL; unsafe schemes rejected |
| Migration/export | Every legacy field retained; malformed record recovery; rerun idempotent; interruption at each boundary; read-back verification; quota; Unicode/multiline; complete group metadata; no transient intents |
| State | Cancel/Save/shortcut equivalence; group subview; repeated Save; dirty Escape; tab navigation during draft; stale async response; picker cancel; cleanup |

Prefer Node's built-in test runner for pure helpers. Use a loaded unpacked extension in a dedicated Chrome test profile for integration; a normal webpage preview cannot exercise worker/permissions/sidePanel. Do not use personal browsing data as fixtures. A proposed test harness is not already installed.

## Manual acceptance matrix — all pending unless evidence recorded

| ID | Scenario | Pass condition |
| --- | --- | --- |
| Q01 | Fresh install, first toolbar click | Side panel opens; concise onboarding; no unexpected website changes/network requests |
| Q02 | New note on text/image/link | Correct target; no accidental link navigation; Save durable; reload restores |
| Q03 | New/choose/remove/switch group | Exactly one pill; plus disappears when assigned; divider/SVG correct; hover/focus × works |
| Q04 | Cancel group subview and composer | Previous group/draft restored or deliberate discard; no accidental orphan group |
| Q05 | All and group filters across 3 pages | Counts equal visible notes; zero-match pages hidden; selected fill survives hover; no dots |
| Q06 | Search + filter | Predictable intersection/counts; clear restores results; no-match message |
| Q07 | Existing-tab/new-tab/multi-window return | Correct source focused once; exact note selected even for shared selector; missing target explained |
| Q08 | Viewing versus editing | Normal links/forms work; note selection does not edit; Edit/Save/Cancel intentional |
| Q09 | Simultaneous saves and group edits | No lost records, resurrection, silent overwrite, or duplicate notes |
| Q10 | Storage failure or extension reload | Draft retained where possible; useful error; no false success or automatic site reload |
| Q11 | Delete note/page/group/all | Explicit scope, confirmation/undo, counts update; deleting group preserves notes |
| Q12 | Change DOM, remove target, insert siblings | Safe match or honest unresolved state; library still reads/edits/deletes note |
| Q13 | SPA route changes and hash routes | Notes remain tied to correct source; old arrays never saved onto new route |
| Q14 | CSS-hostile site/non-16px root/dark theme | Host computed styles unchanged while hidden; extension controls legible while visible |
| Q15 | Long text, emoji, long URLs/group names | No clipped action buttons or horizontal overflow; no HTML execution |
| Q16 | 320/400/600px panel; 200% zoom | New/Save/menus remain reachable; site resize does not strand notes |
| Q17 | Keyboard only and screen reader | Full CRUD/group/filter/search; named dialog; focus return; live save/error feedback; expand semantics |
| Q18 | Reduced motion, forced colors | No forced animation; selection/focus still perceivable |
| Q19 | Restricted/browser/store/PDF pages | Clear unsupported state; saved library still works; no injection retry loop |
| Q20 | Slow page, nested scrolling, delayed image, removed element | Bounded update work; notes reposition or report unresolved; no stale floating card |
| Q21 | Close panel, switch tab while picking | Website regains normal clicks; no abandoned interception; draft handling deliberate |
| Q22 | Export and fresh-install/upgrade | Valid complete JSON; data survives update; no unsupported sync/restore claim |
| Q23 | Privacy/network check | Only intended network requests; no note/URL analytics; policy matches observed behavior |
| Q24 | Clean release ZIP | Installs without errors; icons visible; same UX as tested checkout |

Test on stable article/documentation pages, product/listing pages, a news page with delayed content, an SPA/hash router, a dark-theme page, and a synthetic hostile-CSS fixture. Use synthetic fixtures for destructive tests. Third-party pages are supplemental coverage; avoid implying universal support from a short site list.

## Usability study

At least three people unfamiliar with the tool. Give tasks, not UI instructions: save why a detail matters; organize it; return from another page; change/remove group; read a note whose element disappeared. Observe confusion about New, group Save versus note Save, selecting versus editing, filtered counts, and local persistence. Record completion/time/errors and participant wording without sensitive page content. Fix repeated task-blocking confusion before launch. This sample is formative, not statistically representative.

## Evidence template

- Date/build/Chrome/OS:
- QA IDs and fixtures:
- Pass/fail and actual outcome:
- Screenshot or sanitized log path:
- Remaining issue/audit ID:
- Retest after fix:

Release requires every P0 criterion mapped to a passing test and no open data-loss/host-interference blocker. Unknown is not Pass.

## September 17 live Chrome smoke test

Environment: macOS, user's installed Notate (extension ID ppclnfkfekfiohpiojdjlnjgnlnmlloj), synthetic localhost tools/live-qa.html?page=1 and ?page=2. Chrome version and installed-source revision were not verified; this is evidence for the loaded build, not final package certification. Working tree contains ongoing uncommitted release work.

Observed: New opened the target picker and editor; Save created page-one text; Command–Enter saved page-two text. After page reload, the sidebar retained both separate records, each with count 1 and the exact synthetic text. Done restored ordinary link navigation. Returning to a note reused an earlier duplicate tab in another window, where an open draft obscured it; after cancelling the empty test draft the saved note was visible.

Fix from this run: findMatchingTab now prefers the active matching tab in the current window, then another same-window match, then other windows. Two automated regression tests pass. URL review also found hash routes were collapsed; #/ and #!/ routes now retain their identity, with two additional tests. Section anchors retain existing behavior. No stored data migration occurred. All 23 Node tests and static checks pass.

Pending: reload extension and retest these fixes; exact installed build/version identification; simultaneous live saves, worker restart, failure injection, SPA lifecycle and nonstandard hash routes, missing-anchor recovery, and the remaining full matrix. Two clearly labeled synthetic QA notes are retained; no personal annotations were deleted.

## Custom cursor fallback — September 17

Injected Notate UI now explicitly restores native cursors against host cursor:none rules, including !important. Descendants inherit the appropriate pointer/text/grab cursor; host elements are not changed. Confirmation dialog and backdrop get a default cursor inside their shadow root. tools/css-isolation.html now includes a global cursor:none !important fixture and six cursor assertions. Static checks and 23 Node tests pass. Browser execution of the updated fixture is pending: the in-app browser timed out and then reported unavailable. No claim of live custom-cursor-site verification.

## Release preparation follow-up — September 17

User confirmed the custom-cursor fix works on the affected site. Additional implementation now guards late reads across route changes, clears stale overlays on SPA navigation, preserves open drafts, safely handles invalid/missing selectors at render/return boundaries, and opens preserved missing-target notes for editing. These new paths have isolated regression coverage; loaded Chrome verification is still pending. Worker restart is simulated with persisted storage and request receipts, not certified by an actual suspended Chrome worker.

The side panel now exposes search and JSON export (including empty folders and timestamps). Font imports and remote favicon calls were removed; a bundled page icon is used. Manifest windows and redundant activeTab entries were removed; broad HTTP/HTTPS access, tabs, scripting, storage and sidePanel remain. Network changes were source-reviewed; no browser network trace has yet certified the final candidate.

Store privacy/listing files and a reproducible allowlisted ZIP builder are prepared. Every candidate contains a build hash and exact file hashes. Candidate packaging is not staged Chrome installation, a screenshot pass, or store approval. Owner confirmed version 1.14 has never been uploaded. Public privacy hosting and final genuine screenshots remain outstanding.

### Reloaded-build evidence

Owner confirmed first upload has not occurred; version 1.14 is available. In live Chrome the new Search and Export controls were observed. Synthetic note creation and Cmd–Enter succeeded. Removing target A, returning via sidebar, editing its preserved text and saving succeeded. Search matched the edited note and showed the no-match state for an unrelated query. Export triggered Chrome’s download indicator (download content not independently inspected). A note on #/second produced a distinct saved page; browser Back removed the stale toolbar/mode. This verifies those flows in the refreshed checkout, not installation of the staged ZIP. A final CSS cleanup restored Clear all visibility by removing old mode-specific hide rules; that final CSS change awaits a refreshed-page check.
