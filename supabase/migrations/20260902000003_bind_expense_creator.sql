-- Binds expenses.created_by to the authenticated user at INSERT time.
--
-- The split-insert policy added in 20260902000001 permits "payer OR creator"
-- so that recording an expense on someone else's behalf keeps working. That
-- makes created_by load-bearing for authorization -- and until now it was
-- simply whatever the client sent, which is exactly the "never trust a
-- user id supplied by the frontend" case.
--
-- Spoofing it to a DIFFERENT user was never an escalation (it only ever cost
-- the caller their own ability to write the splits), but leaving an
-- authorization input client-controlled is not a property worth keeping.
-- Pinning it here means "creator" is now as trustworthy as auth.uid() itself.
--
-- Backward-compatible: ExpensesProvider.addExpense already sends
-- `created_by: user.id`, which is the only INSERT path into this table.
drop policy "expenses_insert_active_members" on public.expenses;

create policy "expenses_insert_active_members"
  on public.expenses for insert
  to authenticated
  with check (
    public.is_active_flat_member(flat_id)
    and created_by = auth.uid()
  );
