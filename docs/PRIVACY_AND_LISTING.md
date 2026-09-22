# Privacy and listing preparation

**Draft, not a published policy.** Final text requires the owner's real publisher/contact details and verification of the release build. The audit describes current behavior; proposed copy below assumes the release gates are completed. Do not paste unsupported promises into the store.

## Current data/network inventory

| Data | Current purpose/location | Release disclosure consideration |
| --- | --- | --- |
| Note text | chrome.storage.local and rendered note DOM | User-authored personal content; local profile, not account sync |
| Page URL/title and selector | Stored with notes to return to source | May reveal browsing interests or sensitive URL parameters |
| Group names/colors/order | Local organization | Export and deletion semantics need to include group data |
| Created/page-update time, offsets, interaction kind/cursor/scroll | Local metadata | Explain only meaningful purpose; do not imply replay |
| Pending URL/selector/group/mode | Local transient return flow | Minimize retention and clean consistently |
| Saved page origins | Sent in Google favicon request URLs from panel rows | Remove for intended release; otherwise disclose accurately |
| Font requests | Google Fonts imports in panel/content styles | Remove or bundle licensed font; otherwise disclose |
| Rendered on-page note text | Shared webpage DOM | Site scripts may be able to read displayed text; no absolute confidentiality promise |

No backend, analytics integration, account system, or sync implementation was found in this code review. This is a source finding, not a network certification. Do not confuse storing data locally with collecting no user data for dashboard disclosure purposes; answer the actual dashboard definitions against the tested release.

## Proposed plain-language policy content

Publisher: **OWNER TO SUPPLY**. Support/privacy contact: **OWNER TO SUPPLY**. Effective date and public URL: **OWNER TO SUPPLY AT RELEASE**.

Notate lets you write personal notes attached to elements on webpages and organize them into groups. It stores your notes, their source addresses and titles, location information used to find the annotated element, group information, and relevant timestamps/settings in your Chrome profile on this device. Notate does not provide automatic cloud synchronization or account backup in this release.

The proposed release sends no note content to a Notate server and includes no advertising or analytics. This sentence must be verified in the packaged build. Loading the source website still contacts that website. When you choose to show an annotation on a webpage, it is displayed in that webpage's document; the website may be able to access displayed content. Avoid writing secrets into on-page annotations.

You can edit/delete notes in Notate and export your saved data to a file you control. Notes remain stored until you delete them or the browser removes the extension's local data. Uninstalling the extension removes its local extension storage; exported files are separate and remain wherever you saved them. Browser/profile/device access and backups are outside Notate's own storage controls. Do not claim encryption or guaranteed recovery.

Before publication, verify implemented deletion/export controls, remove or disclose external font/favicon traffic, add actual contact details, describe any remaining recipients/purposes, and include any required Limited Use statement applicable to the final data access. Chrome requires accurate [disclosures](https://developer.chrome.com/docs/webstore/program-policies/disclosure-requirements) and an accessible [privacy policy](https://developer.chrome.com/docs/webstore/program-policies/privacy).

## Proposed listing copy — use only once true

**Name:** Notate

**Short description:** Annotate live webpages. Attach your thoughts directly to what you see.

**Full description:**

Annotate webpages as you browse. With Notate, select an element on a live page and attach an observation, question, interpretation, or feedback directly to it. Keep browsing with your annotations in context, and use the side panel to organize and revisit them.

- Add and edit personal text notes on supported webpages.
- Organize notes into one optional group, with six group colors.
- Filter and search saved notes across websites.
- Open the original page and locate the detail you annotated.
- Export your saved notes as JSON.

Notes are stored in your current Chrome profile. No account or automatic cloud sync is included. Websites can change; if the original element cannot be found, your saved note remains available in the library. Notate does not create a screenshot or historical copy. Browser-internal pages, the Chrome Web Store, PDF viewers, and some embedded/dynamic content are not supported.

## Single-purpose draft

“Let users annotate live webpages with personal text attached to specific elements, supported by a local side-panel library for viewing and organizing their annotations.”

## Reviewer test instructions draft

Install → open an ordinary HTTP(S) article page → click Notate → Annotate → select an element → enter a synthetic note → optionally create a group → Save. Reload the website, use the library to open the note, and test group filtering/counts. Show notes permits ordinary browsing; Edit changes a selected note. Export is in More. No login required. Restricted pages intentionally show an unsupported message. Revise these instructions if final controls differ.

## Assets and rights

Use screenshots of the final loaded extension, never mockups presented as implemented screens. Demo notes should contain no personal data. Confirm ownership/license of icons and any bundled font, and include necessary license notices. A standalone marketing website is optional; a public privacy/support destination is needed. Do not create a large website project as a prerequisite for this small extension.
