# Notate — store submission copy

## Short description
Annotate live webpages, organize notes into folders, and return to your ideas in context.

## Full description
Notate lets you annotate live webpages directly. Click New, select an element, and add your note. Keep observations, questions, and feedback next to the thing you are thinking about.

- Attach notes to elements on webpages and drag notes to adjust their position.
- Organize notes into colored folders, with one folder per note.
- Browse your notes in Chrome’s side panel.
- Return to a saved page and its annotated element.
- Use Command–Enter or Ctrl–Enter to save; Escape exits annotation mode.

Notes are stored locally in Chrome. No account or subscription is required. The side panel supports light and dark appearance; on-page notes keep their paper colors.

Websites can change. If an element disappears, the note remains in your library; exact attachment is not guaranteed on dynamic pages. Browser-internal pages and other Chrome-restricted pages cannot be annotated. Notate does not capture historical screenshots, sync across devices, or support collaboration or JSON import.

Support: sooimkang1015@gmail.com

## Single purpose
Annotate live webpage elements and organize, find, and return to those annotations.

## Permission justifications
- storage: Save note text, page references, folder metadata, and preferences locally.
- tabs: Find and focus an existing saved page across browser windows using its URL.
- scripting: Reconnect the annotation UI when a supported tab does not yet have the content script.
- sidePanel: Display the persistent note library beside the webpage.
- HTTP/HTTPS host access: Select elements and render/recover saved annotations on user-chosen websites, including when returning from the side panel. This build still requests broad supported-site access; optional per-site access is not implemented. Do not describe it as on-click-only access.

## Reviewer instructions
Open an ordinary HTTP/HTTPS website. Open Notate from the toolbar, click New, select a page element, type a note, and Save. Create a folder using the folder-plus button. The sidebar lists saved pages; expand a page to return to an individual note. Folder filters refine the library. Page Clear all affects that page only; sidebar Clear all affects all saved pages; both ask for confirmation. No test account is required.

## Owner / final QA items
- Publish privacy.html at a stable public HTTPS URL and paste it into the dashboard.
- Confirm an unused upload version; current manifest is still 1.14.
- Capture genuine screenshots from the final loaded build: annotation/editor, folder filter, return to a note. At least one 1280 × 800 screenshot, maximum five, per current Chrome guidance.
- Provide the required promotional images shown in the current dashboard. Do not use synthetic mockups as runtime evidence.
- Review privacy disclosure categories against actual local data handling and the dashboard wording. Do not claim rendered notes are inaccessible to websites.
- Finish staged-build live QA before submitting.

Sources checked September 17, 2026: https://developer.chrome.com/docs/webstore/cws-dashboard-listing and https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
