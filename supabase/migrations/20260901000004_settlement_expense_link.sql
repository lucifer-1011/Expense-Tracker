-- Links a settlement/settlement_request to the specific expense it settles,
-- so "Who owes what" can show and act on individual expenses instead of one
-- netted-out amount per person. Nullable + ON DELETE SET NULL throughout:
-- existing rows (and any future "general" settle-up not tied to one expense)
-- have no expense to point at, and a notification/history row must survive
-- its expense being deleted, same reasoning already used for
-- related_expense_id on notifications.

alter table public.settlement_requests
  add column expense_id uuid references public.expenses (id) on delete set null;

alter table public.settlements
  add column expense_id uuid references public.expenses (id) on delete set null;

-- A settlement tied to a specific expense must belong to the same flat as
-- that expense -- cheap to enforce here so it's never just trusted from the
-- client, on both the RPC path and settlements' direct-insert path
-- (recordSettlement bypasses every RPC).
create or replace function public.validate_settlement_expense_flat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense_flat_id uuid;
begin
  if new.expense_id is null then
    return new;
  end if;

  select flat_id into v_expense_flat_id from public.expenses where id = new.expense_id;

  if v_expense_flat_id is null or v_expense_flat_id <> new.flat_id then
    raise exception 'expense_id does not belong to this flat';
  end if;

  return new;
end;
$$;

create trigger validate_settlement_requests_expense_flat
  before insert on public.settlement_requests
  for each row
  execute function public.validate_settlement_expense_flat();

create trigger validate_settlements_expense_flat
  before insert on public.settlements
  for each row
  execute function public.validate_settlement_expense_flat();

-- Previously one pending request per (payer, receiver) total. Now scoped per
-- expense too (nulls coalesced to a sentinel so "general" requests keep the
-- original one-at-a-time behavior among themselves) -- otherwise "Settle up"
-- on a second expense with the same person while the first is still pending
-- would fail outright.
drop index public.settlement_requests_unique_pending_pair;
create unique index settlement_requests_unique_pending_pair
  on public.settlement_requests (
    payer_member_id,
    receiver_member_id,
    coalesce(expense_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- RPCs: add an optional p_expense_id, validated against both parties, and
-- propagate it through to the resulting settlement on approval. Notification
-- logic is unchanged from 20260823000002_notifications.sql.
-- ---------------------------------------------------------------------------

-- Changing the argument list means CREATE OR REPLACE would not match the old
-- (uuid, bigint, text, text) overload -- it would sit alongside it as a
-- second, un-validated 4-arg entry point. Drop it explicitly so there's only
-- ever one create_settlement_request.
drop function if exists public.create_settlement_request(uuid, bigint, text, text);

create or replace function public.create_settlement_request(
  receiver_member_id uuid,
  amount_paise bigint,
  method text default 'other',
  note text default null,
  p_expense_id uuid default null
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

  -- Both parties must actually be involved in the expense (as its payer, or
  -- as a split participant) -- otherwise a client could tag an unrelated
  -- expense onto a settlement between two people who have nothing to do
  -- with it. The flat match itself is enforced by the trigger above.
  if p_expense_id is not null then
    if not exists (
      select 1 from public.expenses e
      where e.id = p_expense_id
        and (
          e.paid_by in (v_payer_member_id, receiver_member_id)
          or exists (
            select 1 from public.expense_splits es
            where es.expense_id = e.id and es.member_id in (v_payer_member_id, receiver_member_id)
          )
        )
    ) then
      raise exception 'This expense does not involve both parties';
    end if;
  end if;

  insert into public.settlement_requests (
    flat_id, payer_member_id, receiver_member_id, amount_paise, method, note, created_by, expense_id
  )
  values (
    v_flat_id, v_payer_member_id, receiver_member_id, amount_paise, coalesce(method, 'other'), note, auth.uid(), p_expense_id
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
    raise exception 'You already have a pending settlement request with this member for this expense';
end;
$$;

comment on function public.create_settlement_request(uuid, bigint, text, text, uuid) is
  'Payer-initiated: creates a pending settlement request (optionally tied to one expense) and a settlement_request notification for the receiver. Never touches settlements or balances -- only approve_settlement_request() does that.';

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

  insert into public.settlements (flat_id, from_member_id, to_member_id, amount_paise, method, notes, created_by, expense_id)
  values (v_request.flat_id, v_request.payer_member_id, v_request.receiver_member_id, v_request.amount_paise, v_request.method, v_request.note, auth.uid(), v_request.expense_id)
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
  'Receiver-only. Atomically finalizes the settlement (carrying over expense_id, if any), marks the request approved, and notifies the payer. The FOR UPDATE lock + pending-status check make this idempotent against double-clicks, retries, and concurrent approval attempts.';

revoke all on function public.create_settlement_request(uuid, bigint, text, text, uuid) from public;
grant execute on function public.create_settlement_request(uuid, bigint, text, text, uuid) to authenticated;
