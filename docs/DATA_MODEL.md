# Data contract and migration plan
 
## Storage implementation update — September 17

All annotation create/edit/move/delete/clear and folder create/edit/delete operations now use the service-worker queue in scripts/storage-writer.js through notateMutate. Each operation reads fresh state, modifies notes by stable ID, and acknowledges only after storage.set resolves. Stale edits compare the fields being changed; moves merge position only. Folder metadata and annotation changes commit in one storage.set call. A bounded list of 128 request receipts prevents duplicate transport retries, including after a worker restart while the receipt remains retained. No data migration or deletion is performed on installation.

Composer drafts survive failures, repeated saves are blocked, failed deletions keep notes, failed drags restore saved positions, and folder dialogs retain input on failure. New-note IDs are retained across retries. The previous whole-library client writers have been removed. 19 automated tests pass, including concurrency, conflicts, quota failures, retry behavior and UI recovery. Static checks pass. Loaded-Chrome multi-tab and worker-suspension QA remains a release verification step; these tests do not substitute for it. Earlier findings describe the pre-fix implementation.

## Current storage contract (observed)

All persistent state uses chrome.storage.local through helpers. `notate-annotations` contains an object keyed by a page URL. Each page has title, url, annotations, updatedAt. Each annotation has:

```json
{
  "id": "uuid",
  "selector": "#example",
  "text": "The navigation keeps the main action visible.",
  "color": "mint",
  "group": "Navigation references",
  "offsetInline": 0,
  "offsetBlock": 0,
  "createdAt": 1789516800000,
  "interaction": {"kind": "default", "cursor": "auto", "scrollY": 0}
}
```

Other keys: `notate-group-colors` (name→color object), `notate-group-order` (name array), `notate-library-group` (selected name/empty), `notate-library-view` (legacy), `notate-onboarded` (boolean), and `notate-pending-url`, `-selector`, `-at`, `-mode`, `-group`. Group identity is currently its trimmed, case-sensitive name. `Ungrouped` and `__new__` are internal sentinels that collide with possible user names. Do not silently rename user records to resolve these.

Normalization defaults unsupported colors to yellow, absent group to empty, missing creation time to 0, and interaction to default. Notes do not have independent updatedAt/revision fields. Page timestamps drive some ordering. The current exporter includes pages/annotations but not a complete independent group/order schema. There is no importer or schema version.

## Required invariants

- Stable note ID; one page ID; at most one group ID or null.
- A missing anchor is a resolution status, not a missing note.
- No UI sentinel doubles as a user-visible group name or database identifier.
- Only successful durable mutations update the committed revision.
- No stale full-library replacement from a content script or panel.
- All/group/search result counts derive from the same filtered note collection.
- Group deletion clears membership; note deletion affects only that ID.
- Group rename never changes identity, note text, or unrelated timestamps.
- URL changes must not transfer notes between routes accidentally.
- User content cannot alter object prototypes; use IDs/Map/null-prototype maps as appropriate and validate persisted structures.

## Proposed versioned representation

This is a migration target, not existing storage. Keeping legacy storage initially while centralizing writes is acceptable; schema changes must not delay urgent data-loss fixes.

```json
{
  "schemaVersion": 2,
  "revision": 1,
  "pages": [{"id": "page-uuid", "url": "https://example.com/page", "title": "Example", "updatedAt": 1789516800000}],
  "groups": [{"id": "group-uuid", "name": "Navigation references", "color": "mint", "order": 0}],
  "notes": [{
    "id": "note-uuid",
    "pageId": "page-uuid",
    "groupId": "group-uuid",
    "text": "The navigation keeps the main action visible.",
    "createdAt": 1789516800000,
    "updatedAt": 1789516800000,
    "revision": 1,
    "anchor": {"selector": "#example", "tagName": "NAV", "textQuote": "Products Resources", "strategyVersion": 1},
    "position": {"inline": 0, "block": 0}
  }]
}
```

Use epoch milliseconds. Store the actual source URL; define an explicit comparison key separately. Keep legacy interaction metadata through migration/export even if its editor is removed. Do not persist obsolete UI state inside the note. Group color resolves from group identity; any legacy per-note color can be retained as compatibility metadata without exposing independent overrides.

## URL rules

Current behavior removes every hash and one trailing slash and keeps the search string. That can collapse different hash-routed pages. Proposed conservative rule: preserve meaningful query and hash-route identity. Ordinary section-fragment equivalence must be a documented, tested exception, not a blanket hash removal. Never blindly drop search params or use page-provided canonical URLs to merge notes. Retain original source URL for navigation. If legacy matching is ambiguous, leave records separate and surface the issue; do not merge on a guess.

## Migration protocol

1. Read successfully; distinguish absent data from read failure. If failure, stop mutation and show recovery.
2. Preserve a recoverable legacy copy where capacity allows and offer/export a user-held copy before risky migration. Handle quota failures; a backup that cannot be written is not a backup.
3. Validate records and collect unsupported/malformed entries without discarding their text. Assign new IDs only where absent, keeping a stable mapping for reruns.
4. Transform in memory; preserve totals, note text/IDs, memberships, source URLs, offsets, interaction metadata, and sensible timestamps. Use page time for legacy missing note time only as documented fallback.
5. Write the versioned document, read it back, verify invariants, then mark migration complete. Keep legacy data until verified recovery is possible. Do not remove it in the same unverified step.
6. Restart tests at every boundary; rerunning migration must not duplicate notes/groups. Downgrade behavior must be explicit; never overwrite newer schema with old code.

If the chosen storage layout spans multiple keys, do not pretend chrome.storage is a transactional database. Use a single versioned commit document or an explicit journal/commit protocol. Measure size and handle quota errors; do not add unlimitedStorage reflexively.

## Export contract

Target JSON includes app identifier, schemaVersion, exportedAt, all pages/notes, and group identities/colors/order. Export must use committed storage, not unsaved drafts. Omit transient navigation requests and unrelated browser data. Provide a readable filename such as `notate-2026-09-18.json`. Preserve Unicode, multiline text, and orphaned notes. Validate the resulting artifact in tests. Import is deferred; an export is portable data, not yet a one-click restore guarantee.

## Conflict policy

Update/delete commands identify a note plus its expected revision. On conflict, retain the new local draft and show the stored version; never overwrite silently. Group mutations update by group ID. Create requests are idempotent by request/note ID so retries cannot duplicate notes. Apply independent edits without losing unrelated records; test two tabs editing the same page as well as different pages.
