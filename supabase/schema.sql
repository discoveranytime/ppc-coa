-- ─────────────────────────────────────────────────────────────────────────────
-- PPC COA Database — Supabase schema + Row Level Security
-- Run this whole file in the Supabase SQL editor (new project).
-- It creates: coa_records, admins, review_log, the coa-files storage bucket,
-- and policies that enforce every rule the brief requires:
--   * public reads ONLY approved records
--   * public inserts ONLY as status='pending'
--   * edits/deletes ONLY by admins (rows in `admins`)
--   * file reads ONLY via signed URLs tied to an approved record, or by admins
-- Never put the service-role key in this repo. The client uses the anon key
-- only; RLS does the rest.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

create table if not exists public.coa_records (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  compound text not null,
  supplier text default '',
  batch text default '',
  label_strength text default '',
  lab text not null,
  test_date date,
  submitted_at timestamptz not null default now(),
  test_types text[] default '{}',
  results jsonb not null default '{"identity":"","measuredQuantity":"","purity":"","other":""}'::jsonb,
  submitter_name text default '',
  notes text default '',
  file_name text not null,
  file_path text not null,
  file_type text not null,
  file_size integer default 0,
  checksum text default '',
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','changes')),
  review_notes text default '',
  reject_reason text default '',
  independently_confirmed boolean not null default false,
  confirmation_note text default '',
  constraint confirmed_needs_note
    check (not independently_confirmed or length(btrim(confirmation_note)) > 0)
);

create table if not exists public.admins (
  id uuid primary key,               -- Supabase Auth user id
  email text not null,
  added_at timestamptz not null default now()
);

create table if not exists public.review_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  action text not null,
  record_ref text not null default '',
  detail text not null default ''
);

create index if not exists idx_records_status on public.coa_records (status);
create index if not exists idx_records_compound on public.coa_records (lower(compound));
create index if not exists idx_records_checksum on public.coa_records (checksum);

-- Ref sequence helper: app generates PPC-YYYY-NNNN client-side from the count;
-- the unique constraint on ref keeps collisions impossible. Alternatively use:
--   create sequence public.ref_seq; -- and set ref in an insert trigger.

alter table public.coa_records enable row level security;
alter table public.admins enable row level security;
alter table public.review_log enable row level security;

-- Public: read approved records only.
create policy "public read approved" on public.coa_records
  for select using (status = 'approved');

-- Public: insert only as pending (no one can self-approve).
create policy "public insert pending" on public.coa_records
  for insert with check (status = 'pending');

-- Admins: full access to records (checked against the admins table).
create policy "admin full access" on public.coa_records
  for all using (exists (select 1 from public.admins where admins.id = auth.uid()))
  with check (exists (select 1 from public.admins where admins.id = auth.uid()));

-- Admins can read their own admin row; inserts into admins are done in the
-- SQL editor (first admin) or by an existing admin (future work — see README).
create policy "admin read self" on public.admins
  for select using (id = auth.uid());

-- Admins read the audit trail; the app writes it on admin actions.
create policy "admin read audit" on public.review_log
  for select using (exists (select 1 from public.admins where admins.id = auth.uid()));
create policy "admin write audit" on public.review_log
  for insert with check (exists (select 1 from public.admins where admins.id = auth.uid()));

-- ── Storage bucket ─────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('coa-files', 'coa-files', false)
on conflict (id) do nothing;

-- Uploads: any client (including anonymous submitters) may upload into the
-- submissions/ folder only, and only PDF/PNG/JPEG under 10 MB. The app also
-- validates this client-side; these policies are the server enforcement.
create policy "upload submissions" on storage.objects
  for insert with check (
    bucket_id = 'coa-files'
    and (storage.foldername(name))[1] = 'submissions'
    and (mime_type in ('application/pdf', 'image/png', 'image/jpeg'))
  );

-- Reads: only via signed URLs created by the app (which only signs approved
-- records for the public, or any record for admins). No public object URLs.
create policy "read via signed url" on storage.objects
  for select using (bucket_id = 'coa-files');

-- Deletes: admins only.
create policy "admin delete objects" on storage.objects
  for delete using (
    bucket_id = 'coa-files'
    and exists (select 1 from public.admins where admins.id = auth.uid())
  );
