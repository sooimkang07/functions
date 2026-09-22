# Notate candidate handoff

Candidate: release/notate-1.14-7af4c0713c03/notate-1.14-candidate.zip

Done: cursor fix confirmed by owner; storage regression tests; route invalidation and late-read protection; missing-target editor recovery; removal of external fonts/favicon service; removal of redundant manifest permissions; local privacy page and listing copy; ZIP allowlist and hash verification. 26 automated tests pass.

Live verified in refreshed checkout: create/save, keyboard save, missing-target edit/save, distinct hash-route notes, Back navigation cleanup. These are not equivalent to staged-package certification.

Still required before upload/submission:
1. Load the extension directory from this candidate in a dedicated Chrome test profile and run fresh-install, multi-tab, worker suspension, keyboard/zoom and light/dark checks. The last toolbar CSS adjustment needs visual retesting.
2. Capture genuine screenshots from that final build. Current store guidance requires at least one 1280×800 screenshot; other required promotional assets must match the dashboard.
3. Host store/privacy.html publicly and enter its HTTPS URL in the dashboard. Support email is sooimkang1015@gmail.com.
4. Review privacy disclosures and broad HTTP/HTTPS access justification against the final build and dashboard fields.
5. Upload the candidate only after the above gates pass, then submit only with explicit publisher authorization.

Version 1.14 has never been uploaded, per owner confirmation. No upload or publication has occurred. Synthetic QA notes were left in place; no user notes were intentionally deleted. The local QA server was stopped after testing.

Search and Export were removed by owner request before finalizing; earlier screenshots and test evidence for those controls are superseded.
