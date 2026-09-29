-- Chunks and embeddings for retrieval. One row per chunk per document, so the
-- shared defaults are embedded once and reused by every session.

create extension if not exists vector with schema extensions;

create table if not exists public.document_chunks (
  id           bigint generated always as identity primary key,
  -- Cascades with the document, so every existing cleanup path clears chunks too.
  document_id  uuid not null references public.documents (id) on delete cascade,
  chunk_index  int  not null,
  content      text not null,
  page         int,  -- null for docx, which has no pages
  embedding    extensions.vector(768) not null,
  created_at   timestamptz not null default now()
);

create index if not exists document_chunks_document_idx
  on public.document_chunks (document_id);

create index if not exists document_chunks_embedding_idx
  on public.document_chunks using hnsw (embedding extensions.vector_cosine_ops);

-- Top-k chunks by cosine similarity, limited to the documents a session can
-- see. An RPC because PostgREST cannot order by the <=> operator.
create or replace function public.match_document_chunks(
  query_embedding extensions.vector(768),
  doc_ids uuid[],
  match_count int default 5
)
returns table (document_id uuid, content text, page int, similarity float)
language sql stable
set search_path = public, extensions
as $$
  select c.document_id, c.content, c.page, 1 - (c.embedding <=> query_embedding)
  from public.document_chunks c
  where c.document_id = any(doc_ids)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
