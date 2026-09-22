# Notate style guide

> September 18 UI: use “notes” in user-facing copy; empty library says “No saved notes yet” at the first row position. Onboarding is inset with a rounded border on all sides and extra space before folders. Saved notes have a subtle bottom-right paper fold. Focus-color tokens are removed; keyboard focus uses currentColor.

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

Status: target system grounded in the existing palette. Current CSS is partly tokenized but duplicated and not safely isolated; this document does not claim the refactor is complete.

## Visual direction

Make the action of annotating a live webpage immediately apparent. Primary verb: **Annotate**. Supporting verbs: select, write, save, view, edit, organize, return. Product copy should invite observations and questions as well as reasons to remember a page.

Quiet white utility UI with warm dark text and restrained pastel organization. The website remains the primary visual content. Use consistent alignment and compact spacing; avoid oversized headings, gradients, glass effects, ornamental shadows, or color everywhere. One strong action per dialog.

Owner requirements: white extension background; no colored dot beside a group filter; selected group fills its text container with the group color; tighter filter padding and less rounded corners; one group pill in composer with accessible hover/focus removal.

## Canonical token specification

Create a shared, packaged token stylesheet during implementation. Apply tokens to the extension document root and the isolated overlay host; never the visited page's :root. Prefix variables `--notate-`. Values below are the source specification; existing `--color-*` variables are legacy aliases to remove incrementally.

| Semantic token | Value | Use |
| --- | --- | --- |
| --notate-color-bg | #FFFFFF | Panel and dialog base |
| --notate-color-surface | #FFFFFF | Cards/menus |
| --notate-color-text | #37352F | Main text on white and pastel fills |
| --notate-color-text-muted | #68665F | Supporting readable text; validate contrast in context |
| --notate-color-border | rgba(55,53,47,0.16) | Decorative separators; not the only control boundary |
| --notate-color-hover | rgba(55,53,47,0.08) | Neutral hover |
| --notate-color-active | rgba(55,53,47,0.12) | Neutral pressed |
| --notate-color-focus | #2383E2 | 2px focus outline; measure against adjacent surface |
| --notate-color-primary | #37352F | Save/Annotate fill |
| --notate-color-on-primary | #FFFFFF | Primary button text |
| --notate-color-danger | #A33632 | Destructive text; measure on actual surfaces |
| --notate-color-yellow | #FDECC8 | Default/group yellow |
| --notate-color-mint | #D3F8E4 | Group mint |
| --notate-color-sky | #D3E5EF | Group sky |
| --notate-color-peach | #F5E0D6 | Group peach |
| --notate-color-lilac | #E8DEEE | Group lilac |
| --notate-color-rose | #F5E0E9 | Group rose |

Spacing scale: 4, 8, 12, 16, 24, 32px (`--notate-space-1` through `-6`). Radius: 4px controls/pills, 8px dialogs/cards. Border: 1px. Icon size: 16px ordinary, 20px primary utility. Icon strokes: 1.5–2px with consistent caps. Use bundled inline SVG with currentColor and aria-hidden when a button supplies the name.

Typography: system sans for launch, or locally bundled Inter with its license if it is a deliberate branding choice. No Google Fonts runtime import. Main UI/note body 14px, secondary labels 12px, section titles 16px, brand title 20px; regular 400, medium 500, semibold 600. Body line-height 1.45. Do not shrink longer note text to tiny sizes; wrap and scroll where appropriate. Support browser zoom. Explicit overlay font sizing must not depend on the site's rem root; use px or an isolated em scale.

Motion: 80ms hover, 120ms small transition, 0ms under reduced motion. No decorative entrance animation for routine saves. Small menu/dialog shadow only; no shadows on every list row. Map shadow values to named tokens.

## Components

| Component | Specification |
| --- | --- |
| Primary button | Dark fill, white text, 4px radius, 8px/12px padding; visible focus, disabled/saving states |
| Secondary button | Neutral text, transparent fill, subtle neutral hover; same vertical rhythm |
| Filter | Visible padding 4px vertical / 8px horizontal, 4px radius; transparent when unselected, group fill when selected; no dot; selection survives hover |
| Group pill | Single compact label with group fill; click changes group; × top-left on hover/focus; removal has at least 24×24px hit area even if glyph is smaller |
| Group chooser | Existing names, 1px divider, plus SVG + New group; chosen item identified by text/pressed state; scroll within available height |
| Page row | Distinct open-source target and expand target; count aligned right; title wraps/truncates with accessible full text |
| Note preview | Plain text, readable excerpt, selected state; no destructive × as primary affordance |
| Composer | White surface, 8px radius, 12–16px padding, single text area, group control, Cancel/Save; fitting height with bounded scroll |
| Swatch | Six radio controls with color names, visible checked indicator independent of color, focus outline |
| Error | Short cause + recovery action, associated with field when applicable; no blocking alert for ordinary validation |
| Empty state | One sentence and useful next action; no marketing illustration needed |

Target pointer hit areas: 32px preferred, at least 24px for compact controls with appropriate spacing. Compact visible pills may have larger transparent hit regions. Verify these against actual keyboard/focus and zoom behavior; a numeric token alone does not establish accessibility.

## CSS architecture

