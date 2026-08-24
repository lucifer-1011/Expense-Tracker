-- Defense in depth: every CREATE POLICY in 0009 omitted an explicit `to
-- authenticated` clause, so each one defaults to role `public` (any role,
-- including anon). This was never an actual access hole -- anon has no
-- SELECT/INSERT/UPDATE/DELETE grant on any of these tables (see the `grant`
-- statements in 0009), so an anon request is rejected at the privilege layer
-- before RLS is ever evaluated. Scoping policies to `authenticated` explicitly
-- removes that reliance on grants alone and makes the intent unambiguous.
alter policy "profiles_select_own" on public.profiles to authenticated;
alter policy "profiles_select_flatmates" on public.profiles to authenticated;
alter policy "profiles_update_own" on public.profiles to authenticated;

alter policy "flats_select_members" on public.flats to authenticated;
alter policy "flats_update_owner" on public.flats to authenticated;

alter policy "flat_members_select_same_flat" on public.flat_members to authenticated;
alter policy "flat_members_update_owner" on public.flat_members to authenticated;

alter policy "expenses_select_members" on public.expenses to authenticated;
alter policy "expenses_insert_active_members" on public.expenses to authenticated;
alter policy "expenses_update_active_members" on public.expenses to authenticated;
alter policy "expenses_delete_active_members" on public.expenses to authenticated;

alter policy "expense_splits_select_members" on public.expense_splits to authenticated;
alter policy "expense_splits_insert_active_members" on public.expense_splits to authenticated;
alter policy "expense_splits_update_active_members" on public.expense_splits to authenticated;
alter policy "expense_splits_delete_active_members" on public.expense_splits to authenticated;

alter policy "settlements_select_members" on public.settlements to authenticated;
alter policy "settlements_insert_active_members" on public.settlements to authenticated;
