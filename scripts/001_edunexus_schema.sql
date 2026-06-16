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
-- 1. PROFILES (Users)
-- ============================================================================
create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  full_name       text not null,
  qu_email        text not null unique,
  role            user_role not null default 'student',
  academic_domain text not null default 'Computer Engineering',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  
  -- Inline constraint keeps things clean and error-free on initialization
  constraint check_qu_email check (
    qu_email like '%@qu.edu.qa' or qu_email like '%@student.qu.edu.qa'
  )
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated using (true);

drop policy if exists "System can create profiles during signup" on public.profiles;
create policy "System can create profiles during signup"
  on public.profiles for insert to authenticated with check (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ============================================================================
-- 2. RESEARCH_DOCUMENTS (Research Documents)
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
  keywords          text[] not null default '{}',
  readability_score numeric(5,2),
  complexity_score  numeric(5,2),
  methodology_latex text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists research_documents_owner_id_idx on public.research_documents (owner_id);
alter table public.research_documents enable row level security;

drop policy if exists "Documents are viewable by owner or evaluator" on public.research_documents;
create policy "Documents are viewable by owner or evaluator"
  on public.research_documents for select to authenticated
  using (
    auth.uid() = owner_id or 
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() and (profiles.role = 'faculty' or profiles.role = 'researcher')
    )
  );

drop policy if exists "Owners can insert documents" on public.research_documents;
create policy "Owners can insert documents"
  on public.research_documents for insert to authenticated with check (auth.uid() = owner_id);

drop policy if exists "Owners can update documents" on public.research_documents;
create policy "Owners can update documents"
  on public.research_documents for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "Owners can delete documents" on public.research_documents;
create policy "Owners can delete documents"
  on public.research_documents for delete to authenticated using (auth.uid() = owner_id);

-- ============================================================================
-- 3. CLASS_SECTIONS (Invite-only cohort sections)
-- ============================================================================
create table if not exists public.class_sections (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.profiles (id) on delete cascade,
  course_code text not null,
  section_number text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_sections_unique_per_instructor unique (instructor_id, course_code, section_number)
);

create index if not exists class_sections_instructor_id_idx on public.class_sections (instructor_id);
create index if not exists class_sections_invite_code_idx on public.class_sections (invite_code);

alter table public.class_sections enable row level security;

drop policy if exists "Sections are viewable by instructor or members" on public.class_sections;
create policy "Sections are viewable by instructor or members"
  on public.class_sections for select to authenticated
  using (
    auth.uid() = instructor_id
    or exists (
      select 1
      from public.section_enrollments enrollments
      where enrollments.section_id = class_sections.id
        and enrollments.student_id = auth.uid()
    )
  );

drop policy if exists "Instructors can create sections" on public.class_sections;
create policy "Instructors can create sections"
  on public.class_sections for insert to authenticated
  with check (auth.uid() = instructor_id);

drop policy if exists "Instructors can update own sections" on public.class_sections;
create policy "Instructors can update own sections"
  on public.class_sections for update to authenticated
  using (auth.uid() = instructor_id)
  with check (auth.uid() = instructor_id);

drop policy if exists "Instructors can delete own sections" on public.class_sections;
create policy "Instructors can delete own sections"
  on public.class_sections for delete to authenticated using (auth.uid() = instructor_id);

-- ============================================================================
-- 4. SECTION_ENROLLMENTS (Roster membership)
-- ============================================================================
create table if not exists public.section_enrollments (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.class_sections (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  invite_code text not null,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint section_enrollments_unique_membership unique (section_id, student_id)
);

create index if not exists section_enrollments_section_id_idx on public.section_enrollments (section_id);
create index if not exists section_enrollments_student_id_idx on public.section_enrollments (student_id);

alter table public.section_enrollments enable row level security;

drop policy if exists "Enrollments are visible to instructors and enrolled students" on public.section_enrollments;
create policy "Enrollments are visible to instructors and enrolled students"
  on public.section_enrollments for select to authenticated
  using (
    student_id = auth.uid()
    or exists (
      select 1
      from public.class_sections sections
      where sections.id = section_enrollments.section_id
        and sections.instructor_id = auth.uid()
    )
  );

drop policy if exists "Students can join a section with a matching invite code" on public.section_enrollments;
create policy "Students can join a section with a matching invite code"
  on public.section_enrollments for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1
      from public.class_sections sections
      where sections.id = section_enrollments.section_id
        and sections.invite_code = section_enrollments.invite_code
    )
  );

drop policy if exists "Students can leave their own section membership" on public.section_enrollments;
create policy "Students can leave their own section membership"
  on public.section_enrollments for delete to authenticated using (student_id = auth.uid());

-- ============================================================================
-- 5. CONCEPT_NODES (Concept Nodes / Methodology Graph)
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

drop trigger if exists set_class_sections_updated_at on public.class_sections;
create trigger set_class_sections_updated_at before update on public.class_sections
  for each row execute function public.set_updated_at();

drop trigger if exists set_section_enrollments_updated_at on public.section_enrollments;
create trigger set_section_enrollments_updated_at before update on public.section_enrollments
  for each row execute function public.set_updated_at();

drop trigger if exists set_concept_nodes_updated_at on public.concept_nodes;
create trigger set_concept_nodes_updated_at before update on public.concept_nodes
  for each row execute function public.set_updated_at();

-- ============================================================================
-- AUTOMATION: Sync Supabase Auth Users to Public Profiles
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  raw_role text;
  final_role public.user_role;
begin
  raw_role := lower(new.raw_user_meta_data->>'role');
  
  if raw_role in ('student', 'faculty', 'researcher') then
    final_role := raw_role::public.user_role;
  else
    final_role := 'student'::public.user_role;
  end if;

  insert into public.profiles (id, qu_email, full_name, role, academic_domain)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    final_role,
    coalesce(new.raw_user_meta_data->>'academic_domain', 'Computer Engineering')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 4. STORAGE BUCKET POLICIES
-- ============================================================================
drop policy if exists "Allow QU users to upload and overwrite" on storage.objects;
create policy "Allow QU users to upload and overwrite" 
  on storage.objects for all 
  to authenticated
  using (bucket_id = 'documents')
  with check (bucket_id = 'documents');

drop policy if exists "Allow authorized users to view files" on storage.objects;
create policy "Allow authorized users to view files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (
      auth.uid() = owner or 
      exists (
        select 1 from public.profiles 
        where profiles.id = auth.uid() and (profiles.role = 'faculty' or profiles.role = 'researcher')
      )
    )
  );