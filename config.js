// ─────────────────────────────────────────────────────────────────────────────
// PPC COA Database — configuration
//
// Leave supabaseUrl / supabaseAnonKey EMPTY to run in demo mode (data stored in
// this browser only, clearly banner-labelled in the UI).
//
// To connect the live backend, create a Supabase project (see README → SETUP),
// run supabase/schema.sql in the SQL editor, then paste the project's URL and
// its PUBLIC anon key below. The anon key is safe to expose in client code:
// every permission is enforced by the Row Level Security policies in
// schema.sql. NEVER put the service-role key here or anywhere in this repo.
// ─────────────────────────────────────────────────────────────────────────────
window.PPC_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: "",

  // Demo mode only. In production, administrators sign in with Supabase Auth
  // and must have a row in the `admins` table — this password does nothing.
  demoAdminPassword: "ppc-demo-admin",

  // Upload rules (also enforced server-side in production — see schema.sql
  // storage policies and the submit edge checks documented in the README).
  maxFileSizeMB: 10,
  allowedFileTypes: ["application/pdf", "image/png", "image/jpeg"],
  allowedFileExtensions: [".pdf", ".png", ".jpg", ".jpeg"]
};
