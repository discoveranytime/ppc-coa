-- PPC COA Database — seed records (REAL documents, from the "How to Read a COA"
-- educational piece). Run AFTER uploading the three files in assets/seed/ to
-- the coa-files bucket under the paths below (Storage → coa-files → Upload,
-- or via the Supabase CLI). These rows are approved because they were already
-- reviewed for the published educational piece; the app marks their origin
-- in the reviewer notes field.
insert into public.coa_records
  (ref, compound, supplier, batch, label_strength, lab, test_date, submitted_at,
   test_types, results, submitter_name, notes, file_name, file_path, file_type,
   file_size, status, review_notes, independently_confirmed, confirmation_note)
values
  ('PPC-2026-0001', 'Retatrutide', 'Ape Biotech Limited (client named on report)',
   '2026', '20 mg', 'Janoshik', '2026-08-05', '2026-08-06 12:00:00+00',
   array['Identity (blind screen)','Quantity / assay','Purity (HPLC)'],
   '{"identity":"Confirmed as retatrutide (blind screen: semaglutide, tirzepatide, retatrutide)","measuredQuantity":"22.59 mg (label 20 mg — about 13% over)","purity":"99.535%","other":"Report task #216. Ordered 30 Jul 2026, received 31 Jul 2026, analysis conducted 5 Aug 2026. Manufacturer listed as ape. Verification key IRCG44 at janoshik.com/verify. Comments section blank. No sterility, endotoxin, or heavy-metals results appear on this report."}'::jsonb,
   'PPC archive', 'Seeded from the Janoshik report featured in the “How to Read a COA” educational piece (Report A).',
   'janoshik-reta-20mg.png', 'seed/janoshik-reta-20mg.png', 'image/png', 238234,
   'approved', 'Transcribed values checked against the document during seeding.', false, ''),
  ('PPC-2026-0002', 'Retatrutide', '', '510006', '60 mg', 'Janoshik',
   '2026-06-23', '2026-06-24 12:00:00+00',
   array['Identity (blind screen)','Quantity / assay','Purity (HPLC)'],
   '{"identity":"Confirmed as retatrutide (blind screen)","measuredQuantity":"64.59 mg (label 60 mg — about 8% over)","purity":"99.823%","other":"Report task #170026. Sample described as “ERP – Dark Purple Cap – Retatrutide 60 mg”. Ordered 1 Jun 2026, received 15 Jun 2026, analyzed 23 Jun 2026. Verification key + QR printed on the report. No sterility, endotoxin, or heavy-metals results appear on this report."}'::jsonb,
   'PPC archive', 'Seeded from the earlier Janoshik report used in the “How to Read a COA” piece before it was replaced by the 20 mg report.',
   'janoshik-reta-60mg.png', 'seed/janoshik-reta-60mg.png', 'image/png', 209776,
   'approved', 'Transcribed values checked against the document during seeding.', false, ''),
  ('PPC-2026-0003', 'Retatrutide', '', 'Lot 100', '10.0 mg', 'Accumark Labs',
   '2026-10-05', '2026-10-06 12:00:00+00',
   array['Identity','Quantity / assay','Purity (HPLC, spec ≥98%)'],
   '{"identity":"Conforms (declared compound confirmed)","measuredQuantity":"10.137 mg (label 10.0 mg — about 1.4% over)","purity":"99.963% (specification ≥98% — conforms)","other":"Sample code JGAU-X699. Received 1 Oct 2026, published 5 Oct 2026. Results table includes an HPLC chromatogram. Reviewed by a lab manager (PhD) and certified by a lab director (MD), both dated 5 Oct 2026. QR code printed; no separate report-key URL on the page. No sterility, endotoxin, or heavy-metals results appear on this report."}'::jsonb,
   'PPC archive', 'Seeded from the Accumark Labs certificate featured in the “How to Read a COA” educational piece (Report B).',
   'accumark-reta-10mg.jpg', 'seed/accumark-reta-10mg.jpg', 'image/jpeg', 342304,
   'approved', 'Transcribed values checked against the document during seeding.', false, '');
