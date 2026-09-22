
### Missing elements: preserve the on-page note (September 18)
Missing targets render their saved note near its remembered position, with a dismissible warning below the card. New notes persist a document-coordinate fallback; current-session positions take precedence and drag offsets still apply. Older notes without position data use a visible fallback and explicitly say the original position was not saved. No uncertain element is substituted. Clicking the note still opens the centered editor.


### Balanced note palette
Folder colors share perceived lightness and chroma; ungrouped paper shares their lightness with near-zero chroma. This replaces pure-white ungrouped paper so all seven fills belong to the same palette. Sidebar-only dark mode remains unchanged.


### Neutral paper and selected folder contrast
Ungrouped paper is soft off-white #F7F7F5, intentionally lighter than folder fills. Palette coherence comes from shared hue restraint, typography, and derived borders/folds, rather than identical lightness for neutral paper. In the composer the selected folder uses 60% folder tint mixed with white, a softened inset boundary (94% folder color / 6% ink), and a remove × revealed on hover or keyboard focus. The selected label stays unchanged on hover; × removes membership. This supersedes the equal-lightness neutral and full-fill composer pill.


### Composer folder states — latest owner revision
In both new-note and edit-note pickers, unselected folders use full folder fill and black text. Hover uses 60% folder color mixed with white and secondary gray text. Selected uses that same 60% fill with black text and the existing soft inset boundary; selected hover retains the selected treatment and reveals the remove ×. Sidebar filtering styles remain unchanged. This supersedes the earlier shared unselected/hover tint rules for the composer.


### View before creating
Sidebar navigation enters preview mode: notes remain visible and editable while webpage clicks behave normally. New enters target picking with the pencil cursor. Saving a new note keeps annotation mode active for continuous creation. Only pressing Done/Esc while picking returns to preview. Close/Esc in preview hides notes. Creation shortcuts are restricted to annotation mode.

Preview mode also permits dragging saved notes with the existing durable position-save and failure rollback. A simple click still edits; dragging suppresses that click. The grab cursor indicates this affordance.


### Optional visual welcome tour
First installs open packaged welcome.html; updates do not reopen it. The existing sidebar tip links to the tour. Four skippable lessons use local interactive illustrations and in-memory practice text: pin/open, annotate, folder, return. Design feedback, research, and shopping recall are optional examples. No onboarding telemetry, network assets, or library mutations. The tour is supplementary; users can begin immediately on a regular webpage.


## September 19 — welcome setup page
The standalone welcome page follows the owner’s supplied reference: large welcome heading, bordered setup checklist with progress, and a wide light-gray stage with centered browser illustrations and pill actions. Graphics embed the shipped Notate icon. Steps cover installation, opening the side panel, pinning, and the existing isolated practice exercise. Installation is already complete on entry; other checkmarks reflect completed tour actions, not inferred Chrome pin state. The Open sidebar action calls Chrome’s side-panel API directly from a click. Practice stays separate from saved notes. This changes the welcome page only.


### September 19 — live setup progression
The installed welcome page opens the real side panel directly from its button. Same-extension, same-window ephemeral messages detect manual opening and already-open panels; opening advances to pinning. Chrome action settings determine actual pin completion, including settings-change events and focus refresh. Pinning advances to practice; selecting another tour step no longer marks pinning complete. “Not now” skips without a completion check. The reminder appears beneath Chrome’s native panel header during the pin step, on folded yellow paper with a bouncing arrow (static with reduced motion). No note storage is touched. Completed checklist circles use #FFE992. The localhost page is only a visual preview and cannot open the installed Chrome extension.

## September 20 — first real note completes setup
The Get started step keeps the illustrated instructions, opens sooimkang.com with sidebar guidance pointing at New, and completes only after a real note is durably created. No dummy note is inserted. A local boolean is committed with the note by the storage writer and retained after note deletion, so reopening the tour preserves completion. Live installed-Chrome verification remains required.
