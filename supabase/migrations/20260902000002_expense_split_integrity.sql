-- Security hardening, part 2 of 2: the split-sum invariant.
--
-- *** DO NOT APPLY THIS AHEAD OF THE FRONTEND DEPLOY. ***
--
-- This migration is NOT backward-compatible with the currently-deployed
-- frontend. That build edits an expense with three separate PostgREST
-- requests (update the expense, delete every split, insert the new splits),
-- which are three separate transactions -- so after request 1 the stored
-- amount and the stored splits legitimately disagree, and the invariant
-- below would reject it. Applying this alone breaks expense editing in
-- production.
--
-- Ship it together with the ExpensesProvider.updateExpense change that routes
-- editing through update_expense_with_splits() defined here.

-- ---------------------------------------------------------------------------
-- HIGH: splits were never required to add up to the expense amount
-- ---------------------------------------------------------------------------
-- validateCustomSplit() in src/lib/calculations/expense-split.ts enforces
-- this in the browser only. Balances read expenses.amount_paise for "paid"
-- and expense_splits.share_amount_paise for "owed", so any gap between the
-- two is a fabricated debt that is invisible in the UI -- the expense card
-- keeps showing the original amount.
--
-- Enforced as a DEFERRED constraint trigger, evaluated once at COMMIT rather
-- than per row, because a correct multi-row split is only balanced after
-- every row has landed. A transient state with NO splits at all is
-- explicitly allowed, since the edit path clears the set before rewriting it.
create or replace function public.validate_expense_split_sum()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense_id uuid;
  v_amount bigint;
  v_sum bigint;
  v_count int;
begin
  v_expense_id := coalesce(new.expense_id, old.expense_id);

  select amount_paise into v_amount from public.expenses where id = v_expense_id;
  -- Parent expense was deleted in this same transaction (ON DELETE CASCADE)
  -- -- there is nothing left for the splits to be consistent with.
  if v_amount is null then
    return null;
  end if;

  select count(*), coalesce(sum(share_amount_paise), 0)
    into v_count, v_sum
  from public.expense_splits
  where expense_id = v_expense_id;

  if v_count = 0 then
    return null;
  end if;

  if v_sum <> v_amount then
    raise exception 'Expense splits must sum to the expense amount (expected %, got %)', v_amount, v_sum
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

revoke all on function public.validate_expense_split_sum() from public;

create constraint trigger validate_expense_split_sum_trigger
  after insert or update or delete on public.expense_splits
  deferrable initially deferred
  for each row
  execute function public.validate_expense_split_sum();

-- The trigger above only fires on expense_splits, so the same desync is
-- reachable from the other side by editing amount_paise alone. Guard it too.
create or replace function public.validate_expense_amount_matches_splits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sum bigint;
  v_count int;
begin
  if new.amount_paise = old.amount_paise then
    return null;
  end if;

  select count(*), coalesce(sum(share_amount_paise), 0)
    into v_count, v_sum
  from public.expense_splits
  where expense_id = new.id;

  if v_count = 0 then
    return null;
  end if;

  if v_sum <> new.amount_paise then
    raise exception 'Expense amount must match its splits (splits total %, got %)', v_sum, new.amount_paise
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

revoke all on function public.validate_expense_amount_matches_splits() from public;

create constraint trigger validate_expense_amount_matches_splits_trigger
  after update on public.expenses
  deferrable initially deferred
  for each row
  execute function public.validate_expense_amount_matches_splits();

-- ---------------------------------------------------------------------------
-- Atomic expense edit (also fixes a pre-existing data-integrity bug)
-- ---------------------------------------------------------------------------
-- Two reasons this has to become one transaction:
--
--   * Correctness, today, independent of this audit: if the final split
--     insert failed (offline, expired token, rejected value), the expense was
--     left with NO splits at all -- silently dropping out of everyone's
--     balance while still appearing on the dashboard.
--   * With the invariant above, no ordering of three separate transactions
--     can satisfy it while still allowing the payer to hand the expense to
--     someone else, because authorization is re-evaluated on every request
--     and the caller stops being the payer halfway through.
--
-- RLS is bypassed inside a SECURITY DEFINER function, so the checks here ARE
-- the authorization. paid_by is read from the STORED row before any write,
-- so a non-payer cannot seize an expense as part of the same edit.
create or replace function public.update_expense_with_splits(
  p_expense_id uuid,
  p_title text,
  p_description text,
  p_category text,
  p_amount_paise bigint,
  p_expense_date timestamptz,
  p_split_type text,
  p_paid_by uuid,
  p_splits jsonb
)
returns public.expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense public.expenses;
  v_flat_id uuid;
  v_sum bigint;
  v_split_count int;
