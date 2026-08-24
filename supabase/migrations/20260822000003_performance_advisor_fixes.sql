-- Fixes for issues surfaced by `supabase db advisors --type performance`.
--
-- 1. auth_rls_initplan: `profiles_select_own` and `profiles_update_own` called
-- auth.uid() directly, which Postgres re-evaluates per row. Wrapping it as
-- `(select auth.uid())` lets the planner evaluate it once per query instead.
-- (Every other policy in this project already goes through a `stable`
-- SECURITY DEFINER helper function rather than calling auth.uid() directly in
-- the policy body, which is why only these two were flagged.)
--
-- 2. multiple_permissive_policies: profiles had two separate permissive SELECT
-- policies for `authenticated` (own row, flatmates' rows), so Postgres had to
-- evaluate and OR both on every query. Merged into one.

drop policy "profiles_select_own" on public.profiles;
drop policy "profiles_select_flatmates" on public.profiles;

create policy "profiles_select_own_or_flatmates"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or public.shares_flat_with(id));

drop policy "profiles_update_own" on public.profiles;

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
