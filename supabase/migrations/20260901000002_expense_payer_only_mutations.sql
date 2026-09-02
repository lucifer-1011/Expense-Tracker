-- Restricts editing/deleting an expense (and its splits) to the flat_member
-- actually stored in paid_by, not just any active flat member. Who created
-- the expense (created_by) stays irrelevant to this permission -- creating
-- an expense on someone else's behalf must remain unrestricted (existing
-- flow, unchanged), but only the payer may ever change or remove it after.

create or replace function public.is_expense_payer(target_expense_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.expenses e
    join public.flat_members fm on fm.id = e.paid_by
    where e.id = target_expense_id
      and fm.user_id = auth.uid()
  );
$$;

comment on function public.is_expense_payer(uuid) is
  'True if the current user is the flat_member stored in paid_by on the given expense -- i.e. actually owns it for edit/delete purposes, regardless of who created the row.';

revoke all on function public.is_expense_payer(uuid) from public;
grant execute on function public.is_expense_payer(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------
drop policy "expenses_update_active_members" on public.expenses;
drop policy "expenses_delete_active_members" on public.expenses;

create policy "expenses_update_payer_only"
  on public.expenses for update
  to authenticated
  using (public.is_active_flat_member(flat_id) and public.is_expense_payer(id))
  -- Deliberately omits is_expense_payer() here: USING already restricts who
  -- can touch the row at all to its current payer, so this only re-checks
  -- flat membership on the new row. If paid_by itself is reassigned as part
  -- of the same edit (an existing, still-allowed feature), that's the
  -- current payer handing the expense off -- not a non-owner taking it,
  -- since a non-owner's update never matches a row under USING in the first
  -- place.
  with check (public.is_active_flat_member(flat_id));

create policy "expenses_delete_payer_only"
  on public.expenses for delete
  to authenticated
  using (public.is_active_flat_member(flat_id) and public.is_expense_payer(id));

-- ---------------------------------------------------------------------------
-- expense_splits
-- ---------------------------------------------------------------------------
-- insert stays member-scoped (expenses_insert_active_members's sibling): the
-- existing "create an expense on someone else's behalf" flow has the
-- creator, not the payer, insert the initial split rows in the same request
-- an expense row they don't own is created in. Restricting insert to the
-- payer would break that flow. Update/delete of an *existing* split -- which
-- only ever happens via the edit flow's clear-and-reinsert, or a direct
-- request bypassing it -- get the same payer-only gate as the expense itself.
drop policy "expense_splits_update_active_members" on public.expense_splits;
drop policy "expense_splits_delete_active_members" on public.expense_splits;

create policy "expense_splits_update_payer_only"
  on public.expense_splits for update
  to authenticated
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and public.is_active_flat_member(e.flat_id)
    )
    and public.is_expense_payer(expense_id)
  )
  with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and public.is_active_flat_member(e.flat_id)
    )
    and public.is_expense_payer(expense_id)
  );

create policy "expense_splits_delete_payer_only"
  on public.expense_splits for delete
  to authenticated
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and public.is_active_flat_member(e.flat_id)
    )
    and public.is_expense_payer(expense_id)
  );
