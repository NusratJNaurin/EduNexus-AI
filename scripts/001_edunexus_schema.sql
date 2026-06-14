-- ============================================================================
-- EduNexus AI — Supabase Schema
-- Qatar University Academic Knowledge Workspace
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
-- ============================================================================
create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  full_name       text        not null,
  qu_email        text        not null unique,
  role            user_role   not null default 'student',
  academic_domain text        not null default 'Computer Engineering',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Safely apply email constraint AFTER table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conname = 'check_qu_email'
      AND c.conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT check_qu_email
      CHECK (
        qu_email LIKE '%@qu.edu.qa'
        OR qu_email LIKE '%@student.qu.edu.qa'
      );
  END IF;
END $$;

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select using (auth.uid() = id);

-- FIXED: This allows the background trigger process to cleanly build the profile rows
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "System can create profiles during signup" on public.profiles;
create policy "System can create profiles during signup"
  on public.profiles for insert with check (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
  on public.profiles for delete using (auth.uid() = id);

-- ============================================================================
-- 2. RESEARCH_DOCUMENTS  (Research Documents)
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

create index if not exists research_documents_owner_id_idx on public.research_documents (owner_id);
alter table public.research_documents enable row level security;

drop policy if exists "Documents are viewable by owner" on public.research_documents;
create policy "Documents are viewable by owner"
  on public.research_documents for select using (auth.uid() = owner_id);

drop policy if exists "Owners can insert documents" on public.research_documents;
create policy "Owners can insert documents"
  on public.research_documents for insert with check (auth.uid() = owner_id);

drop policy if exists "Owners can update documents" on public.research_documents;
create policy "Owners can update documents"
  on public.research_documents for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "Owners can delete documents" on public.research_documents;
create policy "Owners can delete documents"
  on public.research_documents for delete using (auth.uid() = owner_id);

-- ============================================================================
-- 3. CONCEPT_NODES  (Concept Nodes / Methodology Graph)
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

create index if not exists concept_nodes_owner_id_idx on public.concept_nodes (owner_id);
create index if not exists concept_nodes_document_id_idx on public.concept_nodes (document_id);
create index if not exists concept_nodes_parent_id_idx on public.concept_nodes (parent_id);

alter table public.concept_nodes enable row level security;

drop policy if exists "Nodes are viewable by owner" on public.concept_nodes;
create policy "Nodes are viewable by owner"
  on public.concept_nodes for select using (auth.uid() = owner_id);

drop policy if exists "Owners can insert nodes" on public.concept_nodes;
create policy "Owners can insert nodes"
  on public.concept_nodes for insert with check (auth.uid() = owner_id);

drop policy if exists "Owners can update nodes" on public.concept_nodes;
create policy "Owners can update nodes"
  on public.concept_nodes for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "Owners can delete nodes" on public.concept_nodes;
create policy "Owners can delete nodes"
  on public.concept_nodes for delete using (auth.uid() = owner_id);

-- ============================================================================
-- TRIGGERS — keep updated_at fresh
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_research_documents_updated_at on public.research_documents;
create trigger set_research_documents_updated_at before update on public.research_documents
  for each row execute function public.set_updated_at();

drop trigger if exists set_concept_nodes_updated_at on public.concept_nodes;
create trigger set_concept_nodes_updated_at before update on public.concept_nodes
  for each row execute function public.set_updated_at();

-- ============================================================================
-- AUTOMATION: Sync Supabase Auth Users to Public Profiles
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  raw_role text;
  final_role public.user_role;
BEGIN
  raw_role := lower(new.raw_user_meta_data->>'role');
  
  -- Robust role validation casting
  IF raw_role IN ('student', 'faculty', 'researcher') THEN
    final_role := raw_role::public.user_role;
  ELSE
    final_role := 'student'::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, qu_email, full_name, role, academic_domain)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    final_role,
    -- FIXED: Looks for frontend metadata, defaults to table's 'Computer Engineering' string if empty
    COALESCE(new.raw_user_meta_data->>'academic_domain', 'Computer Engineering')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();