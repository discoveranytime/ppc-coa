"use strict";
/* PPC COA Database — application logic.
   Data access goes through one interface (DB) with two implementations:
   DemoDB (this browser only) and SupabaseDB (production). The UI never
   talks to storage directly. */

const CFG = window.PPC_CONFIG || {};
const DEMO = !(CFG.supabaseUrl && CFG.supabaseAnonKey);

/* ── helpers ─────────────────────────────────────────────────────────────── */
const $app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));
const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d.length <= 10 ? d + "T12:00:00Z" : d);
  return isNaN(dt) ? esc(d) : dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
};
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
async function sha256(file) {
  try {
    const buf = await file.arrayBuffer();
    const hash = await crypto.subtle.digest("SHA-256", buf);
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch { return ""; }
}
const STATUS = {
  pending:  { label: "Pending review",        cls: "pending"  },
  approved: { label: "Reviewed",              cls: "approved" },
  rejected: { label: "Rejected",              cls: "rejected" },
  changes:  { label: "Corrections requested", cls: "changes"  }
};

/* ── theme ───────────────────────────────────────────────────────────────── */
const themeBtn = document.getElementById("themeToggle");
function syncThemeToggle() {
  const dark = (document.documentElement.dataset.theme || "dark") === "dark";
  themeBtn.setAttribute("aria-checked", String(dark));
  themeBtn.querySelector(".tt-label").textContent = dark ? "Dark" : "Light";
}
themeBtn.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("ppc-theme", next); } catch {}
  syncThemeToggle();
});
syncThemeToggle();
if (DEMO) document.getElementById("demoBanner").hidden = false;

