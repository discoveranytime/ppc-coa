// ─────────────────────────────────────────────────────────────────────────────
// Seed records — REAL documents, transcribed exactly from the reports as
// published in PPC's "How to Read a COA" educational piece. No invented
// values. In demo mode these load into the browser's local database on first
// run; in production, run supabase/seed.sql after uploading the same three
// files from assets/seed/ to the storage bucket.
// ─────────────────────────────────────────────────────────────────────────────
window.PPC_SEED = [
  {
    ref: "PPC-2026-0001",
    compound: "Retatrutide",
    supplier: "Ape Biotech Limited (client named on report)",
    batch: "2026",
    labelStrength: "20 mg",
    lab: "Janoshik",
    testDate: "2026-08-05",
    submittedAt: "2026-08-06T12:00:00Z",
    testTypes: ["Identity (blind screen)", "Quantity / assay", "Purity (HPLC)"],
    results: {
      identity: "Confirmed as retatrutide (blind screen: semaglutide, tirzepatide, retatrutide)",
      measuredQuantity: "22.59 mg (label 20 mg — about 13% over)",
      purity: "99.535%",
      other: "Report task #216. Ordered 30 Jul 2026, sample received 31 Jul 2026, analysis conducted 5 Aug 2026. Manufacturer listed on report as \u201cape\u201d. Verification key IRCG44 at janoshik.com/verify. Comments section on the report is blank. No sterility, endotoxin, or heavy-metals results appear on this report."
    },
    submitterName: "PPC archive",
    notes: "Seeded from the Janoshik report featured in the \u201cHow to Read a COA\u201d educational piece (Report A).",
    fileName: "janoshik-reta-20mg.png",
    filePath: "assets/seed/janoshik-reta-20mg.png",
    fileType: "image/png",
    status: "approved",
    reviewNotes: "Transcribed values checked against the document during seeding.",
    independentlyConfirmed: false,
    confirmationNote: ""
  },
  {
    ref: "PPC-2026-0002",
    compound: "Retatrutide",
    supplier: "",
    batch: "510006",
    labelStrength: "60 mg",
    lab: "Janoshik",
    testDate: "2026-06-23",
    submittedAt: "2026-06-24T12:00:00Z",
    testTypes: ["Identity (blind screen)", "Quantity / assay", "Purity (HPLC)"],
    results: {
      identity: "Confirmed as retatrutide (blind screen)",
      measuredQuantity: "64.59 mg (label 60 mg — about 8% over)",
      purity: "99.823%",
      other: "Report task #170026. Sample described on the report as \u201cERP \u2013 Dark Purple Cap \u2013 Retatrutide 60 mg\u201d. Ordered 1 Jun 2026, received 15 Jun 2026, analyzed 23 Jun 2026. Verification key + QR printed on the report. No sterility, endotoxin, or heavy-metals results appear on this report."
    },
    submitterName: "PPC archive",
    notes: "Seeded from the earlier Janoshik report used in the \u201cHow to Read a COA\u201d piece before it was replaced by the 20 mg report.",
    fileName: "janoshik-reta-60mg.png",
    filePath: "assets/seed/janoshik-reta-60mg.png",
    fileType: "image/png",
    status: "approved",
    reviewNotes: "Transcribed values checked against the document during seeding.",
    independentlyConfirmed: false,
    confirmationNote: ""
  },
  {
    ref: "PPC-2026-0003",
    compound: "Retatrutide",
    supplier: "",
    batch: "Lot 100",
    labelStrength: "10.0 mg",
    lab: "Accumark Labs",
    testDate: "2026-10-05",
    submittedAt: "2026-10-06T12:00:00Z",
    testTypes: ["Identity", "Quantity / assay", "Purity (HPLC, spec \u226598%)"],
    results: {
      identity: "Conforms (declared compound confirmed)",
      measuredQuantity: "10.137 mg (label 10.0 mg — about 1.4% over)",
      purity: "99.963% (specification \u226598% — conforms)",
      other: "Sample code JGAU-X699. Received 1 Oct 2026, published 5 Oct 2026. Results table includes an HPLC chromatogram. Reviewed by a lab manager (PhD) and certified by a lab director (MD), both dated 5 Oct 2026. QR code printed; no separate report-key URL on the page. No sterility, endotoxin, or heavy-metals results appear on this report."
    },
    submitterName: "PPC archive",
    notes: "Seeded from the Accumark Labs certificate featured in the \u201cHow to Read a COA\u201d educational piece (Report B).",
    fileName: "accumark-reta-10mg.jpg",
    filePath: "assets/seed/accumark-reta-10mg.jpg",
    fileType: "image/jpeg",
    status: "approved",
    reviewNotes: "Transcribed values checked against the document during seeding.",
    independentlyConfirmed: false,
    confirmationNote: ""
  }
];
