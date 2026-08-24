-- Read-only diagnostic: report current row counts so we can confirm exactly
-- what (if anything) is still blocking auth.users deletion, without using
-- the service-role key or a data dump. RAISE NOTICE surfaces the counts in
-- the `supabase db push` output; nothing here mutates any data.
do $$
declare
  v_profiles int;
  v_flats int;
  v_flat_members int;
  v_expenses int;
  v_expense_splits int;
  v_settlements int;
  v_settlement_requests int;
  v_notifications int;
  v_auth_users int;
begin
  select count(*) into v_profiles from public.profiles;
  select count(*) into v_flats from public.flats;
  select count(*) into v_flat_members from public.flat_members;
  select count(*) into v_expenses from public.expenses;
  select count(*) into v_expense_splits from public.expense_splits;
  select count(*) into v_settlements from public.settlements;
  select count(*) into v_settlement_requests from public.settlement_requests;
  select count(*) into v_notifications from public.notifications;
  select count(*) into v_auth_users from auth.users;

  raise notice 'DIAGNOSTIC_COUNTS profiles=% flats=% flat_members=% expenses=% expense_splits=% settlements=% settlement_requests=% notifications=% auth_users=%',
    v_profiles, v_flats, v_flat_members, v_expenses, v_expense_splits, v_settlements, v_settlement_requests, v_notifications, v_auth_users;
end $$;