/* ── IndexedDB for demo-mode uploaded files ──────────────────────────────── */
const idb = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const rq = indexedDB.open("ppc-demo-files", 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore("files");
      rq.onsuccess = () => { idb.db = rq.result; res(); };
      rq.onerror = () => rej(rq.error);
    });
  },
  async put(key, blob) {
    await idb.open();
    return new Promise((res, rej) => {
      const tx = idb.db.transaction("files", "readwrite");
      tx.objectStore("files").put(blob, key);
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
  },
  async get(key) {
    await idb.open();
    return new Promise((res, rej) => {
      const rq = idb.db.transaction("files").objectStore("files").get(key);
      rq.onsuccess = () => res(rq.result || null);
      rq.onerror = () => rej(rq.error);
    });
  },
  async del(key) {
    await idb.open();
    return new Promise((res) => {
      const tx = idb.db.transaction("files", "readwrite");
      tx.objectStore("files").delete(key);
      tx.oncomplete = res; tx.onerror = res;
    });
  }
};

/* ── DemoDB ──────────────────────────────────────────────────────────────── */
const LS_REC = "ppc-demo-records-v1", LS_AUDIT = "ppc-demo-audit-v1";
const DemoDB = {
  load() {
    let stored = [];
    try { stored = JSON.parse(localStorage.getItem(LS_REC) || "[]"); } catch {}
    const seeds = (window.PPC_SEED || []).map((s) => ({ id: "seed-" + s.ref, checksum: "", fileSize: 0, rejectReason: "", ...s }));
    const links = window.PPC_LINKS || [];
    const have = new Set(stored.map((r) => r.id));
    const merged = [...stored];
    for (const r of [...seeds, ...links]) if (!have.has(r.id)) { merged.push(r); have.add(r.id); }
    localStorage.setItem(LS_REC, JSON.stringify(merged));
    return merged;
  },
  save(records) { localStorage.setItem(LS_REC, JSON.stringify(records)); },
  auditLoad() { try { return JSON.parse(localStorage.getItem(LS_AUDIT) || "[]"); } catch { return []; } },
  async audit(action, ref, detail) {
    const log = DemoDB.auditLoad();
    log.unshift({ at: new Date().toISOString(), action, ref, detail: detail || "" });
    localStorage.setItem(LS_AUDIT, JSON.stringify(log.slice(0, 200)));
  },
  async listPublic() { return DemoDB.load().filter((r) => r.status === "approved"); },
  async listAll() { return DemoDB.load(); },
  async get(id) { return DemoDB.load().find((r) => r.id === id) || null; },
  async create(rec, file) {
    const records = DemoDB.load();
    const year = new Date().getFullYear();
    const seq = records.filter((r) => r.ref.startsWith("PPC-" + year)).length + 1;
    rec.ref = "PPC-" + year + "-" + String(seq).padStart(4, "0");
    rec.id = uid();
    if (file) await idb.put(rec.id, file);
    records.unshift(rec);
    DemoDB.save(records);
    return rec;
  },
  async update(id, patch) {
    const records = DemoDB.load();
    const i = records.findIndex((r) => r.id === id);
    if (i < 0) return null;
    records[i] = { ...records[i], ...patch };
    DemoDB.save(records);
    return records[i];
  },
  async remove(id) {
    DemoDB.save(DemoDB.load().filter((r) => r.id !== id));
    await idb.del(id);
  },
  async fileUrl(rec) {
    if (rec.filePath) return rec.filePath; // bundled seed asset
    const blob = await idb.get(rec.id);
    return blob ? URL.createObjectURL(blob) : "";
  },
  isAdmin() { return sessionStorage.getItem("ppc-admin") === "1"; },
  async signIn(password) {
    if (password === CFG.demoAdminPassword) { sessionStorage.setItem("ppc-admin", "1"); return true; }
    return false;
  },
  signOut() { sessionStorage.removeItem("ppc-admin"); }
};

/* ── SupabaseDB (production; REST + RLS — see supabase/schema.sql) ───────── */
const SupabaseDB = {
  token: sessionStorage.getItem("ppc-sb-token") || "",
  userId: sessionStorage.getItem("ppc-sb-user") || "",
  headers(json) {
    return {
      apikey: CFG.supabaseAnonKey,
      Authorization: "Bearer " + (SupabaseDB.token || CFG.supabaseAnonKey),
      ...(json ? { "Content-Type": "application/json" } : {})
    };
  },
  async req(path, opts = {}) {
    const r = await fetch(CFG.supabaseUrl + "/rest/v1/" + path, {
      ...opts, headers: { ...SupabaseDB.headers(true), ...(opts.headers || {}) }
    });
    if (!r.ok) throw new Error("Backend request failed (" + r.status + ")");
    return r.status === 204 ? null : r.json();
  },
  rowToRec(row) {
    return { ...row, testTypes: row.test_types || [], submittedAt: row.submitted_at,
             labelStrength: row.label_strength, fileName: row.file_name, filePath: row.file_path,
             fileType: row.file_type, fileSize: row.file_size, submitterName: row.submitter_name,
             reviewNotes: row.review_notes, rejectReason: row.reject_reason,
             independentlyConfirmed: row.independently_confirmed, confirmationNote: row.confirmation_note,
             testDate: row.test_date, sourceUrl: row.source_url || "", recordType: row.record_type || "document" };
  },
  async listPublic() {
    const rows = await SupabaseDB.req("coa_records?status=eq.approved&order=submitted_at.desc");
    return rows.map(SupabaseDB.rowToRec);
  },
  async listAll() {
    const rows = await SupabaseDB.req("coa_records?order=submitted_at.desc");
    return rows.map(SupabaseDB.rowToRec);
  },
  async get(id) {
    const rows = await SupabaseDB.req("coa_records?id=eq." + encodeURIComponent(id));
    return rows.length ? SupabaseDB.rowToRec(rows[0]) : null;
  },
  async create(rec, file) {
    const path = "submissions/" + Date.now() + "-" + rec.fileName.replace(/[^\w.\-]/g, "_");
    const up = await fetch(CFG.supabaseUrl + "/storage/v1/object/coa-files/" + path, {
      method: "POST",
      headers: { apikey: CFG.supabaseAnonKey, Authorization: "Bearer " + (SupabaseDB.token || CFG.supabaseAnonKey), "Content-Type": rec.fileType },
      body: file
    });
    if (!up.ok) throw new Error("File upload failed (" + up.status + ")");
    const rows = await SupabaseDB.req("coa_records", {
      method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        compound: rec.compound, supplier: rec.supplier, batch: rec.batch,
        label_strength: rec.labelStrength, lab: rec.lab, test_date: rec.testDate || null,
        test_types: rec.testTypes, results: rec.results, submitter_name: rec.submitterName,
        notes: rec.notes, file_name: rec.fileName, file_path: path, file_type: rec.fileType,
        file_size: rec.fileSize, checksum: rec.checksum, status: "pending"
      })
    });
    return SupabaseDB.rowToRec(rows[0]);
  },
  async update(id, patch) {
    const map = { compound: "compound", supplier: "supplier", batch: "batch", labelStrength: "label_strength",
      lab: "lab", testDate: "test_date", testTypes: "test_types", results: "results", status: "status",
      reviewNotes: "review_notes", rejectReason: "reject_reason",
      independentlyConfirmed: "independently_confirmed", confirmationNote: "confirmation_note" };
    const body = {};
    for (const k in patch) if (map[k]) body[map[k]] = patch[k];
    const rows = await SupabaseDB.req("coa_records?id=eq." + encodeURIComponent(id), {
      method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(body)
    });
    return rows.length ? SupabaseDB.rowToRec(rows[0]) : null;
  },
  async remove(id) { await SupabaseDB.req("coa_records?id=eq." + encodeURIComponent(id), { method: "DELETE" }); },
  async fileUrl(rec) {
    if (!rec.filePath) return "";
    if (rec.filePath.startsWith("assets/")) return rec.filePath;
    const r = await fetch(CFG.supabaseUrl + "/storage/v1/object/sign/coa-files/" + rec.filePath, {
      method: "POST", headers: SupabaseDB.headers(true), body: JSON.stringify({ expiresIn: 3600 })
    });
    if (!r.ok) return "";
    const j = await r.json();
    return CFG.supabaseUrl + "/storage/v1" + j.signedURL;
  },
  async audit(action, ref, detail) {
    try { await SupabaseDB.req("review_log", { method: "POST", body: JSON.stringify({ action, record_ref: ref, detail: detail || "" }) }); } catch {}
  },
  async auditList() {
    try { return await SupabaseDB.req("review_log?order=at.desc&limit=50"); } catch { return []; }
  },
  isAdmin() { return !!SupabaseDB.token; },
  async signIn(email, password) {
    const r = await fetch(CFG.supabaseUrl + "/auth/v1/token?grant_type=password", {
      method: "POST", headers: { apikey: CFG.supabaseAnonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!r.ok) return false;
    const j = await r.json();
    SupabaseDB.token = j.access_token; SupabaseDB.userId = j.user.id;
    sessionStorage.setItem("ppc-sb-token", j.access_token);
    sessionStorage.setItem("ppc-sb-user", j.user.id);
    const admins = await SupabaseDB.req("admins?id=eq." + j.user.id).catch(() => []);
    if (!admins.length) { SupabaseDB.signOut(); return false; }
    return true;
  },
  signOut() {
    SupabaseDB.token = ""; SupabaseDB.userId = "";
    sessionStorage.removeItem("ppc-sb-token"); sessionStorage.removeItem("ppc-sb-user");
  }
};

const DB = DEMO ? DemoDB : SupabaseDB;
if (DEMO) { DB.auditList = async () => DemoDB.auditLoad(); }

/* ── shared rendering ────────────────────────────────────────────────────── */
function statusBadge(r) {
  const s = STATUS[r.status] || STATUS.pending;
  return `<span class="badge ${s.cls}">${s.label}</span>` +
    (r.independentlyConfirmed ? ` <span class="badge confirmed">Independently confirmed</span>` : "");
}
function cardHTML(r) {
  return `<article class="panel" style="margin:0">
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between">
      <h3 style="margin:0"><a href="#/record/${esc(r.id)}">${esc(r.compound)}</a></h3>${statusBadge(r)}
    </div>
    <p style="color:var(--ink2);font-size:14.5px;margin:8px 0 0">${r.labelStrength ? esc(r.labelStrength) + " · " : ""}${esc(r.lab)}${r.batch ? " · Batch " + esc(r.batch) : ""}</p>
    <p class="small muted" style="margin:6px 0 0">Tested ${fmtDate(r.testDate)} · Submitted ${fmtDate(r.submittedAt)} · Ref ${esc(r.ref)}</p>
  </article>`;
}
function rowsHTML(list) {
  if (!list.length) return `<div class="empty"><h3 style="margin:0 0 6px">No records match.</h3><p style="margin:0">Try widening your search, or submit a COA to start the collection.</p></div>`;
  return `<div class="table-wrap"><table class="records"><thead><tr>
    <th>Compound</th><th>Lab</th><th>Batch</th><th>Tested</th><th>Submitted</th><th>Status</th></tr></thead>
    <tbody>${list.map((r) => `<tr data-id="${esc(r.id)}">
      <td><a href="#/record/${esc(r.id)}"><strong>${esc(r.compound)}</strong></a>${r.labelStrength ? `<span class="sub">${esc(r.labelStrength)}</span>` : ""}<span class="sub">Ref ${esc(r.ref)}</span></td>
      <td>${esc(r.lab)}</td><td>${esc(r.batch || "—")}</td>
      <td>${fmtDate(r.testDate)}</td><td>${fmtDate(r.submittedAt)}</td><td>${statusBadge(r)}</td></tr>`).join("")}
    </tbody></table></div>`;
}
function setNav(route) {
  document.querySelectorAll("[data-nav]").forEach((a) =>
    a.classList.toggle("active", a.dataset.nav === route));
  $app.focus({ preventScroll: true });
}

/* ── Home ────────────────────────────────────────────────────────────────── */
async function viewHome() {
  setNav("home");
  const all = await DB.listPublic().catch(() => []);
  const stats = {
    total: all.length,
    compounds: new Set(all.map((r) => r.compound.toLowerCase())).size,
    labs: new Set(all.map((r) => r.lab.toLowerCase())).size,
    pending: DEMO ? DemoDB.load().filter((r) => r.status === "pending").length : null
  };
  const recent = [...all].sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || "")).slice(0, 6);
  $app.innerHTML = `
  <section class="hero">
    <h1>Community-submitted COA database</h1>
    <p class="lede">Members of the Pushing Peptides Community contribute laboratory reports they obtained independently. This database collects, organizes, and presents those reports so anyone can check what a lab actually measured — and what it didn't.</p>
    <div class="btn-row">
      <a class="btn" href="#/submit">Submit a COA</a>
      <a class="btn secondary" href="#/browse">Browse COAs</a>
    </div>
    <form class="searchbar" onsubmit="event.preventDefault(); location.hash='#/browse?q='+encodeURIComponent(this.q.value)">
      <label class="field" style="flex:1 1 320px"><span class="small" style="font-weight:700;color:var(--ink2)">Search compounds, batches, labs, or suppliers</span>
      <input name="q" type="search" placeholder="e.g. Retatrutide, Janoshik, Batch 2026…" aria-label="Search COA records"></label>
      <button class="btn" type="submit" style="align-self:flex-end">Search</button>
    </form>
  </section>
  <section class="stats" aria-label="Database statistics">
    <div class="stat"><div class="num">${stats.total}</div><div class="lbl">Approved reports</div></div>
    <div class="stat"><div class="num">${stats.compounds}</div><div class="lbl">Unique compounds</div></div>
    <div class="stat"><div class="num">${stats.labs}</div><div class="lbl">Laboratories represented</div></div>
    <div class="stat"><div class="num">${stats.pending === null ? "—" : stats.pending}</div><div class="lbl">Awaiting review${stats.pending === null ? " (admin view)" : ""}</div></div>
  </section>
  <p class="small muted">Statistics are computed from the live database — nothing here is fabricated. Pending counts are only shown to administrators once the backend is connected.</p>
  <h2>Recently approved submissions</h2>
  ${recent.length ? `<div style="display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(320px,1fr))">${recent.map(cardHTML).join("")}</div>`
    : `<div class="empty panel">No approved records yet.</div>`}
  <h2>How submissions are reviewed</h2>
  <div class="steps">
    <div class="step"><span class="n">STEP 1</span><h3>Community-submitted</h3><p>A member uploads a report they obtained. Uploading alone proves nothing about the report.</p></div>
    <div class="step"><span class="n">STEP 2</span><h3>Pending review</h3><p>The submission sits in a private queue. It is not visible in the public database.</p></div>
    <div class="step"><span class="n">STEP 3</span><h3>Reviewed</h3><p>An administrator checks the submission for completeness and basic consistency, and transcribes what the document actually says.</p></div>
    <div class="step"><span class="n">STEP 4</span><h3>Independently confirmed</h3><p>Only when a documented verification process has been completed — and the process is described on the record — does this label appear. It is never automatic.</p></div>
  </div>
  <div class="panel" style="margin-top:18px">
    <h3 style="margin-top:0">What the results mean — and what they don't</h3>
    <p style="color:var(--ink2);margin:0">Results shown are what the original laboratory report states, as transcribed by the reviewer. A review checks completeness and consistency; it does <strong>not</strong> confirm the laboratory's accreditation, the chain of custody, the identity of the sample that was actually tested, the authenticity of the document, or the contents of any vial. A report that covers only identity, quantity, and purity says nothing about sterility, endotoxins, or heavy metals unless those tests are listed on the document.</p>
  </div>
  <div class="warn-box"><strong>Disclaimer.</strong> Submitted documents and laboratory results are not automatically verified by PPC. PPC does not test products, does not guarantee any result, and does not endorse any supplier named on a report.</div>`;
}

