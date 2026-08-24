-- Notifications: a small, focused feed of real events a user needs to react
-- to or be aware of. Deliberately structured, not a pre-rendered text blob --
-- amount_paise and context_text are stored so the client can render the exact
-- same currency formatting (formatPaise) used everywhere else in the app,
-- and actor/related-entity names are looked up live against already-loaded
-- flat data rather than snapshotted, matching how the rest of the app always
-- shows current member names. related_expense_id / related_settlement_request_id
-- are nullable with ON DELETE SET NULL so a notification survives as history
-- even if what it pointed to is later deleted -- the UI is expected to show a
-- graceful "no longer available" state rather than break.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.profiles (id) on delete cascade,
  flat_id uuid not null references public.flats (id) on delete cascade,
  type text not null check (type in ('settlement_request', 'settlement_approved', 'settlement_rejected', 'expense_added')),
  actor_user_id uuid references public.profiles (id) on delete set null,
  amount_paise bigint,
  -- Snapshot text that needs no currency formatting or live lookup (an
  -- expense title, currently) -- kept even if the related row is deleted.
  context_text text,
  related_expense_id uuid references public.expenses (id) on delete set null,
  related_settlement_request_id uuid references public.settlement_requests (id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

comment on table public.notifications is
  'Real events a user needs to see or act on (a settlement request addressed to them, being included in a new expense split, a settlement being resolved). Always created server-side (trigger or RPC) -- never trust the client to decide who should be notified.';

create index notifications_recipient_idx on public.notifications (recipient_user_id, created_at desc);
create index notifications_recipient_unread_idx on public.notifications (recipient_user_id) where not is_read;

alter table public.notifications enable row level security;

-- Column-scoped grant: authenticated users may only ever flip is_read/read_at
-- on their own rows (enforced again by the policy below) -- everything else
-- about a notification is server-written only, via the trigger/RPCs below.
grant select, update (is_read, read_at) on public.notifications to authenticated;

create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (recipient_user_id = (select auth.uid()));

create policy "notifications_update_own_read_state"
  on public.notifications for update
  to authenticated
  using (recipient_user_id = (select auth.uid()))
  with check (recipient_user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Expense-added notifications: one per genuinely-new split participant
-- ---------------------------------------------------------------------------

create or replace function public.notify_expense_split_participant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flat_id uuid;
  v_title text;
  v_created_at timestamptz;
  v_updated_at timestamptz;
  v_creator_user_id uuid;
  v_participant_user_id uuid;
begin
  select flat_id, title, created_at, updated_at, created_by
    into v_flat_id, v_title, v_created_at, v_updated_at, v_creator_user_id
  from public.expenses
  where id = new.expense_id;

  -- expense_splits rows are deleted and reinserted on every edit (see
  -- ExpensesProvider.updateExpense) -- created_at = updated_at is only true
  -- at the instant of the expense's original insert, so this fires once per
  -- genuinely new expense and never again on edits.
  if v_created_at is distinct from v_updated_at then
    return new;
  end if;

  -- Only participants with an actual positive share are financially involved.
  if new.share_amount_paise <= 0 then
    return new;
  end if;

  select user_id into v_participant_user_id from public.flat_members where id = new.member_id;

  -- No notification for a row that can't resolve to a user, and never notify
  -- the expense's own creator about their own action.
  if v_participant_user_id is null or v_participant_user_id = v_creator_user_id then
    return new;
  end if;

  insert into public.notifications (
    recipient_user_id, flat_id, type, actor_user_id, amount_paise, context_text, related_expense_id
  )
  values (
    v_participant_user_id, v_flat_id, 'expense_added', v_creator_user_id, new.share_amount_paise, v_title, new.expense_id
  );

  return new;
end;
$$;

comment on function public.notify_expense_split_participant() is
  'Fires once per newly-inserted expense_splits row. Only notifies genuinely new expenses (not edits), only participants with a positive share, and never the expense creator about their own expense.';

revoke all on function public.notify_expense_split_participant() from public;

create trigger notify_expense_split_participant_trigger
  after insert on public.expense_splits
  for each row
  execute function public.notify_expense_split_participant();

-- ---------------------------------------------------------------------------
-- Settlement-request notifications: extend the existing RPCs from
-- 20260823000001_settlement_requests.sql (same signatures, so CREATE OR
-- REPLACE preserves the EXECUTE grants already in place -- no re-grant needed).
-- ---------------------------------------------------------------------------

create or replace function public.create_settlement_request(
  receiver_member_id uuid,
  amount_paise bigint,
  method text default 'other',
  note text default null
)
returns public.settlement_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flat_id uuid;
  v_payer_member_id uuid;
  v_receiver_user_id uuid;
  v_request public.settlement_requests;
begin
  if auth.uid() is null then
    raise exception 'Must be authenticated to create a settlement request';
  end if;

  if amount_paise <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  select flat_id, user_id into v_flat_id, v_receiver_user_id
  from public.flat_members
  where id = receiver_member_id and is_active;

  if v_flat_id is null then
    raise exception 'Receiver is not an active member of any flat';
  end if;

  select id into v_payer_member_id
  from public.flat_members
  where user_id = auth.uid() and flat_id = v_flat_id and is_active;

  if v_payer_member_id is null then
    raise exception 'You are not an active member of this flat';
  end if;

  if v_payer_member_id = receiver_member_id then
    raise exception 'Cannot create a settlement request to yourself';
  end if;

  insert into public.settlement_requests (
    flat_id, payer_member_id, receiver_member_id, amount_paise, method, note, created_by
  )
  values (
    v_flat_id, v_payer_member_id, receiver_member_id, amount_paise, coalesce(method, 'other'), note, auth.uid()
  )
  returning * into v_request;

  insert into public.notifications (
    recipient_user_id, flat_id, type, actor_user_id, amount_paise, related_settlement_request_id
  )
  values (
    v_receiver_user_id, v_flat_id, 'settlement_request', auth.uid(), v_request.amount_paise, v_request.id
  );

  return v_request;
exception
  when unique_violation then
    raise exception 'You already have a pending settlement request with this member';
end;
$$;

comment on function public.create_settlement_request(uuid, bigint, text, text) is
  'Payer-initiated: creates a pending settlement request and a settlement_request notification for the receiver. Never touches settlements or balances -- only approve_settlement_request() does that.';

create or replace function public.approve_settlement_request(request_id uuid)
returns public.settlements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.settlement_requests;
  v_receiver_user_id uuid;
  v_payer_user_id uuid;
  v_settlement public.settlements;
begin
  if auth.uid() is null then
    raise exception 'Must be authenticated';
  end if;

  select * into v_request
  from public.settlement_requests
  where id = request_id
  for update;

  if not found then
    raise exception 'Settlement request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'This settlement request has already been resolved';
  end if;

  select user_id into v_receiver_user_id
  from public.flat_members
  where id = v_request.receiver_member_id;

  if v_receiver_user_id is null or v_receiver_user_id <> auth.uid() then
    raise exception 'Only the receiver of this settlement can approve it';
  end if;

  insert into public.settlements (flat_id, from_member_id, to_member_id, amount_paise, method, notes, created_by)
  values (v_request.flat_id, v_request.payer_member_id, v_request.receiver_member_id, v_request.amount_paise, v_request.method, v_request.note, auth.uid())
  returning * into v_settlement;

  update public.settlement_requests
  set status = 'approved', resolved_at = now(), resolved_by = auth.uid(), settlement_id = v_settlement.id
  where id = request_id;

  select user_id into v_payer_user_id from public.flat_members where id = v_request.payer_member_id;
  if v_payer_user_id is not null then
    insert into public.notifications (
      recipient_user_id, flat_id, type, actor_user_id, amount_paise, related_settlement_request_id
    )
    values (
      v_payer_user_id, v_request.flat_id, 'settlement_approved', auth.uid(), v_request.amount_paise, v_request.id
    );
  end if;

  return v_settlement;
end;
$$;

comment on function public.approve_settlement_request(uuid) is
  'Receiver-only. Atomically finalizes the settlement, marks the request approved, and notifies the payer. The FOR UPDATE lock + pending-status check make this idempotent against double-clicks, retries, and concurrent approval attempts.';

create or replace function public.reject_settlement_request(request_id uuid)
returns public.settlement_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.settlement_requests;
  v_receiver_user_id uuid;
  v_payer_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Must be authenticated';
  end if;

  select * into v_request
  from public.settlement_requests
  where id = request_id
  for update;

  if not found then
    raise exception 'Settlement request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'This settlement request has already been resolved';
  end if;

  select user_id into v_receiver_user_id
  from public.flat_members
  where id = v_request.receiver_member_id;

  if v_receiver_user_id is null or v_receiver_user_id <> auth.uid() then
    raise exception 'Only the receiver of this settlement can reject it';
  end if;

  update public.settlement_requests
  set status = 'rejected', resolved_at = now(), resolved_by = auth.uid()
  where id = request_id
  returning * into v_request;

  select user_id into v_payer_user_id from public.flat_members where id = v_request.payer_member_id;
  if v_payer_user_id is not null then
    insert into public.notifications (
      recipient_user_id, flat_id, type, actor_user_id, amount_paise, related_settlement_request_id
    )
    values (
      v_payer_user_id, v_request.flat_id, 'settlement_rejected', auth.uid(), v_request.amount_paise, v_request.id
    );
  end if;

  return v_request;
end;
$$;

comment on function public.reject_settlement_request(uuid) is
  'Receiver-only. Leaves settlements/balances untouched and notifies the payer -- the debt stays open and they are free to submit a new request afterward.';
