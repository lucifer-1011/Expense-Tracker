-- Row Level Security policies.
--
-- Core rule enforced throughout: a user can only access data belonging to flats
-- where they are (or were) a member, identified via auth.uid() -- never a
-- client-supplied id. Mutating financial data additionally requires being a
-- currently-*active* member. Table-level grants set the ceiling (what operations
-- exist at all); RLS policies then decide which rows within that ceiling.

grant usage on schema public to authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
grant select, update on public.profiles to authenticated;
-- No insert/delete grant: profiles are created only by the handle_new_user
-- trigger and removed only via auth.users cascade, never directly by a user.

create policy "profiles_select_flatmates"
  on public.profiles for select
  using (public.shares_flat_with(id));

-- ---------------------------------------------------------------------------
-- flats
-- ---------------------------------------------------------------------------
grant select, update on public.flats to authenticated;
-- No insert/delete grant: rows are created only via create_flat(); the app never
-- exposes flat deletion (see the disabled "Leave flat" action in Profile).

create policy "flats_select_members"
  on public.flats for select
  using (public.is_flat_member(id));

create policy "flats_update_owner"
  on public.flats for update
  using (public.is_flat_owner(id))
  with check (public.is_flat_owner(id));

-- ---------------------------------------------------------------------------
-- flat_members
-- ---------------------------------------------------------------------------
grant select, update on public.flat_members to authenticated;
-- No insert/delete grant: rows are created only via create_flat() /
-- join_flat_with_invite_code(), and are never hard-deleted (see is_active/left_at).

create policy "flat_members_select_same_flat"
  on public.flat_members for select
  using (public.is_flat_member(flat_id));

-- Owner-only, deliberately with no "or user_id = auth.uid()" self-update clause:
-- that would let a member update their own row for a legitimate reason (leaving)
-- while also sneaking in `role = 'owner'` in the same statement, since RLS checks
-- row visibility, not which columns changed. A member leaving voluntarily goes
-- through the leave_flat() RPC instead, which can only ever set
-- is_active=false/left_at=now() on the caller's own row.
create policy "flat_members_update_owner"
  on public.flat_members for update
  using (public.is_flat_owner(flat_id))
  with check (public.is_flat_owner(flat_id));

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.expenses to authenticated;

create policy "expenses_select_members"
  on public.expenses for select
  using (public.is_flat_member(flat_id));

create policy "expenses_insert_active_members"
  on public.expenses for insert
  with check (public.is_active_flat_member(flat_id));

create policy "expenses_update_active_members"
  on public.expenses for update
  using (public.is_active_flat_member(flat_id))
  with check (public.is_active_flat_member(flat_id));

create policy "expenses_delete_active_members"
  on public.expenses for delete
  using (public.is_active_flat_member(flat_id));

-- ---------------------------------------------------------------------------
-- expense_splits (no flat_id of its own -- check membership via the parent expense)
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.expense_splits to authenticated;

create policy "expense_splits_select_members"
  on public.expense_splits for select
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and public.is_flat_member(e.flat_id)
    )
  );

create policy "expense_splits_insert_active_members"
  on public.expense_splits for insert
  with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and public.is_active_flat_member(e.flat_id)
    )
  );

create policy "expense_splits_update_active_members"
  on public.expense_splits for update
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and public.is_active_flat_member(e.flat_id)
    )
  )
  with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and public.is_active_flat_member(e.flat_id)
    )
  );

create policy "expense_splits_delete_active_members"
  on public.expense_splits for delete
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and public.is_active_flat_member(e.flat_id)
    )
  );

-- ---------------------------------------------------------------------------
-- settlements -- append-only: select + insert grants only, ever.
-- ---------------------------------------------------------------------------
grant select, insert on public.settlements to authenticated;

create policy "settlements_select_members"
  on public.settlements for select
  using (public.is_flat_member(flat_id));

create policy "settlements_insert_active_members"
  on public.settlements for insert
  with check (public.is_active_flat_member(flat_id));
