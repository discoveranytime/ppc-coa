# PPC COA Database — Test Report

Run: 2026-10-24 · Runner: `python3 tests/test_demo.py` (Playwright, bundled Chromium)
Mode tested: **demo mode** (no Supabase project connected yet — see "Not yet testable").

## 2026-10-25 — link-record previews: 31/31 passed

- All 93 first-page previews fetched (Janoshik report scans + Freedom PDF
  page 1 renders), 9.4 MB under `assets/link-previews/`.
- Detail page now shows the vendor name at the top and the preview as a
  clickable side panel linking to the original report; test asserts the
  vendor line, the preview image path, and the source URL together.

## 2026-10-24 evening — vendor link import: 31/31 passed

- 93 link records imported (ERP 11, HYB 10, HPT 17, JEEP 34, QST 6, ZLZ 15);
  home stats now read 96 approved / 27 compounds / 3 labs, all computed.
- All 93 source URLs checked live before import: 93/93 HTTP 200, no dead links.
- Supplier filter (ZLZ → 15), Janoshik search (73), link detail page
  (not-transcribed notice + working source link) all verified in the suite.
- One supplied link skipped as a duplicate: ERP Janoshik 170026 already
  exists as seed record PPC-2026-0002.
- Honesty check: no result values were invented for link records — every
  result field reads "Not transcribed — see original report" until someone
  actually reads and transcribes the document.

## Automated results: 31/31 passed

| Area | Checks | Result |
|---|---|---|
| Load + dark default | Site loads, `data-theme="dark"` on first visit | PASS |
| Theme toggle + persistence | Toggle to light, reload, still light | PASS |
| Home statistics | 3 approved / 1 compound / 2 labs — computed from data | PASS |
| Search | "janoshik" → 2 records | PASS |
| Filter | Lab = Accumark Labs → 1 record | PASS |
| Sort | Testing-date sort puts Accumark (Oct 2026) first | PASS |
| Detail page | Shows transcribed 22.59 mg / 99.535% for the Janoshik 20 mg record; document image loads (1600 px wide) | PASS |
| Validation | Missing required fields → clear error, nothing saved | PASS |
| File validation | `.txt` rejected; 11 MB file rejected (>10 MB cap) | PASS |
| Duplicate detection | Same compound + batch + lab as an existing record → warning shown | PASS |
| Upload success | Valid PNG → confirmation + reference `PPC-2026-0004` | PASS |
| Pending gate | New submission absent from public browse (3 rows, not 4) | PASS |
| Admin protection | Admin page shows sign-in when logged out; wrong password rejected; demo password accepted | PASS |
| Admin queue | Pending submission visible in queue; approve → appears publicly (4 rows) | PASS |
| Reject flow | Reject without reason → error; with reason → record leaves queue, stays out of public browse, appears in admin Rejected tab | PASS |
| Persistence | Records survive navigation/reload (browser local storage) | PASS |
| Responsive overflow | Browse + submit form, 0 px horizontal overflow at 360 / 390 / 768 / 1024 / 1440 px | PASS (10 checks) |

## Manually verified

- Seed COA images render at full resolution in the detail viewer.
- Status taxonomy on the home page (Community-submitted → Pending → Reviewed →
  Independently confirmed) matches the brief's wording; no record claims
  verification it does not have.
- No fabricated records: the only pre-loaded data is the 3 real COAs from the
  "How to Read a COA" piece, labelled as seeded in their reviewer notes.

## Not yet testable here (needs your Supabase project + deployment)

1. **Supabase adapter end-to-end** (real uploads, RLS enforcement, signed URLs,
   admin Auth). The code is complete in `app.js` (SupabaseDB) and the policies
   are in `supabase/schema.sql`, but there is no project to point it at yet.
   To finish: follow README → SETUP (create project, run schema.sql, upload
   seed files, run seed.sql, add first admin, paste URL + anon key into
   `config.js`), then re-run the same flows on the deployed URL and confirm:
   a pending submission is invisible to an anonymous PostgREST query, and an
   anonymous update/delete request returns 401/403.
2. **Production build / deployed-site check.** There is no build step (static
   files), so "production build" = the deployed GitHub Pages site. Verify after
   Pages is enabled: home loads, the 3 seed records appear, theme persists,
   and the demo banner is gone.
3. **Rate limiting / spam behaviour under real traffic.** Covered by design
   (Supabase Auth rate limits + pending gate); observe after launch.

## Known test-environment quirks (not app bugs)

- This headless Chromium build does not synthesize a `click` event from
  programmatic mouse down/up on table-row links (mousedown/mouseup arrive,
  click never fires). The test works around it with JS-dispatched clicks.
  Real-user clicks navigate correctly (verified by direct mouse click in a
  separate probe).
- External `https` fetches fail in this sandbox (tunnel error), which is why
  all tests run against a local server. The deployed-site checks above must
  run on the real URL.
