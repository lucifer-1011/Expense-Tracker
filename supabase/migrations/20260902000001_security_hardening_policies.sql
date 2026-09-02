-- Security hardening, part 1 of 2: authorization + input bounds.
--
-- Everything in this file is backward-compatible with the currently-deployed
-- frontend, so it can ship ahead of a code deploy. The split-sum invariant
-- (which is NOT backward-compatible) lives in the companion migration
-- 20260902000002_expense_split_integrity.sql and must ship WITH the code.
--
-- Context: this app is browser -> PostgREST with no server action or API
-- route in front of any mutation, so every zod schema in src/lib/validations
-- is UX only and bypassable with a single curl. The database is the sole
-- enforcement point, and these policies were trusting the client to follow
-- the intended flow rather than enforcing it.

-- ---------------------------------------------------------------------------
-- Helper: does this flat_members row belong to the caller?
-- ---------------------------------------------------------------------------
create or replace function public.is_own_flat_member(target_member_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.flat_members fm
    where fm.id = target_member_id
      and fm.user_id = auth.uid()
  );
$$;

comment on function public.is_own_flat_member(uuid) is
  'True if the given flat_members row is the caller''s own membership. Binds a settlement''s receiver to the authenticated user.';

revoke all on function public.is_own_flat_member(uuid) from public;
grant execute on function public.is_own_flat_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- CRITICAL: settlements could be inserted by anyone, for anyone
-- ---------------------------------------------------------------------------
-- Was `is_active_flat_member(flat_id)` -- which checked only that the caller
-- belonged to the flat, never that they were a party to the settlement.
-- Verified exploitable against production with two throwaway accounts:
--
--   * A debtor inserted `from_member_id = self, to_member_id = creditor` and
--     erased their own debt outright -- no settlement_request, no approval.
--     This bypassed the whole create_settlement_request ->
--     approve_settlement_request flow, whose FOR UPDATE lock and
--     receiver-only check exist precisely to prevent that.
--   * A member forged a settlement between two OTHER members, rewriting a
--     balance they were not part of.
--
-- New rule matches the documented intent of recordSettlement: a settlement
-- may only be inserted directly by its RECEIVER, asserting money they
-- themselves received. Anyone wanting credit for money they PAID must go
-- through create_settlement_request and be approved. approve_settlement_request
-- is SECURITY DEFINER, so it still inserts on the receiver's behalf fine.
drop policy "settlements_insert_active_members" on public.settlements;

create policy "settlements_insert_receiver_only"
  on public.settlements for insert
  to authenticated
  with check (
    public.is_active_flat_member(flat_id)
    and public.is_own_flat_member(to_member_id)
  );

-- ---------------------------------------------------------------------------
-- HIGH: any flat member could inject splits into anyone's expense
-- ---------------------------------------------------------------------------
-- Was: any active member of the expense's flat could INSERT expense_splits
-- onto ANY expense in that flat. Verified exploitable: a non-payer attached a
-- Rs 99,999 share to a third member on someone else's Rs 1,000 expense,
-- leaving the expense card showing Rs 1,000 while the split rows -- which is
-- what balances are actually computed from -- totalled Rs 100,999.
--
-- The unique(expense_id, member_id) index only ever blocked re-adding a
-- member who already had a share; it did nothing about adding a new one.
--
-- INSERT deliberately stays broader than the payer-only UPDATE/DELETE
-- policies: the "record an expense on someone else's behalf" flow has the
-- CREATOR insert the initial split rows for an expense whose paid_by is
-- somebody else. payer-or-creator preserves that exactly.
drop policy "expense_splits_insert_active_members" on public.expense_splits;

create policy "expense_splits_insert_payer_or_creator"
  on public.expense_splits for insert
  to authenticated
  with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and public.is_active_flat_member(e.flat_id)
        and (public.is_expense_payer(e.id) or e.created_by = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- MEDIUM: an expense could be moved between flats on UPDATE
-- ---------------------------------------------------------------------------
-- expenses_update_payer_only's WITH CHECK is only `is_active_flat_member(
-- flat_id)`, so the payer of an expense who belongs to two flats could
-- reassign flat_id and drag the expense into the other one -- while its
-- split rows still referenced the original flat's members. The app never
-- changes flat_id, so pin it.
create or replace function public.prevent_expense_flat_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.flat_id <> old.flat_id then
    raise exception 'An expense cannot be moved between flats'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_expense_flat_change() from public;

create trigger prevent_expense_flat_change_trigger
  before update on public.expenses
  for each row
  execute function public.prevent_expense_flat_change();

-- ---------------------------------------------------------------------------
-- MEDIUM: unbounded user-controlled text and amounts
-- ---------------------------------------------------------------------------
-- The zod caps in src/lib/validations are client-side only; a 50KB expense
-- title was accepted by production during this audit. Limits match the
-- existing client-side schemas exactly, so nothing reachable through the UI
-- starts failing. Checked against live data first -- current maxima are
-- title 9, description 0, flat name 9, notes 0, amount 1000000 -- so every
-- existing row satisfies these.
alter table public.expenses
  add constraint expenses_title_length check (char_length(title) <= 80),
  add constraint expenses_description_length check (description is null or char_length(description) <= 280),
  -- Rs 10,00,00,000 in paise: far above any real shared-flat expense, far
  -- below anything that could overflow a bigint running total.
  add constraint expenses_amount_max check (amount_paise <= 1000000000000);

alter table public.flats
  add constraint flats_name_not_blank check (char_length(btrim(name)) > 0),
  add constraint flats_name_length check (char_length(name) <= 80);

alter table public.settlements
  add constraint settlements_notes_length check (notes is null or char_length(notes) <= 140),
  add constraint settlements_amount_max check (amount_paise <= 1000000000000);

alter table public.settlement_requests
  add constraint settlement_requests_note_length check (note is null or char_length(note) <= 140),
  add constraint settlement_requests_amount_max check (amount_paise <= 1000000000000);

-- ---------------------------------------------------------------------------
-- MEDIUM: TRUNCATE granted to anon/authenticated on every table
-- ---------------------------------------------------------------------------
-- Supabase's default `grant all on all tables` template hands out TRUNCATE,
-- which bypasses RLS entirely and cannot be constrained by any policy. It is
-- not reachable through PostgREST today, so this is defence in depth rather
-- than a live hole -- but it converts any future SQL-injection or
-- misconfigured SECURITY DEFINER function into total data loss, and nothing
-- in this application ever needs it.
revoke truncate on all tables in schema public from anon, authenticated;

-- Supporting indexes for the expense_id columns added in
-- 20260901000004_settlement_expense_link.sql -- currently only filtered
-- client-side, but both are foreign keys and will be joined on as the
-- settlement history grows.
create index if not exists settlements_expense_id_idx on public.settlements (expense_id);
create index if not exists settlement_requests_expense_id_idx on public.settlement_requests (expense_id);