/* ── Browse ──────────────────────────────────────────────────────────────── */
async function viewBrowse(params) {
  setNav("browse");
  const all = await DB.listPublic().catch(() => []);
  const q0 = params.get("q") || "";
  const uniq = (fn) => [...new Set(all.map(fn).filter(Boolean))].sort();
  const compounds = uniq((r) => r.compound), labs = uniq((r) => r.lab), suppliers = uniq((r) => r.supplier);
  const tests = uniq((r) => (r.testTypes || [])).flat().length ? [...new Set(all.flatMap((r) => r.testTypes || []))].sort() : [];
  $app.innerHTML = `
  <h1>Browse COAs</h1>
  <p class="lede">Only reviewed (approved) records appear here. Pending, rejected, and correction-requested submissions are never shown to the public.</p>
  <form id="filt" class="panel filters" style="margin-top:20px" onsubmit="return false">
    <label class="field"><span>Search</span><input name="q" value="${esc(q0)}" placeholder="Compound, batch, lab, supplier, ref…" aria-label="Search"></label>
    <label class="field"><span>Compound</span><select name="compound"><option value="">All compounds</option>${compounds.map((c) => `<option>${esc(c)}</option>`).join("")}</select></label>
    <label class="field"><span>Laboratory</span><select name="lab"><option value="">All labs</option>${labs.map((c) => `<option>${esc(c)}</option>`).join("")}</select></label>
    <label class="field"><span>Supplier / vendor</span><select name="supplier"><option value="">All</option>${suppliers.map((c) => `<option>${esc(c)}</option>`).join("")}</select></label>
    <label class="field"><span>Test type</span><select name="test"><option value="">Any test</option>${tests.map((c) => `<option>${esc(c)}</option>`).join("")}</select></label>
    <label class="field"><span>Sort by</span><select name="sort">
      <option value="newest">Newest submissions</option><option value="oldest">Oldest submissions</option>
      <option value="compound">Compound name A–Z</option><option value="testdate">Testing date (newest first)</option></select></label>
  </form>
  <div id="results" aria-live="polite"></div>`;
  const f = document.getElementById("filt");
  // row clicks (outside the compound link) navigate to the detail page
  document.getElementById("results").addEventListener("click", (e) => {
    if (e.target.closest("a")) return; // the link navigates by itself
    const tr = e.target.closest("tbody tr");
    if (tr) location.hash = "#/record/" + tr.dataset.id;
  });
  const render = () => {
    const q = (f.q.value || "").toLowerCase();
    let list = all.filter((r) =>
      (!q || [r.compound, r.supplier, r.batch, r.lab, r.ref].join(" ").toLowerCase().includes(q)) &&
      (!f.compound.value || r.compound === f.compound.value) &&
      (!f.lab.value || r.lab === f.lab.value) &&
      (!f.supplier.value || r.supplier === f.supplier.value) &&
      (!f.test.value || (r.testTypes || []).includes(f.test.value)));
    if (f.sort.value === "oldest") list.sort((a, b) => (a.submittedAt || "").localeCompare(b.submittedAt || ""));
    else if (f.sort.value === "compound") list.sort((a, b) => a.compound.localeCompare(b.compound));
    else if (f.sort.value === "testdate") list.sort((a, b) => (b.testDate || "").localeCompare(a.testDate || ""));
    else list.sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
    document.getElementById("results").innerHTML =
      `<p class="small muted" style="margin:0 0 10px">${list.length} record${list.length === 1 ? "" : "s"}</p>` + rowsHTML(list);
  };
  f.addEventListener("input", render); f.addEventListener("change", render); render();
}

