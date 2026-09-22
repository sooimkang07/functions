# Product reasoning

These recommendations derive from the owner's problem statement and code audit. They are not claims of user-tested superiority or competitor research.

## What is the product centered on?

**Annotating live webpages is the primary activity.** The owner clarified this on September 17, 2026. A person sees something, selects it, and writes a thought attached to it. That thought may be a question, explanation, observation, or feedback—not only a reason to bookmark the page. Its immediate value is making the user's thinking visible in context.

Evaluate features by whether they improve selecting, writing, viewing, or editing an annotation on the live page. Organization and recall are supporting benefits. Use **Annotate** for the primary action and keep **Save** for committing the written annotation. Keep group naming and library management out of the required path to a first annotation.

## Sidebar or popup?

**Keep the native side panel as a supporting surface.** The live webpage is the annotation workspace. The panel can keep annotation controls and existing annotations available while a person interacts with the page. A small action popup disappears when focus moves away and makes an on-page capture workflow feel interrupted. A full-tab manager has more space but separates the user from the very context Notate is preserving.

Tradeoff: the panel reduces page width and may trigger responsive layout changes. Resolve anchors and reposition overlays after resize; test layouts with the panel open. Use the panel for library, search, group management, and recovery; keep the on-page composer near the chosen target. Do not maintain a second competing popup UI for launch. Chrome explicitly supports extension content alongside webpages through the [Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel).

## Separate viewing and editing?

**Yes, as interaction states; no extra permanent mode switch is needed.** Browsing is the default. The user chooses Annotate to enter temporary target selection or Edit to change a particular note. A single note click reveals/selects it; it must not unexpectedly become a text editor. Save returns to viewing; creating multiple notes requires Annotate again. Escape backs out one layer at a time.

Existing preview mode is a useful starting point, but its note clicks still open editing and advanced Alt gestures exist. Those mechanics need to align with the specification. Avoid an always-on annotation mode that steals website clicks, and avoid separate persistent “move mode” controls in the primary toolbar.

## Why attach to elements rather than coordinates or screenshots?

Elements are the source context the user actually cares about and follow ordinary layout movement. Absolute coordinates become wrong on responsive pages and after content insertion. Screenshots preserve pixels but lose live interaction; capturing them would create a second product/storage problem.

Element anchoring is still imperfect. Use a safe selector plus a bounded textual fingerprint, validate matches, and label missing/ambiguous targets. A note is durable even when its anchor fails. Do not blindly reattach based on similar text. Hover labels describe what the user observed, not a saved interactive session. Defer those advanced labels from primary UX until they communicate this clearly.

## Which organization model?

**One optional group per note, across websites.** Page-level folders cannot represent different observations on the same website. Multiple tags/groups increase assignment and filter complexity unnecessarily for launch. Group changes replace membership. A group owns one of six colors. Removing a group leaves the note in All.

Group pills act as filters over one consistent page list. Avoid switching between incompatible “Groups” and “Pages” screen models. Search works within the filter; page counts reflect exactly what is shown. Keep a visible way to manage groups; context menus may be a shortcut but never the sole route.

## What should be visible on the webpage?

Show saved note cards only after an explicit view or capture action. Never cover every page automatically on install or navigation. Keep page links and forms working while viewing. The overlay layer is pointer-transparent except actual controls/cards. Selected-note emphasis and scrolling must respect reduced motion.

A future compact marker mode could help dense pages; do not introduce a second representation until research shows cards create repeated obstruction. If a note obstructs content, Hide notes is immediate. Closing the side panel must not leave click interception active; cancel picking when its initiating session disconnects.

## How much customization?

Use restrained group colors for scanning. Group names carry meaning; color alone is insufficient. Keep one consistent note typography and density. Per-note font/style menus increase effort before the user has saved their thought and complicate accessibility. Group color edits belong in group management, not ordinary note editing.

## Local or account-based storage?

**Local-first, without an account for launch.** This fits personal annotation and lowers setup cost. Explicitly say notes are stored in the current Chrome profile and are not automatically synced or backed up. Export reduces lock-in; import needs validation and conflict handling before it can be promised as restore.

Local storage does not mean secrecy from websites when text is rendered into their shared DOM. Keep the full library in extension-owned UI and minimize on-page disclosure. See the threat model in ARCHITECTURE.md. Remote fonts and Google favicon requests in the current code also make a blanket “no external requests” claim inaccurate.

## Permissions strategy

Proposed target: user-triggered access plus optional per-site persistent access where reopening saved pages requires it. An open side panel does not automatically grant access to every subsequent tab; permission requests must occur through supported gestures. Prototype the complete capture/return flow before changing the manifest. An activeTab-only design with no user-facing reauthorization path would break return flows. Chrome documents [temporary activeTab access](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) and requires [narrowest necessary permissions](https://developer.chrome.com/docs/webstore/program-policies/permissions).

Broad access is not automatically a rejection, but every permission must serve the shipped feature and be justified. Keep the current behavior working while selecting and testing the final model. Do not make store promises before that decision is implemented.

## Launch tradeoff

Ship a small, dependable live webpage annotation tool. Fix persistence, CSS isolation, target failures, and error states before decorative animation, broader platforms, or custom styling. This week's goal can be a tested submission; review timing belongs to Chrome. A rushed public release that loses the reason someone saved a page defeats the product's central purpose.
