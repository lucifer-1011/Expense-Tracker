-- One-time production cutover: every row in these tables is test/demo data
-- from development, and there are no real users yet. This clears all
-- application data (never touches schema, RLS policies, functions, or
-- triggers) so the app starts fresh. auth.users / public.profiles are
-- deliberately left for the operator to clear via the Dashboard (or the
-- Auth Admin API), since a correct user deletion needs to go through
-- GoTrue itself to also clean up sessions/identities/refresh tokens --
-- not something a plain SQL DELETE on auth.users would do safely.
--
-- CASCADE here follows the full FK graph (flats -> flat_members ->
-- expenses/settlements/settlement_requests -> expense_splits, plus
-- notifications) regardless of each individual FK's own ON DELETE rule,
-- so listing every table explicitly is what actually matters; CASCADE is
-- just insurance against missing one.
truncate table
  public.notifications,
  public.expense_splits,
  public.settlement_requests,
  public.settlements,
  public.expenses,
  public.flat_members,
  public.flats
cascade;