/* ── Detail ──────────────────────────────────────────────────────────────── */
async function viewRecord(id) {
  setNav("");
  const rec = await DB.get(id).catch(() => null);
  if (!rec || (rec.status !== "approved" && !DB.isAdmin())) {
    $app.innerHTML = `<div class="empty panel"><h2 style="margin-top:0">Record not found</h2><p>This record may be pending review, removed, or the link may be wrong. <a href="#/browse">Browse approved records</a></p></div>`;
    return;
  }
  const url = rec.sourceUrl ? "" : await DB.fileUrl(rec).catch(() => "");
  const isPdf = rec.fileType === "application/pdf";
  const results = rec.results || {};
  const tx = (v) => esc(v || (rec.recordType === "link" ? "Not transcribed — see original report" : "Not stated"));
  $app.innerHTML = `
  <p class="small"><a href="#/browse">← Back to browse</a></p>
  <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
    <h1 style="margin:0">${esc(rec.compound)}</h1>${statusBadge(rec)}
  </div>
  <p class="lede" style="margin-top:8px">Ref ${esc(rec.ref)} · ${esc(rec.lab)} · ${rec.labelStrength ? "Label strength " + esc(rec.labelStrength) + " · " : ""}Uploaded ${fmtDate(rec.submittedAt)}</p>
  <div class="detail-grid">
    <div class="panel">
      <p class="prov">From the report — transcribed</p>
      <dl class="kv">
        <dt>Compound</dt><dd>${esc(rec.compound)}</dd>
        <dt>Laboratory</dt><dd>${esc(rec.lab)}</dd>
        <dt>Testing date</dt><dd>${fmtDate(rec.testDate)}</dd>
        <dt>Batch / lot</dt><dd>${esc(rec.batch || (rec.recordType === "link" ? "Not recorded — see original report" : "Not stated on the report"))}</dd>
        <dt>Reported strength</dt><dd>${esc(rec.labelStrength || "Not stated")}</dd>
        <dt>Identity</dt><dd>${tx(results.identity)}</dd>
        <dt>Measured quantity</dt><dd>${tx(results.measuredQuantity)}</dd>
        <dt>Purity</dt><dd>${tx(results.purity)}</dd>
        <dt>Other report content</dt><dd>${tx(results.other)}</dd>
        <dt>Tests performed</dt><dd>${(rec.testTypes || []).map(esc).join(", ") || "Not stated"}</dd>
      </dl>
      <p class="prov">Provided by the submitter</p>
      <dl class="kv">
        <dt>Supplier / vendor</dt><dd>${esc(rec.supplier || "Not disclosed")}</dd>
        <dt>Submitter</dt><dd>${esc(rec.submitterName || "Anonymous")}</dd>
        <dt>Submitter notes</dt><dd>${esc(rec.notes || "—")}</dd>
      </dl>
      <p class="prov">Review</p>
      <dl class="kv">
        <dt>Status</dt><dd>${STATUS[rec.status].label}</dd>
        <dt>Reviewer notes</dt><dd>${esc(rec.reviewNotes || "—")}</dd>
        ${rec.independentlyConfirmed ? `<dt>Independently confirmed</dt><dd>${esc(rec.confirmationNote || "Confirmed through a documented verification process (see notes).")}</dd>` : ""}
      </dl>
    </div>
    <div class="panel">
      <h3 style="margin-top:0">${rec.sourceUrl ? "Original report (external link)" : "Original document"}</h3>
      ${rec.sourceUrl ? `<div class="warn-box"><strong>Link record.</strong> This entry points to the laboratory's own report page. Results have not been transcribed yet — open the original to read them. Nothing on this record has been verified beyond the link itself.</div>
      <div class="btn-row"><a class="btn" href="${esc(rec.sourceUrl)}" target="_blank" rel="noopener">View original report at ${esc(rec.lab)}</a></div>
      <p class="small muted" style="margin-top:14px;overflow-wrap:anywhere">Source: ${esc(rec.sourceUrl)}</p>`
      : `<p class="small muted" style="margin-top:0">The original uploaded file, unedited. Transcribed values above are a convenience copy — the document itself is the source of truth.</p>
      ${url ? `<div class="doc-view">${isPdf ? `<iframe src="${esc(url)}" title="COA document viewer"></iframe>` : `<img src="${esc(url)}" alt="COA document for ${esc(rec.compound)}">`}</div>
      <div class="btn-row"><a class="btn" href="${esc(url)}" target="_blank" rel="noopener">Open original</a>
      <a class="btn secondary" href="${esc(url)}" download="${esc(rec.fileName)}">Download</a></div>`
      : `<div class="warn-box">The document file is not available in this session (demo-mode files live in the browser that uploaded them). Metadata above is unchanged.</div>`}`}
      <p class="small muted" style="margin-top:14px">If anything on this record looks wrong, contact a PPC administrator with the reference number <strong>${esc(rec.ref)}</strong>.</p>
    </div>
  </div>`;
}