- Token primitives → semantic tokens → component styles → bounded state variants. Avoid late duplicated overrides that mask earlier rules.
- Scope content UI under an extension-owned host, preferably a Shadow DOM boundary for style isolation. Shadow DOM is not a confidentiality boundary.
- Do not inject `html { font-size: 16px !important }`, generic `:root` tokens, generic `button` rules, or `.is-annotated` selectors into arbitrary host pages. Use namespaced attributes/classes where host highlighting is needed; prefer overlay outlines that do not mutate layout.
- Keep panel and on-page components visually related but separate in DOM ownership. Do not import panel resets into the website.
- Layout: flex/grid with min-width:0, overflow-wrap:anywhere for user content, bounded menu/dialog heights, logical properties. No fixed desktop-only panel width.
- Data-color maps to one semantic group-fill token. Ordinary note editing must not overwrite global group identity.
- Verify host dark themes, non-16px roots, global !important styles, forced colors, 200% zoom, and reduced motion. Fix collisions at the boundary rather than adding global specificity wars.

## Voice

Lead with the action “Annotate” (specified replacement for the current New label). Say “Annotate,” “Save,” “Edit,” “Remove from group,” “Delete note,” and “Hide notes.” Explain the difference between saving the group choice and saving the note through screen context. Avoid “capture state” or “DOM selector” in user flows. Show real errors rather than diagnosing every failure as iCloud. No claims of universal compatibility or guaranteed historical preservation.


## Sticky-note motion implementation

Save/delete uses a temporary local WebGL mesh (36 × 16 cells), with a diagonal bend and greater lift at the free corners. The plain-text note is painted locally into a canvas texture using measured DOM line positions. Duration is 720ms to place and 660ms to remove. Respect reduced motion; retain the DOM note without animation if WebGL is unavailable. Dispose GPU resources after each animation. The real DOM note remains the persistent accessible content. Browser visual validation is still required, particularly for unusual fonts and long text.


### Paper curl correction

The note shader now uses a cylindrical fold, a flat attached portion, depth testing, and a plain shaded underside instead of wave displacement. Original implementation informed by Andrew Hung’s Page Curl Shader Breakdown (https://andrewhungblog.wordpress.com/2018/04/29/page-curl-shader-breakdown/) and Codrops’ How to Unroll Images with Three.js (https://tympanus.net/codrops/2020/01/22/how-to-unroll-images-with-three-js/). No third-party source copied. Mesh is 96 × 20 cells. Browser visual review remains required.

## Injected style isolation — September 17

On-page CSS uses `--notate-` tokens on Notate-owned containers and explicit annotation targets, never global root tokens. Do not set the website's html font size. Use pixel sizing for injected UI so website rem conventions do not resize it; browser zoom remains available. Scope attribute selectors and motion overrides to owned elements. On-page typography uses local system fonts. The side panel has its own stylesheet/token scope. Recheck tools/css-isolation.html after changing injection styles.


## Current balanced note palette

All six folder fills use OKLCH lightness 90% and chroma 0.055; their hues remain distinct. Ungrouped uses the same lightness with near-neutral chroma 0.004. Hex values are sRGB conversions. This supersedes previous palettes and the pure-white ungrouped fill. Apply identical values in panel and webpage tokens. Derive borders, folded corners, and hover treatments using the existing shared mixing ratios.

| Note | Fill |
| --- | --- |
| Yellow | #ECDDB5 |
| Mint | #C2E9CE |
| Sky | #BCE5FE |
| Peach | #FDD4BE |
| Lilac | #E6D5FC |
| Rose | #FCD0E3 |
| Ungrouped | #DFDEDB |


### Neutral paper and selected folder contrast
Ungrouped paper is soft off-white #F7F7F5, intentionally lighter than folder fills. Palette coherence comes from shared hue restraint, typography, and derived borders/folds, rather than identical lightness for neutral paper. In the composer the selected folder uses 60% folder tint mixed with white, a softened inset boundary (94% folder color / 6% ink), and a remove × revealed on hover or keyboard focus. The selected label stays unchanged on hover; × removes membership. This supersedes the equal-lightness neutral and full-fill composer pill.


### Folder interaction contract
The sidebar and both new/existing note composers share folder colors and state semantics. Light-surface rest is 22% folder tint with secondary ink; hover is 40% tint; selection uses black ink without a weight change. Selected hover does not change the pill fill. Sidebar selected fill is full folder color; on colored paper selected fill is 60% color mixed with white plus a soft inset boundary, to preserve contrast against the paper. Dark sidebar rest/hover remain 9%/17% per owner preference; on-page UI remains light.

Sidebar clicks filter the library, and All clears the filter. Composer clicks assign one folder and collapse the choices. Clicking the selected label does nothing; its hover/focus × removes membership and restores choices. Creation and editing use the same picker. The × is a neutral action, not a folder swatch. Keyboard focus remains visible independently of selection. These surface-specific actions are intentional, not competing selection behaviors.


### Composer folder states — latest owner revision
In both new-note and edit-note pickers, unselected folders use full folder fill and black text. Hover uses 60% folder color mixed with white and secondary gray text. Selected uses that same 60% fill with black text and the existing soft inset boundary; selected hover retains the selected treatment and reveals the remove ×. Sidebar filtering styles remain unchanged. This supersedes the earlier shared unselected/hover tint rules for the composer.

Selected composer folders have no decorative outline or inset border. Their remove × is hidden until hover/focus, then fully opaque with solid charcoal ink and white fill. Only hovering directly over the × changes its fill to light gray (#e8e8e6). Keyboard focus outlines remain available.

## System guidance and note paper
Guides use neutral panel surface, border, text, spacing, and radius tokens: 8px container radius, 4px control radius, 14px heading and 12px supporting text. Secondary actions use the standard transparent/hover/active states and currentColor keyboard focus. Folder fills and paper folds belong to saved notes, not guides. Warnings share this structure with explicit consequence copy and a danger treatment only for destructive actions. The pin guide follows sidebar dark-mode tokens and retains its upward arrow with reduced-motion support.
