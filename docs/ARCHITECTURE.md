# Architecture and engineering plan

> Latest owner decision: omit Search and Export from the side panel. Their controls and handlers have been removed; older search/export requirements and verification describe a superseded build. Folder filtering remains.
 
## Storage implementation update — September 17

All annotation create/edit/move/delete/clear and folder create/edit/delete operations now use the service-worker queue in scripts/storage-writer.js through notateMutate. Each operation reads fresh state, modifies notes by stable ID, and acknowledges only after storage.set resolves. Stale edits compare the fields being changed; moves merge position only. Folder metadata and annotation changes commit in one storage.set call. A bounded list of 128 request receipts prevents duplicate transport retries, including after a worker restart while the receipt remains retained. No data migration or deletion is performed on installation.

Composer drafts survive failures, repeated saves are blocked, failed deletions keep notes, failed drags restore saved positions, and folder dialogs retain input on failure. New-note IDs are retained across retries. The previous whole-library client writers have been removed. 19 automated tests pass, including concurrency, conflicts, quota failures, retry behavior and UI recovery. Static checks pass. Loaded-Chrome multi-tab and worker-suspension QA remains a release verification step; these tests do not substitute for it. Earlier findings describe the pre-fix implementation.

## Current system

No bundler, framework, package manifest, backend, authentication, or database service. The extension loads classic scripts in declared order. The content script is wrapped with a global injection guard. Helpers attach to globalThis with their own guards; do not concatenate these files without safe statement boundaries.

| File | Current responsibility |
| --- | --- |
| manifest.json | MV3 declaration, broad HTTP(S) content injection, permissions, side panel and icons |
| index.html | Side-panel markup, group editor, onboarding; loads helpers then popup.js |
| scripts/popup.js | Library render, page navigation, group filters/management/reordering, direct storage writes; leftover view/export/clear handlers |
| scripts/webpage.js | Target selection, composer, note DOM, positioning, create/edit/delete, modes, shortcuts, direct storage writes |
| scripts/background.js | Side-panel action behavior, tab activation/injection, pending navigation handling, icon fallback |
| scripts/safe-storage.js | Storage wrappers returning empty/false on failures |
| scripts/note-meta.js | Normalization, group manipulation, colors/order, exports, HTML escaping |
| scripts/url-match.js | Current URL matching, strips all hashes/trailing slash |
| scripts/icons.js | Embedded icon data fallback |
| styles/style.css | Panel tokens/components and accessibility media queries |
| styles/webpage.css | Injected note/composer styles; currently leaks global root styles |
| styles/reset.css | Panel reset |
| copy-to-local.sh | Historical copy helper, not a release packager; unsafe self-copy fallback |

Panel load order: url-match → safe-storage → note-meta → icons → popup. Content load order: url-match → safe-storage → note-meta → webpage. Worker uses importScripts for url-match, safe-storage, icons.

### Current data flow

Panel New → active tab lookup → pending URL/group storage → ping/inject → content mode action → target/composer → direct whole-library read/modify/write → panel storage change event rerenders. Library note selection → pending selector/URL → existing/new tab → worker/content completion → preview/scroll. Both worker and content initialization may consume pending intent. There is one global pending request rather than a per-tab request map.

Content note arrays are local snapshots. The panel listens to storage changes; webpage.js does not currently subscribe to note/group updates. Mode state is three booleans plus separate modal/drag state. Scroll/resize immediately traverses all visible notes; dynamic DOM changes are not observed.

## Target boundaries — proposed, not existing files

Keep the current runtime/build approach initially. Split by responsibility as fixes require it, updating manifest/load order and injection paths together.

| Boundary | Owns | Must not own |
| --- | --- | --- |
| Domain helpers | Validation, pure filtering/group transforms, normalization | DOM, chrome APIs |
| Repository / worker mutation handler | Durable data, migrations, serialized ID-based writes, errors | UI rendering |
| Navigation service | Tab matching, permission status, request IDs, completion/error | Note text updates |
| Anchor resolver | Selector/fingerprint matching and missing/ambiguous outcomes | Deleting notes |
| Content controller | Explicit state machine, targeted user events, cleanup | Whole-library replacement |
| Overlay/composer renderer | Owned DOM and scoped styles, focus, screen layout | Storage policy |
| Panel controller/renderer | Search/filter state, page rows, actionable errors | CSS selector heuristics |
| Shared token stylesheet | Semantic visual tokens | Host-page root modifications |

Do not add all these files as empty abstractions. Extract one seam at a time with regression checks. Remove dead functions only after confirming no remaining call sites or required behavior depend on them.

## Storage and messaging