/* ── Submit ──────────────────────────────────────────────────────────────── */
function viewSubmit() {
  setNav("submit");
  $app.innerHTML = `
  <h1>Submit a COA</h1>
  <p class="lede">Upload a laboratory report you obtained independently. Your submission goes to a private review queue — it will <strong>not</strong> appear in the public database until an administrator approves it.</p>
  <form id="subForm" class="panel" style="margin-top:20px" novalidate>
    <div class="form-grid">
      <label class="field"><span>Compound / peptide name <span class="req">*</span></span><input name="compound" required placeholder="e.g. Retatrutide"><span class="ferr">Compound name is required.</span></label>
      <label class="field"><span>Testing laboratory <span class="req">*</span></span><input name="lab" required placeholder="e.g. Janoshik"><span class="ferr">Laboratory name is required.</span></label>
      <label class="field"><span>Supplier / vendor name (optional)</span><input name="supplier" placeholder="Leave blank if you prefer not to disclose"></label>
      <label class="field"><span>Batch / lot number (if available)</span><input name="batch" placeholder="e.g. 2026"></label>
      <label class="field"><span>Reported product strength (if applicable)</span><input name="labelStrength" placeholder="e.g. 20 mg"></label>
      <label class="field"><span>Testing date (if available)</span><input name="testDate" type="date"></label>
      <fieldset class="field full" style="border:0;padding:0;margin:0"><legend style="font-size:13px;font-weight:700;color:var(--ink2)">Tests performed (if known)</legend>
        <div class="checks">
          ${["Identity","Quantity / assay","Purity (HPLC)","Sterility","Endotoxins","Heavy metals","Residual solvents","Other"].map((t) => `<label><input type="checkbox" name="tests" value="${esc(t)}"> ${esc(t)}</label>`).join("")}
        </div></fieldset>
      <label class="field full"><span>Additional notes (optional)</span><textarea name="notes" placeholder="Anything the reviewer should know — for example, what the sample was sold as."></textarea></label>
      <label class="field full"><span>Your name or handle (optional)</span><input name="submitterName" placeholder="Shown on the record if provided"></label>
      <div class="field full" id="fileField">
        <span>Original COA file <span class="req">*</span></span>
        <div class="drop" id="dropZone">Choose a file, or drop it here.<br><span class="small">PDF, PNG, or JPEG only · max ${CFG.maxFileSizeMB || 10} MB</span></div>
        <input id="fileInput" type="file" accept=".pdf,.png,.jpg,.jpeg" style="display:none">
        <div id="fileInfo" class="small" style="margin-top:8px"></div>
        <span class="ferr">A valid COA file (PDF, PNG, or JPEG, ≤ ${CFG.maxFileSizeMB || 10} MB) is required.</span>
      </div>
    </div>
    <div id="dupWarn"></div>
    <div id="formErr"></div>
    <div class="progress" id="prog"><i id="progBar"></i></div>
    <div class="btn-row"><button class="btn" type="submit" id="submitBtn">Submit for review</button></div>
    <p class="small muted">By submitting you confirm this is a laboratory report you are entitled to share, and you understand it will be reviewed before any public listing.</p>
  </form>`;
  const form = document.getElementById("subForm");
  const fi = document.getElementById("fileInput");
  const dz = document.getElementById("dropZone");
  dz.addEventListener("click", () => fi.click());
  dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.style.borderColor = "var(--accent)"; });
  dz.addEventListener("dragleave", () => dz.style.borderColor = "");
  dz.addEventListener("drop", (e) => { e.preventDefault(); dz.style.borderColor = ""; if (e.dataTransfer.files[0]) { fi.files = e.dataTransfer.files; onFile(); } });
  fi.addEventListener("change", onFile);
  let chosen = null, checksum = "";
  async function onFile() {
    const file = fi.files[0]; chosen = file || null; checksum = "";
    const field = document.getElementById("fileField");
    if (!file) { document.getElementById("fileInfo").textContent = ""; field.classList.remove("invalid"); return; }
    const ext = "." + file.name.split(".").pop().toLowerCase();
    const okType = (CFG.allowedFileTypes || []).includes(file.type) || (CFG.allowedFileExtensions || []).includes(ext);
    const okSize = file.size <= (CFG.maxFileSizeMB || 10) * 1024 * 1024;
    document.getElementById("fileInfo").textContent = `${file.name} — ${(file.size / 1024).toFixed(0)} KB`;
    field.classList.toggle("invalid", !(okType && okSize));
    if (!okType || !okSize) { chosen = null; return; }
    checksum = await sha256(file);
    // duplicate detection: same checksum, or same compound + batch + lab
    const all = await DB.listAll().catch(() => []);
    const comp = (form.compound.value || "").trim().toLowerCase();
    const batch = (form.batch.value || "").trim().toLowerCase();
    const lab = (form.lab.value || "").trim().toLowerCase();
    const dup = all.find((r) => (checksum && r.checksum === checksum) ||
      (comp && batch && lab && r.compound.toLowerCase() === comp && (r.batch || "").toLowerCase() === batch && r.lab.toLowerCase() === lab));
    document.getElementById("dupWarn").innerHTML = dup
      ? `<div class="warn-box"><strong>Possible duplicate.</strong> A record already exists for ${esc(dup.compound)}${dup.batch ? ", batch " + esc(dup.batch) : ""} from ${esc(dup.lab)} (ref ${esc(dup.ref)}). You can still submit — a reviewer will check it — but please confirm this is a different report.</div>` : "";
  }
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    let valid = true;
    const mark = (name, ok) => { const f = form.querySelector(`[name="${name}"]`).closest(".field"); f.classList.toggle("invalid", !ok); if (!ok) valid = false; };
    mark("compound", !!form.compound.value.trim());
    mark("lab", !!form.lab.value.trim());
    const ff = document.getElementById("fileField");
    if (!chosen) { ff.classList.add("invalid"); valid = false; } else ff.classList.remove("invalid");
    if (!valid) { document.getElementById("formErr").innerHTML = `<div class="error-box">Please fix the highlighted fields and try again. Nothing was submitted.</div>`; return; }
    document.getElementById("formErr").innerHTML = "";
    const btn = document.getElementById("submitBtn"); btn.disabled = true;
    const prog = document.getElementById("prog"), bar = document.getElementById("progBar");
    prog.classList.add("on"); bar.style.width = "20%";
    const tests = [...form.querySelectorAll('[name="tests"]:checked')].map((c) => c.value);
    try {
      const rec = {
        compound: form.compound.value.trim(), supplier: form.supplier.value.trim(),
        batch: form.batch.value.trim(), labelStrength: form.labelStrength.value.trim(),
        lab: form.lab.value.trim(), testDate: form.testDate.value || "",
        submittedAt: new Date().toISOString(), testTypes: tests,
        results: { identity: "", measuredQuantity: "", purity: "", other: "" },
        submitterName: form.submitterName.value.trim(), notes: form.notes.value.trim(),
        fileName: chosen.name, fileType: chosen.type, fileSize: chosen.size, checksum,
        status: "pending", reviewNotes: "", rejectReason: "",
        independentlyConfirmed: false, confirmationNote: ""
      };
      if (DEMO) { bar.style.width = "60%"; await new Promise((r) => setTimeout(r, 350)); }
      const saved = await DB.create(rec, chosen);
      await DB.audit("submitted", saved.ref, "New submission entered the pending queue").catch(() => {});
      bar.style.width = "100%";
      $app.innerHTML = `<div class="success-box"><h2 style="margin:0 0 8px">Submission received — thank you.</h2>
        <p style="margin:0">Your submission reference number is <strong>${esc(saved.ref)}</strong>. Keep it for your records.</p>
        <p style="margin:8px 0 0">Status: <strong>Pending review</strong>. It will not appear in the public database until an administrator approves it. If the reviewer needs more information, they will follow up through the contact details you provided (if any).</p></div>
        <div class="btn-row"><a class="btn" href="#/browse">Browse approved COAs</a><a class="btn secondary" href="#/submit">Submit another COA</a></div>`;
    } catch (err) {
      btn.disabled = false; prog.classList.remove("on");
      document.getElementById("formErr").innerHTML = `<div class="error-box">Upload failed: ${esc(err.message || "an unexpected error")}. Your form entries are still here — please try again.</div>`;
    }
  });
}

