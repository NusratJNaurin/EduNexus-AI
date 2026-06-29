-- ============================================================================
-- EduNexus AI — Qatar University Email Enforcement
-- Migration 003: Server-enforced domain check via trigger + RLS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TRIGGER FUNCTION: Reject INSERT/UPDATE on profiles if the JWT email
--    does not belong to a verified Qatar University domain.
--    This runs BEFORE the row is written, so it catches both:
--      - The initial profile created by handle_new_user()
--      - Any subsequent update that might try to bypass the domain check
-- ----------------------------------------------------------------------------
create or replace function public.enforce_qu_email_domain()
returns trigger
language plpgsql
security definer
as $$
declare
  jwt_email text;
begin
  -- Extract the email from the authenticated user's JWT claims.
  -- auth.jwt() returns the current user's JWT payload as a jsonb object.
  jwt_email := lower(trim(auth.jwt() ->> 'email'));

  -- Reject if the email is missing or does not match a QU domain.
  if jwt_email is null then
    raise exception 'EduNexus AI: Authentication token missing email claim.';
  end if;

  if not (jwt_email like '%@qu.edu.qa' or jwt_email like '%@student.qu.edu.qa') then
    raise exception 'EduNexus AI is restricted to verified Qatar University members. Your email domain "%" is not authorized.', split_part(jwt_email, '@', 2);
  end if;

  -- Also enforce that the qu_email column matches the JWT email (defence in depth).
  -- This prevents a malicious actor from inserting a row with a different email.
  if new.qu_email is not null and lower(trim(new.qu_email)) != jwt_email then
    raise exception 'EduNexus AI: Profile email must match your authenticated email.';
  end if;

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. Apply the trigger to the profiles table
-- ----------------------------------------------------------------------------
drop trigger if exists enforce_qu_email_domain_on_profiles on public.profiles;
create trigger enforce_qu_email_domain_on_profiles
  before insert or update on public.profiles
  for each row
  execute function public.enforce_qu_email_domain();

-- ----------------------------------------------------------------------------
-- 3. RLS POLICY: Restrict SELECT on profiles to only QU-domain users
--    (Defence in depth — even if a non-QU user somehow gets authenticated,
--     they cannot read any profile data.)
-- ----------------------------------------------------------------------------
drop policy if exists "Profiles are viewable by authenticated QU users" on public.profiles;
create policy "Profiles are viewable by authenticated QU users" on public.profiles
  for select
  to authenticated
  using (
    lower(trim(auth.jwt() ->> 'email')) like '%@qu.edu.qa'
    or lower(trim(auth.jwt() ->> 'email')) like '%@student.qu.edu.qa'
  );

-- ----------------------------------------------------------------------------
-- 4. RLS POLICY: Restrict INSERT on profiles to QU-domain users
-- ----------------------------------------------------------------------------
drop policy if exists "System can create profiles during signup" on public.profiles;
create policy "System can create profiles during signup" on public.profiles
  for insert
  to authenticated
  with check (
    lower(trim(auth.jwt() ->> 'email')) like '%@qu.edu.qa'
    or lower(trim(auth.jwt() ->> 'email')) like '%@student.qu.edu.qa'
  );

-- ----------------------------------------------------------------------------
-- 5. RLS POLICY: Restrict UPDATE on profiles to QU-domain users
-- ----------------------------------------------------------------------------
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
  for update
  to authenticated
  using (
    auth.uid() = id
    and (
      lower(trim(auth.jwt() ->> 'email')) like '%@qu.edu.qa'
      or lower(trim(auth.jwt() ->> 'email')) like '%@student.qu.edu.qa'
    )
  )
  with check (
    auth.uid() = id
    and (
      lower(trim(auth.jwt() ->> 'email')) like '%@qu.edu.qa'
      or lower(trim(auth.jwt() ->> 'email')) like '%@student.qu.edu.qa'
    )
  );