Make the service worker the sole validated writer. Commands should be intent-based: createNote, updateNote, deleteNote, assignGroup, renameGroup, recolorGroup, deleteGroup. Mutations carry IDs and expected revisions, not stale whole libraries. Serialize read/modify/write operations through a worker queue; never hold an unacknowledged UI success. A restarted worker reads persisted state; an in-memory queue alone is not crash recovery. Use request IDs, idempotent retry handling, durable revisions, and explicit response envelopes.

Proposed response: `{ok:true, requestId, revision, result}` or `{ok:false, requestId, error:{code,message,retryable}}`. Do not throw away errors and return success in finally. Validate sender, command fields, URL schemes, lengths and IDs. Keep every message handler's response channel alive until its asynchronous operation finishes. No external messaging API is required.

Separate persistent notes from transient navigation intent. Scope pending requests by tab/request ID with bounded age; acknowledge only the matching request and clear its group/selector/mode together. Test worker suspension, a tab closing during navigation, and two simultaneous return actions. Prefer session storage for transient intents where supported/tested; never make note durability depend on it.

Subscribe active views to changes. Reconcile by ID/revision. Do not overwrite a dirty local draft when another context updates it; show a conflict and preserve both values for the user. Keep UI preferences local to their appropriate session to avoid unrelated panels fighting over global filters.

## Anchoring and navigation

Immediate hardening: CSS.escape IDs; safe querySelector wrapper returning structured outcomes; contain per-note exceptions; navigate by note ID rather than selector alone. Return a missing-target state when no match exists.

Incremental improvement: store bounded normalized text and element hints alongside selector; validate selector candidate against hints; use only unique high-confidence fallback matches. Never capture password fields or input values. Ambiguous repeated text remains unresolved. Text quotations are context hints, not a website archive.

Handle document URL changes before applying saves. Prevent an old page's in-memory notes from being written to a new SPA route. Preserve meaningful query and hash-route identity; do not broadly strip queries/hash. Apply legacy URL fallback only with safe migration behavior. Observe layout/content changes only while notes are visible, debounce mutations, and batch positioning through requestAnimationFrame; nested scrollers and delayed media need tests. A removed target should stop rendering at stale coordinates and become unresolved.

## Host isolation and privacy boundary

Move Notate UI to an owned host with scoped styles/Shadow DOM. The isolated JavaScript world does not isolate shared page DOM; the current appended text is potentially readable by site scripts. Shadow DOM is useful style isolation, not a security guarantee. Do not claim notes are inaccessible to the annotated site. Keep the full library and sensitive draft handling in extension-owned surfaces where feasible; disclose the consequence of showing notes on a webpage.

Use textContent/escaping, safe selector lookup, and HTTP(S)-only navigation. Do not eval/import user code. Network inventory currently includes Google Fonts imports in both stylesheets and Google favicon URLs in page rows. Comments containing research links are not network calls. Packaged icon fetch/data URIs are local, not external requests. Remove external UI dependencies for the proposed release rather than falsely describing the current implementation as network-free.

## Permissions

Current manifest requests activeTab, tabs, windows, storage, scripting, sidePanel and broad HTTP(S) host access. Review each against actual API requirements; do not assume calling chrome.windows requires a permission literally named windows. Retain only valid necessary permissions in the tested manifest. Evaluate optional per-origin access and user gesture flows before removing broad access. Add a minimum Chrome version only after verifying all used APIs/CSS against that tested version.

Reference: [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) describes isolated execution and shared document interaction. [Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage) documents persistence/access behavior; local is not synchronized storage.

## Cleanup order

1. Reliable repository errors/mutations and migration safety.
2. Scope all injected CSS and preserve host behavior.
3. Safe anchor/navigation failure handling.
4. Single state machine and consistent submit/cancel behavior.
5. Shared tokens and component cleanup alongside UX changes.
6. Remove obsolete Pages/Groups mode, unreachable actions, classroom search-history comments after archiving useful context.
7. Package and test only actual runtime dependencies.

No runtime refactor was performed by the documentation audit. These are implementation instructions with release verification attached.

## Current release-preparation delta

webpage.js checks URL changes every 500 ms and on hashchange/popstate because page-world pushState cannot be reliably intercepted from the isolated content-script world. Route changes invalidate in-flight loads, clear overlays, stop picking, and preserve any open draft; saving that draft remains blocked by its original URL. This intentionally resets mode on route changes. Missing selector queries return null rather than throwing. Optional permission redesign and robust semantic reanchoring remain separate work.

The side panel uses local system fonts and a bundled generic page icon instead of network resources. Search intersects the folder filter before page counts are derived. Export reads one snapshot and adds folder colors/timestamps to its versioned JSON payload. It is an export feature, not a restore/import feature. tools/package.py stages an allowlist into a hash-specific release directory and verifies ZIP hashes.
