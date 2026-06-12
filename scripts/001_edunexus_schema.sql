-- ============================================================================
-- EduNexus AI — Supabase Schema
-- Qatar University Academic Knowledge Workspace
-- ----------------------------------------------------------------------------
-- Entities: profiles (Users), research_documents, concept_nodes
-- Security: Row-Level Security (RLS) enabled on every table, with
--           owner-scoped policies tied to auth.uid().
-- ============================================================================

-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ENUM TYPES
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('student', 'faculty', 'researcher');
  end if;

  if not exists (select 1 from pg_type where typname = 'concept_node_type') then
    create type concept_node_type as enum ('paper', 'prerequisite', 'research_gap');
  end if;
end$$;

-- ============================================================================
-- 1. PROFILES  (Users)
-- ----------------------------------------------------------------------------
-- Mirrors Supabase auth.users. The id is the same UUID as auth.users.id so
-- every row is owned by exactly one authenticated user.
-- ============================================================================
create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  full_name       text        not null,
  qu_email        text        not null unique,
  role            user_role   not null default 'student',
  academic_domain text        not null default 'general',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
  on public.profiles for delete
  using (auth.uid() = id);

-- ============================================================================
-- 2. RESEARCH_DOCUMENTS  (Research Documents)
-- ----------------------------------------------------------------------------
-- Central hub of the platform. Each document belongs to one profile (owner).
-- ============================================================================
create table if not exists public.research_documents (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references public.profiles (id) on delete cascade,
  title             text not null,
  file_name         text,
  file_url          text,
  file_size_bytes   bigint,
  page_count        integer,
  extracted_text    text,
  keywords          text[]       not null default '{}',
  readability_score numeric(5,2),
  complexity_score  numeric(5,2),
  methodology_latex text,
  created_at        timestamptz  not null default now(),
  updated_at        timestamptz  not null default now()
);

create index if not exists research_documents_owner_id_idx
  on public.research_documents (owner_id);

alter table public.research_documents enable row level security;

drop policy if exists "Documents are viewable by owner" on public.research_documents;
create policy "Documents are viewable by owner"
  on public.research_documents for select
  using (auth.uid() = owner_id);

drop policy if exists "Owners can insert documents" on public.research_documents;
create policy "Owners can insert documents"
  on public.research_documents for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Owners can update documents" on public.research_documents;
create policy "Owners can update documents"
  on public.research_documents for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Owners can delete documents" on public.research_documents;
create policy "Owners can delete documents"
  on public.research_documents for delete
  using (auth.uid() = owner_id);

-- ============================================================================
-- 3. CONCEPT_NODES  (Concept Nodes / Methodology Graph)
-- ----------------------------------------------------------------------------
-- Models the relational web of the methodology workspace. Each node belongs to
-- an owner and optionally references an originating research document. Nodes
-- link to one another via a self-referential parent edge (prerequisite/cite).
-- ============================================================================
create table if not exists public.concept_nodes (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  document_id   uuid references public.research_documents (id) on delete set null,
  parent_id     uuid references public.concept_nodes (id) on delete set null,
  node_type     concept_node_type not null default 'paper',
  label         text not null,
  description   text,
  position_x    numeric(8,2) not null default 0,
  position_y    numeric(8,2) not null default 0,
  viva_score    numeric(5,2),
  viva_feedback text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists concept_nodes_owner_id_idx
  on public.concept_nodes (owner_id);
create index if not exists concept_nodes_document_id_idx
  on public.concept_nodes (document_id);
create index if not exists concept_nodes_parent_id_idx
  on public.concept_nodes (parent_id);

alter table public.concept_nodes enable row level security;

drop policy if exists "Nodes are viewable by owner" on public.concept_nodes;
create policy "Nodes are viewable by owner"
  on public.concept_nodes for select
  using (auth.uid() = owner_id);

drop policy if exists "Owners can insert nodes" on public.concept_nodes;
create policy "Owners can insert nodes"
  on public.concept_nodes for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Owners can update nodes" on public.concept_nodes;
create policy "Owners can update nodes"
  on public.concept_nodes for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Owners can delete nodes" on public.concept_nodes;
create policy "Owners can delete nodes"
  on public.concept_nodes for delete
  using (auth.uid() = owner_id);

-- ============================================================================
-- TRIGGERS — keep updated_at fresh on every row update
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_research_documents_updated_at on public.research_documents;
create trigger set_research_documents_updated_at
  before update on public.research_documents
  for each row execute function public.set_updated_at();

drop trigger if exists set_concept_nodes_updated_at on public.concept_nodes;
create trigger set_concept_nodes_updated_at
  before update on public.concept_nodes
  for each row execute function public.set_updated_at();
