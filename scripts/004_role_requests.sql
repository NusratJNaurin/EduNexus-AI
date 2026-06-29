-- ============================================================================
-- EduNexus AI — Faculty Role Request Table
-- Migration 004: Tracks faculty verification requests
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ROLE_REQUESTS TABLE
--    When a user selects "Faculty Member" during onboarding, a pending row
--    is inserted here. An admin can later approve/reject the request.
-- ----------------------------------------------------------------------------
create table if not exists public.role_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  requested_role  text not null default 'faculty',
  status          text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by     uuid references public.profiles (id) on delete set null,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint role_requests_unique_user unique (user_id)
);

-- Index for quick lookups
create index if not exists role_requests_user_id_idx on public.role_requests (user_id);
create index if not exists role_requests_status_idx on public.role_requests (status);

-- Enable RLS
alter table public.role_requests enable row level security;

-- RLS: Users can view their own request
drop policy if exists "Users can view their own role request" on public.role_requests;
create policy "Users can view their own role request" on public.role_requests
  for select to authenticated
  using (auth.uid() = user_id);

-- RLS: Users can insert their own request
drop policy if exists "Users can insert their own role request" on public.role_requests;
create policy "Users can insert their own role request" on public.role_requests
  for insert to authenticated
  with check (auth.uid() = user_id);

-- Updated_at trigger
drop trigger if exists set_role_requests_updated_at on public.role_requests;
create trigger set_role_requests_updated_at
  before update on public.role_requests
  for each row execute function public.set_updated_at();