begin
  if auth.uid() is null then
    raise exception 'Must be authenticated';
  end if;

  select * into v_expense from public.expenses where id = p_expense_id for update;
  if not found then
    raise exception 'Expense not found';
  end if;
  v_flat_id := v_expense.flat_id;

  -- Mirrors expenses_update_payer_only exactly, against the stored paid_by.
  if not public.is_expense_payer(p_expense_id) then
    raise exception 'Only the person who paid can edit this expense';
  end if;
  if not public.is_active_flat_member(v_flat_id) then
    raise exception 'You are not an active member of this flat';
  end if;

  -- Never trust a client-supplied flat_members id: the new payer and every
  -- split participant must belong to THIS expense's flat.
  if not exists (select 1 from public.flat_members where id = p_paid_by and flat_id = v_flat_id) then
    raise exception 'Payer is not a member of this flat';
  end if;

  select count(*), coalesce(sum((s->>'share_amount_paise')::bigint), 0)
    into v_split_count, v_sum
  from jsonb_array_elements(p_splits) s;

  if v_split_count = 0 then
    raise exception 'An expense must have at least one split';
  end if;
  if v_sum <> p_amount_paise then
    raise exception 'Expense splits must sum to the expense amount (expected %, got %)', p_amount_paise, v_sum;
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_splits) s
    where not exists (
      select 1 from public.flat_members fm
      where fm.id = (s->>'member_id')::uuid and fm.flat_id = v_flat_id
    )
  ) then
    raise exception 'Every split participant must be a member of this flat';
  end if;

  delete from public.expense_splits where expense_id = p_expense_id;

  update public.expenses
  set title = p_title,
      description = p_description,
      category = p_category,
      amount_paise = p_amount_paise,
      expense_date = p_expense_date,
      split_type = p_split_type,
      paid_by = p_paid_by
  where id = p_expense_id
  returning * into v_expense;

  insert into public.expense_splits (expense_id, member_id, share_amount_paise)
  select p_expense_id, (s->>'member_id')::uuid, (s->>'share_amount_paise')::bigint
  from jsonb_array_elements(p_splits) s;

  return v_expense;
end;
$$;

comment on function public.update_expense_with_splits is
  'Atomically replaces an expense and its entire split set in one transaction. Payer-only, checked against the currently-stored paid_by so ownership cannot be seized as part of the edit. Validates that splits sum to the amount and that every referenced member belongs to the expense''s flat.';

revoke all on function public.update_expense_with_splits(uuid, text, text, text, bigint, timestamptz, text, uuid, jsonb) from public;
grant execute on function public.update_expense_with_splits(uuid, text, text, text, bigint, timestamptz, text, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Atomic expense creation (closes the last zero-split window)
-- ---------------------------------------------------------------------------
-- Creation had the same shape as editing: insert the expense, then insert its
-- splits, as two separate transactions. Its rollback was a compensating
-- DELETE -- but that DELETE is payer-only, so when a member records an
-- expense ON SOMEONE ELSE'S BEHALF and the split insert fails, the rollback
-- silently fails too and leaves a split-less expense behind. A zero-split
-- expense still counts toward its payer's totalPaid while nobody owes a
-- share, so it quietly inflates that payer's "you are owed" balance.
--
-- Idempotency is handled here as well rather than by catching a unique
-- violation client-side: if this dedupe key has already been used, the
-- existing expense is returned untouched. That keeps double-submits,
-- retries and resubmits-after-refresh resolving to one expense, while two
-- legitimately identical expenses (different keys) stay separate.
create or replace function public.create_expense_with_splits(
  p_flat_id uuid,
  p_title text,
  p_description text,
  p_category text,
  p_amount_paise bigint,
  p_expense_date timestamptz,
  p_split_type text,
  p_paid_by uuid,
  p_splits jsonb,
  p_dedupe_key uuid default null
)
returns public.expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense public.expenses;
  v_sum bigint;
  v_split_count int;
begin
  if auth.uid() is null then
    raise exception 'Must be authenticated';
  end if;

  -- Same idempotency contract the unique index gives, but resolved server
  -- side so a retry never depends on the client catching 23505.
  if p_dedupe_key is not null then
    select * into v_expense from public.expenses where client_dedupe_key = p_dedupe_key;
    if found then
      return v_expense;
    end if;
  end if;

  if not public.is_active_flat_member(p_flat_id) then
    raise exception 'You are not an active member of this flat';
  end if;

  if not exists (select 1 from public.flat_members where id = p_paid_by and flat_id = p_flat_id) then
    raise exception 'Payer is not a member of this flat';
  end if;

  select count(*), coalesce(sum((s->>'share_amount_paise')::bigint), 0)
    into v_split_count, v_sum
  from jsonb_array_elements(p_splits) s;

  if v_split_count = 0 then
    raise exception 'An expense must have at least one split';
  end if;
  if v_sum <> p_amount_paise then
    raise exception 'Expense splits must sum to the expense amount (expected %, got %)', p_amount_paise, v_sum;
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_splits) s
    where not exists (
      select 1 from public.flat_members fm
      where fm.id = (s->>'member_id')::uuid and fm.flat_id = p_flat_id
    )
  ) then
    raise exception 'Every split participant must be a member of this flat';
  end if;

  insert into public.expenses (
    flat_id, title, description, category, amount_paise,
    expense_date, split_type, paid_by, created_by, client_dedupe_key
  )
  values (
    p_flat_id, p_title, p_description, p_category, p_amount_paise,
    p_expense_date, p_split_type, p_paid_by, auth.uid(), p_dedupe_key
  )
  returning * into v_expense;

  insert into public.expense_splits (expense_id, member_id, share_amount_paise)
  select v_expense.id, (s->>'member_id')::uuid, (s->>'share_amount_paise')::bigint
  from jsonb_array_elements(p_splits) s;

  return v_expense;
exception
  -- Two concurrent submissions with the same key can both pass the lookup
  -- above; the unique index still arbitrates, and the loser resolves to the
  -- winner's row instead of surfacing an error.
  when unique_violation then
    select * into v_expense from public.expenses where client_dedupe_key = p_dedupe_key;
    if found then
      return v_expense;
    end if;
    raise;
end;
$$;

comment on function public.create_expense_with_splits is
  'Atomically creates an expense and its splits in one transaction, with server-side idempotency on client_dedupe_key. created_by is taken from auth.uid(), never from the caller. Validates that splits sum to the amount and that the payer and every participant belong to the flat.';

revoke all on function public.create_expense_with_splits(uuid, text, text, text, bigint, timestamptz, text, uuid, jsonb, uuid) from public;
grant execute on function public.create_expense_with_splits(uuid, text, text, text, bigint, timestamptz, text, uuid, jsonb, uuid) to authenticated;