/* ── Admin ───────────────────────────────────────────────────────────────── */
async function viewAdmin() {
  setNav("admin");
  if (!DB.isAdmin()) {
    $app.innerHTML = `<div class="panel" style="max-width:520px;margin:20px auto">
      <h1 style="font-size:24px">Administrator sign-in</h1>
      <p class="small muted">${DEMO ? "Demo mode: use the demo password from the README. This is not production security." : "Sign in with your administrator account. Only accounts listed in the admins table can reach the review queue."}</p>
      <form id="loginForm">
        ${DEMO ? "" : `<label class="field"><span>Email</span><input name="email" type="email" required></label>`}
        <label class="field"><span>${DEMO ? "Demo admin password" : "Password"}</span><input name="password" type="password" required autocomplete="current-password"></label>
        <div id="loginErr"></div>
        <div class="btn-row"><button class="btn" type="submit">Sign in</button></div>
      </form></div>`;
    document.getElementById("loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      const ok = DEMO ? await DB.signIn(f.password.value) : await DB.signIn(f.email.value, f.password.value);
      if (ok) router(); else document.getElementById("loginErr").innerHTML = `<div class="error-box">Sign-in failed. Check your credentials and try again.</div>`;
    });
    return;
  }
  const all = await DB.listAll().catch(() => []);
  const audit = await DB.auditList().catch(() => []);
  const tab = new URLSearchParams(location.hash.split("?")[1] || "").get("tab") || "pending";
  const shown = tab === "all" ? all : all.filter((r) => r.status === tab);
  const counts = { pending: all.filter((r) => r.status === "pending").length, changes: all.filter((r) => r.status === "changes").length, approved: all.filter((r) => r.status === "approved").length, rejected: all.filter((r) => r.status === "rejected").length };
  $app.innerHTML = `
  <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;justify-content:space-between">
    <h1 style="margin:0">Review queue</h1>
    <button class="btn secondary small" id="signOutBtn">Sign out</button>
  </div>
  <p class="lede" style="margin-top:8px">Approving a record publishes it publicly. Rejection and deletion are recorded in the audit trail below.</p>
  <div class="admin-tabs">
    ${["pending", "changes", "approved", "rejected", "all"].map((t) => `<button data-tab="${t}" class="${t === tab ? "active" : ""}">${t === "all" ? "All records" : STATUS[t].label} (${t === "all" ? all.length : counts[t]})</button>`).join("")}
  </div>
  <div id="adminList">${rowsHTML(shown)}</div>
  <h2>Audit trail</h2>
  <ul class="audit">${audit.length ? audit.map((a) => `<li>${fmtDate(a.at)} — <strong>${esc(a.action)}</strong> ${esc(a.ref || "")} ${esc(a.detail || "")}</li>`).join("") : "<li>No actions recorded yet.</li>"}</ul>
  <p class="small muted">Records are managed by clicking a row above — the detail page shows the full review controls.</p>
  <div id="inspector"></div>`;
  document.getElementById("signOutBtn").addEventListener("click", () => { DB.signOut(); router(); });
  document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { location.hash = "#/admin?tab=" + b.dataset.tab; }));
  // click a row → open the inspector instead of navigating to the public detail
  document.getElementById("adminList").addEventListener("click", (e) => {
    const tr = e.target.closest("tbody tr");
    if (!tr) return;
    e.preventDefault();
    const i = [...tr.parentNode.children].indexOf(tr);
    if (shown[i]) openInspector(shown[i]);
  });
}
async function openInspector(rec) {
  const url = await DB.fileUrl(rec).catch(() => "");
  const el = document.getElementById("inspector");
  el.innerHTML = `<div class="panel" style="margin-top:18px">
    <h2 style="margin-top:0">Review: ${esc(rec.compound)} — ${esc(rec.ref)}</h2>
    ${statusBadge(rec)}
    <form id="editForm" style="margin-top:16px">
      <div class="form-grid">
        <label class="field"><span>Compound</span><input name="compound" value="${esc(rec.compound)}"></label>
        <label class="field"><span>Laboratory</span><input name="lab" value="${esc(rec.lab)}"></label>
        <label class="field"><span>Supplier</span><input name="supplier" value="${esc(rec.supplier || "")}"></label>
        <label class="field"><span>Batch</span><input name="batch" value="${esc(rec.batch || "")}"></label>
        <label class="field"><span>Reported strength</span><input name="labelStrength" value="${esc(rec.labelStrength || "")}"></label>
        <label class="field"><span>Testing date</span><input name="testDate" type="date" value="${esc(rec.testDate || "")}"></label>
        <label class="field full"><span>Tests performed (comma separated)</span><input name="testTypes" value="${esc((rec.testTypes || []).join(", "))}"></label>
        <label class="field full"><span>Reviewer notes</span><textarea name="reviewNotes">${esc(rec.reviewNotes || "")}</textarea></label>
        <label class="field full"><span>Independently confirmed?</span><select name="independentlyConfirmed">
          <option value="no" ${!rec.independentlyConfirmed ? "selected" : ""}>No — reviewed only</option>
          <option value="yes" ${rec.independentlyConfirmed ? "selected" : ""}>Yes — a documented verification process was completed</option></select>
          <span class="hint">Only choose "Yes" if a verification process was actually completed, and describe it in the next field. This label is never automatic.</span></label>
        <label class="field full"><span>Verification process description (required if confirmed)</span><textarea name="confirmationNote">${esc(rec.confirmationNote || "")}</textarea></label>
        <label class="field full"><span>Rejection / correction reason</span><input name="rejectReason" value="${esc(rec.rejectReason || "")}" placeholder="Required when rejecting or requesting corrections"></label>
      </div>
      <div id="editErr"></div>
      <div class="btn-row">
        <button class="btn" type="button" data-act="save">Save changes</button>
        <button class="btn" type="button" data-act="approve">Approve &amp; publish</button>
        <button class="btn secondary" type="button" data-act="reject">Reject</button>
        <button class="btn secondary" type="button" data-act="changes">Request corrections</button>
        <button class="btn secondary" type="button" data-act="unpublish">Unpublish (back to pending)</button>
        <button class="btn danger" type="button" data-act="delete">Delete record</button>
      </div>
    </form>
    <h3 style="margin-top:20px">Uploaded document</h3>
    ${url ? (rec.fileType === "application/pdf" ? `<div class="doc-view"><iframe src="${esc(url)}" title="COA document"></iframe></div>` : `<div class="doc-view"><img src="${esc(url)}" alt="COA document"></div>`) : `<div class="warn-box">Document file not available in this session.</div>`}
  </div>`;
  el.scrollIntoView({ behavior: "smooth" });
  const form = document.getElementById("editForm");
  el.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", async () => {
    const act = b.dataset.act;
    const patch = {
      compound: form.compound.value.trim(), lab: form.lab.value.trim(),
      supplier: form.supplier.value.trim(), batch: form.batch.value.trim(),
      labelStrength: form.labelStrength.value.trim(), testDate: form.testDate.value || "",
      testTypes: form.testTypes.value.split(",").map((s) => s.trim()).filter(Boolean),
      reviewNotes: form.reviewNotes.value.trim(), rejectReason: form.rejectReason.value.trim(),
      independentlyConfirmed: form.independentlyConfirmed.value === "yes",
      confirmationNote: form.confirmationNote.value.trim()
    };
    const errEl = document.getElementById("editErr");
    if (patch.independentlyConfirmed && !patch.confirmationNote) { errEl.innerHTML = `<div class="error-box">"Independently confirmed" requires a description of the verification process.</div>`; return; }
    if ((act === "reject" || act === "changes") && !patch.rejectReason) { /* reject handled below */ }
    if (act === "delete") {
      if (!confirm(`Delete ${rec.ref} permanently? This cannot be undone.`)) return;
      await DB.remove(rec.id); await DB.audit("deleted", rec.ref, "Record removed by administrator").catch(() => {});
      router(); return;
    }
    let action = "edited";
    if (act === "approve") { patch.status = "approved"; action = "approved"; }
    if (act === "reject") {
      if (!patch.rejectReason) { errEl.innerHTML = `<div class="error-box">A reason is required when rejecting a submission.</div>`; return; }
      patch.status = "rejected"; action = "rejected";
    }
    if (act === "changes") {
      if (!patch.rejectReason) { errEl.innerHTML = `<div class="error-box">A reason is required when requesting corrections.</div>`; return; }
      patch.status = "changes"; action = "corrections requested";
    }
    if (act === "unpublish") { patch.status = "pending"; action = "unpublished"; }
    await DB.update(rec.id, patch);
    await DB.audit(action, rec.ref, patch.reviewNotes || "").catch(() => {});
    router();
  }));
}

