-- Fixes for issues surfaced by `supabase db advisors --type security` against the
-- real project. See supabase/README.md for the full list, including the several
-- "authenticated can execute this SECURITY DEFINER function" warnings that are
-- left as-is because they are intentional (create_flat, join_flat_with_invite_code,
-- leave_flat are meant to be called directly by authenticated users; the
-- is_*/shares_flat_with helpers must be executable by authenticated for the RLS
-- policies that call them to work at all).

-- 1. function_search_path_mutable: these two functions were missed when
-- `set search_path = public` was added to every other function in this project.
-- Neither actually resolves an object name that a hijacked search_path could
-- redirect (set_updated_at only touches NEW.updated_at; generate_invite_code only
-- calls built-ins that resolve from pg_catalog regardless), so this was not
-- exploitable in practice -- fixing it anyway removes any doubt.
alter function public.set_updated_at() set search_path = public;
alter function public.generate_invite_code() set search_path = public;

-- 2. anon/authenticated_security_definer_function_executable on handle_new_user:
-- unlike every other SECURITY DEFINER function here, this one is never meant to
-- be called directly by any client at all -- only by the on_auth_user_created
-- trigger, which invokes it regardless of EXECUTE grants. Revoking EXECUTE from
-- PUBLIC removes the (previously ungranted-on-purpose-but-never-revoked) ambient
-- default that let it be called via /rest/v1/rpc/handle_new_user.
revoke execute on function public.handle_new_user() from public;
