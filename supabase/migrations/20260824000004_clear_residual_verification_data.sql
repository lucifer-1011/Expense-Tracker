-- The previous cleanup (20260824000001) correctly emptied every application
-- table, but a post-cleanup verification signup (done to confirm a fresh
-- account works correctly) left behind exactly one flat/flat_member/expense/
-- expense_split. That single flat_members row -- referencing a profile via
-- an ON DELETE RESTRICT foreign key -- is what's now blocking the bulk
-- "delete all Auth users" operation from the Dashboard ("Database error
-- deleting user"). Clearing it the same safe way as before: same table list,
-- same CASCADE, no schema change.
truncate table
  public.notifications,
  public.expense_splits,
  public.settlement_requests,
  public.settlements,
  public.expenses,
  public.flat_members,
  public.flats
cascade;
