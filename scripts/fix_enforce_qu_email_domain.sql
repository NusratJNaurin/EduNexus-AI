create or replace function public.enforce_qu_email_domain()
returns trigger
language plpgsql
security definer
as $$
begin
  -- 1. Basic safety check (always runs)
  if new.qu_email is null then
    raise exception 'Profile email cannot be null';
  end if;

  if not (
    new.qu_email like '%@qu.edu.qa' 
    or new.qu_email like '%@student.qu.edu.qa'
  ) then
    raise exception 'Invalid QU email domain: %', split_part(new.qu_email, '@', 2);
  end if;

  -- 2. Optional JWT consistency check (only when available)
  if auth.jwt() is not null then
    if lower(trim(new.qu_email)) != lower(trim(auth.jwt() ->> 'email')) then
      raise exception 'Profile email must match authenticated email';
    end if;
  end if;

  return new;
end;
$$;

-- -- ============================================================================
-- -- Fix: enforce_qu_email_domain() compatibility with trigger-based profile creation
-- -- ============================================================================
-- -- 
-- -- Problem:
-- --   handle_new_user() runs as an AFTER INSERT trigger on auth.users and inserts
-- --   into public.profiles. This triggers enforce_qu_email_domain() (BEFORE INSERT),
-- --   which calls auth.jwt() ->> 'email'. In trigger context during user creation,
-- --   no JWT token exists, causing:
-- --     "P0001: EduNexus AI: Authentication token missing email claim."
-- --   This rolls back the entire profile insert.
-- --
-- -- Solution:
-- --   Modified enforce_qu_email_domain() to handle two scenarios:
-- --   1. JWT available (normal client INSERTs/UPDATEs): Validate JWT email and
-- --      ensure it matches NEW.qu_email (defense in depth).
-- --   2. JWT NULL (trigger context from handle_new_user()): Validate NEW.qu_email
-- --      directly against QU domain patterns.
-- --   The profiles table's CHECK constraint (check_qu_email) provides additional
-- --   safety regardless of this function.
-- -- ============================================================================

-- create or replace function public.enforce_qu_email_domain()
--  returns trigger
--  language plpgsql
--  security definer
-- as $function$
-- declare
--   jwt_email text;
-- begin
--   -- Extract the email from the authenticated user's JWT claims.
--   -- auth.jwt() returns the current user's JWT payload as a jsonb object.
--   -- NOTE: In trigger context during automatic profile creation (handle_new_user()),
--   -- auth.jwt() will be NULL because no JWT token exists yet at that point.
--   jwt_email := nullif(trim(lower(auth.jwt() ->> 'email')), '');

--   -- ---------------------------------------------------------------
--   -- PATH A: JWT is available (normal client INSERT/UPDATE)
--   -- ---------------------------------------------------------------
--   if jwt_email is not null then
--     -- Reject if the email does not match a QU domain.
--     if not (jwt_email like '%@qu.edu.qa' or jwt_email like '%@student.qu.edu.qa') then
--       raise exception 'EduNexus AI is restricted to verified Qatar University members. Your email domain "%" is not authorized.', split_part(jwt_email, '@', 2);
--     end if;

--     -- Also enforce that the qu_email column matches the JWT email (defence in depth).
--     -- This prevents a malicious actor from inserting a row with a different email.
--     if lower(trim(new.qu_email)) != jwt_email then
--       raise exception 'EduNexus AI: Profile email must match your authenticated email.';
--     end if;
--   end if;

--   -- ---------------------------------------------------------------
--   -- PATH B: JWT is NULL (trigger context, e.g. handle_new_user())
--   -- ---------------------------------------------------------------
--   -- In this case, validate NEW.qu_email directly against QU domain patterns.
--   -- The profiles table also has a CHECK constraint (check_qu_email) that enforces
--   -- this at the table level as a secondary safety net.
--   if new.qu_email is null then
--     raise exception 'EduNexus AI: Profile email cannot be null.';
--   end if;

--   if not (new.qu_email like '%@qu.edu.qa' or new.qu_email like '%@student.qu.edu.qa') then
--     raise exception 'EduNexus AI is restricted to verified Qatar University members. Email domain "%" is not authorized.', split_part(new.qu_email, '@', 2);
--   end if;

--   return new;
-- end;
-- $function$;