/* ── Router ──────────────────────────────────────────────────────────────── */
async function router() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, qs] = raw.split("?");
  const params = new URLSearchParams(qs || "");
  window.scrollTo(0, 0);
  try {
    if (path === "" || path === "home") await viewHome();
    else if (path === "browse") await viewBrowse(params);
    else if (path.startsWith("record/")) await viewRecord(decodeURIComponent(path.slice(7)));
    else if (path === "submit") viewSubmit();
    else if (path === "admin") await viewAdmin();
    else { $app.innerHTML = `<div class="empty panel"><h2>Page not found</h2><p><a href="#/">Back home</a></p></div>`; }
  } catch (e) {
    $app.innerHTML = `<div class="error-box"><strong>Something went wrong loading this page.</strong><br>${esc(e.message || e)}</div>`;
  }
}
window.addEventListener("hashchange", router);
router();

/* ── Ambient dots (Elora-style background) ─────────────────────────────── */
(function () {
  const cv = document.getElementById("bg-dots");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const COLORS = ["#fbbf24", "#fb923c", "#22d3ee"];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let dots = [], raf = 0;
  function resize() { cv.width = window.innerWidth; cv.height = window.innerHeight; }
  function seed() {
    dots = Array.from({ length: 140 }, () => ({
      x: Math.random() * cv.width, y: Math.random() * cv.height,
      r: 1.4 + Math.random() * 2.2, c: COLORS[(Math.random() * 3) | 0],
      p: Math.random() * Math.PI * 2, s: 0.3 + Math.random() * 0.7,
      vx: (Math.random() - 0.5) * 0.16, vy: (Math.random() - 0.5) * 0.16
    }));
  }
  function draw(t) {
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const d of dots) {
      d.x += d.vx; d.y += d.vy;
      if (d.x < -10) d.x += cv.width + 20; if (d.x > cv.width + 10) d.x -= cv.width + 20;
      if (d.y < -10) d.y += cv.height + 20; if (d.y > cv.height + 10) d.y -= cv.height + 20;
      ctx.globalAlpha = 0.30 + 0.35 * (0.5 + 0.5 * Math.sin((t / 900) * d.s + d.p));
      ctx.fillStyle = d.c;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function loop(t) { draw(t); if (!document.hidden) raf = requestAnimationFrame(loop); }
  function start() {
    resize(); seed();
    cancelAnimationFrame(raf);
    if (reduced) draw(0); else raf = requestAnimationFrame(loop);
  }
  window.addEventListener("resize", start);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !reduced) { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }
  });
  start();
})();
