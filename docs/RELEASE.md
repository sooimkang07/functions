# Release plan and Chrome Web Store checklist

> Latest owner decision: omit Search and Export from the side panel. Their controls and handlers have been removed; older search/export requirements and verification describe a superseded build. Folder filtering remains.

Baseline: Wednesday September 16, 2026. Aim for a tested submission Friday September 18; use September 19–20 for contingency. This is an ambitious proposed schedule, not a commitment that unresolved blockers can all be safely fixed in two days. If gates fail, ship later. Chrome review timing cannot be guaranteed; [review process](https://developer.chrome.com/docs/webstore/review-process) is separate from submission.

## Execution plan

| Day | Outcome | Work and exit condition |
| --- | --- | --- |
| Wed Sep 16 | Product/technical baseline and data safety | Documentation; typed storage errors; centralized mutation path; concurrency reproduction becomes passing regression; preserve legacy data |
| Thu Sep 17 | Safe capture/return and coherent UI | Host CSS isolation, anchor errors, route identity, explicit state transitions, consistent Save/cancel, no automatic reload; focused browser QA |
| Fri Sep 18 | Complete small launch flow | Search, visible export, accessible group management, correct counts, privacy/network cleanup, permission test, fresh install/upgrade; submit only if gates pass |
| Sat–Sun Sep 19–20 | Contingency and polish | Resolve QA failures, short usability sessions, screenshots/listing, final package; move submission if required |

Within each day, fix data integrity before visual tweaks. Owner inputs (publisher access, public support/privacy URLs) can proceed alongside engineering but must not block local progress. Defer reposition UI, advanced state capture, animations, and reattach before compromising P0. Do not use “highest caliber” as a reason to expand scope beyond a coherent core.

## Gate 1 — product and runtime

- [ ] P0 requirements R01–R16 have passing evidence.
- [ ] A01–A13 and all remaining data-loss, host-interference, privacy, and destructive-action blockers closed or removed from the shipped feature surface with documented, tested scope changes.
- [ ] Keyboard and zoom matrix passes; no right-click-only essential controls.
- [ ] Wrong/missing targets retain notes and show recovery.
- [ ] App UI and README match actual shipped controls.
- [ ] Independent usability tasks completed; critical confusion addressed.

## Gate 2 — permissions and privacy

- [ ] Inventory actual access and network traffic in the packaged build.
- [ ] Verify manifest permission validity; remove unused/redundant permissions. Do not request permissions for future features. Chrome requires [narrowest necessary permissions](https://developer.chrome.com/docs/webstore/program-policies/permissions).
- [ ] Decide and test site access: user-triggered/optional per-origin where feasible; no untested assumption that side-panel clicks grant activeTab for every tab.
- [ ] Remove Google Fonts/favicon requests for the proposed release, or disclose actual remaining behavior. No remote executable code.
- [ ] Publish an accurate public privacy policy and link it in the dashboard. Chrome requires a policy for products handling user data; [privacy policy requirements](https://developer.chrome.com/docs/webstore/program-policies/privacy).
- [ ] Store dashboard declarations, UI disclosures, and implementation agree. Explain local note/page data, retention, deletion, export, and on-page rendering exposure.

## Gate 3 — publisher and listing

- [ ] Owner confirms publisher identity/account access and completes account requirements shown by the dashboard.
- [ ] Real support contact, public privacy URL, distribution territories, and listing language supplied. Do not invent these.
- [ ] Short and full descriptions verified against final build; no “all sites,” sync, PDF, collaboration, historical snapshots, or absolute privacy claims.
- [ ] Genuine screenshots show capture, group filtering with counts, and returning to a note. Use synthetic/public demo content, no personal notes.
- [ ] Current dashboard asset dimensions/requirements checked at upload; do not assume historical dimensions are current.
- [ ] Permission justifications explain actual shipped functions and chosen access model.
- [ ] Reviewer instructions explain normal-site capture, group filtering, return, local storage, and excluded pages.

Chrome's [publishing guide](https://developer.chrome.com/docs/webstore/publish) describes uploading the ZIP and completing listing, privacy, distribution, and test information. Verify current dashboard requirements when submitting.

## Gate 4 — package and publish

- [ ] Select release version greater than the previously uploaded version; do not assume existing manifest 1.14 has been published.
- [ ] Set a tested minimum Chrome version if needed by APIs/CSS; test that minimum and current stable where practical.
- [ ] Run `node tools/check.mjs` and runtime tests.
- [ ] Stage only manifest.json, index.html, required scripts/styles/images and any deliberately bundled licensed assets. Exclude .git, docs, tools, .vscode, caches, local test data, secrets, .DS_Store, and unused assets.
- [ ] Manifest is at the ZIP root. Load the staged directory unpacked and test it; then inspect the ZIP contents. Do not run the historical copy helper as a packager.
- [ ] Verify fresh install and upgrade from a synthetic 1.14 profile with existing notes. Capture final build identity and QA record.
- [ ] Explicit owner instruction to submit/publish is present; preparation does not equal publication.
- [ ] Submit with accurate privacy/listing data. Record Submitted / Approved / Published separately; use deferred publication if launch timing matters.

## After release

Provide a support path for missing targets/storage errors without requesting users' private notes by default. Reproduce with sanitized fixtures. Fix data loss before new features. Keep migrations backward-aware and export accessible. Document rollback limits: older binaries may not understand a newer schema, so do not prescribe downgrading as automatic recovery.

No monitor, scheduled automation, store upload, public policy hosting, or user outreach was created by this documentation task.

## September 17 candidate handoff

Prepared runtime fixes, source-reviewed permission/network cleanup, local privacy HTML, listing copy, and deterministic candidate packaging. Support email confirmed: sooimkang1015@gmail.com. Owner confirmed version 1.14 has never been uploaded. Do not submit a candidate until live staged-build tests, genuine screenshots, public privacy URL, and version availability are verified. The runtime test suite includes failure recovery, concurrent mutations, simulated restart receipts, route invalidation, safe selectors, and export metadata. No store submission has occurred.
