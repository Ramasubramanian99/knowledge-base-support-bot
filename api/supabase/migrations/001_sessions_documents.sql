-- Sessions and documents for the RAG customer service bot.
-- Run this in the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- An anonymous browser session. No auth: the id lives in an HttpOnly cookie.
create table if not exists public.sessions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);

create index if not exists sessions_expires_at_idx on public.sessions (expires_at);

-- One row per file in the storage bucket. Default docs are shared by every
-- session, so they are never owned by one session and never deleted by one.
create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  storage_path  text not null unique,
  original_name text not null,
  content_type  text,
  size_bytes    bigint,
  is_default    boolean not null default false,
  -- awaiting_upload -> pending -> ready (or failed) once ingestion exists
  status        text not null default 'awaiting_upload',
  created_at    timestamptz not null default now()
);

-- Which documents a session can see. Deleting a chip drops a row here only,
-- so removing a default doc never affects anyone else.
create table if not exists public.session_documents (
  session_id  uuid not null references public.sessions (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (session_id, document_id)
);

create index if not exists session_documents_session_idx
  on public.session_documents (session_id);

-- Seed the four sample documents already sitting in the storage bucket.
-- Paths are relative to the bucket root, where the sample files live.
insert into public.documents (storage_path, original_name, content_type, is_default, status)
values
  ('sample_chat_transcript.docx',  'sample_chat_transcript.docx',
   'application/vnd.openxmlformats-officedocument.wordprocessingml.document', true, 'ready'),
  ('sample_coverage_doc.pdf',      'sample_coverage_doc.pdf',
   'application/pdf', true, 'ready'),
  ('sample_phone_transcript.docx', 'sample_phone_transcript.docx',
   'application/vnd.openxmlformats-officedocument.wordprocessingml.document', true, 'ready'),
  ('sample_policy_doc.pdf',        'sample_policy_doc.pdf',
   'application/pdf', true, 'ready')
on conflict (storage_path) do nothing;
