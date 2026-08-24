-- Settlement requests: a two-step approval workflow layered in front of the
-- existing `settlements` table. The debtor (payer) creates a pending request;
-- it has no effect on balances (calculateMemberBalances only ever reads
-- `settlements`, never this table). Only once the creditor (receiver) approves
-- does a real row get inserted into `settlements` -- via approve_settlement_request()
-- below, which does that insert and the request's status flip in one atomic
-- SECURITY DEFINER transaction. `settlements` itself is untouched: still
-- append-only, still the single source of truth for finalized money movement.
create table public.settlement_requests (
  id uuid primary key default gen_random_uuid(),
  flat_id uuid not null references public.flats (id) on delete restrict,
  payer_member_id uuid not null references public.flat_members (id) on delete restrict,
  receiver_member_id uuid not null references public.flat_members (id) on delete restrict,
  amount_paise bigint not null check (amount_paise > 0),
  method text not null default 'other' check (method in ('cash', 'upi', 'bank_transfer', 'other')),
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  -- Set only once approved -- points at the settlement row that was created for
  -- this request, so "was this already finalized" never has to be inferred.
  settlement_id uuid references public.settlements (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  constraint settlement_requests_distinct_parties check (payer_member_id <> receiver_member_id)
);

comment on table public.settlement_requests is
  'Pending/approved/rejected settlement requests. A separate table from settlements on purpose: settlements is an immutable ledger of money that has actually moved, and a request must never count toward a balance until the receiver approves it.';

-- A payer can only ever have one open ask to a given receiver at a time --
-- keeps "Settle up" from spawning duplicate pending requests for the same
-- relationship. Once resolved (approved/rejected), a fresh request is fine.
create unique index settlement_requests_unique_pending_pair
  on public.settlement_requests (payer_member_id, receiver_member_id)
  where status = 'pending';

create index settlement_requests_flat_id_idx on public.settlement_requests (flat_id);
create index settlement_requests_payer_member_idx on public.settlement_requests (payer_member_id);
create index settlement_requests_receiver_member_idx on public.settlement_requests (receiver_member_id);
create index settlement_requests_receiver_pending_idx
  on public.settlement_requests (receiver_member_id)
  where status = 'pending';

alter table public.settlement_requests enable row level security;

-- No UPDATE/DELETE grant at all: every status transition goes through
-- approve_settlement_request()/reject_settlement_request() below (SECURITY
-- DEFINER, bypasses RLS internally), the same pattern already used for
-- flat_members writes (create_flat/join_flat_with_invite_code/leave_flat).
-- This is what makes "the debtor can't approve their own request" and
-- "approval can't be double-applied" guaranteed at the database layer rather
-- than only in application code.
grant select on public.settlement_requests to authenticated;

create policy "settlement_requests_select_involved_parties"
  on public.settlement_requests for select
  to authenticated
  using (
    exists (
      select 1 from public.flat_members fm
      where fm.user_id = (select auth.uid())
        and fm.id in (payer_member_id, receiver_member_id)
    )
  );

-- ---------------------------------------------------------------------------
-- RPCs
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
  v_request public.settlement_requests;
begin
  if auth.uid() is null then
    raise exception 'Must be authenticated to create a settlement request';
  end if;

  if amount_paise <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  -- Derive the flat from the receiver (never trust a client-supplied flat_id),
  -- then confirm the caller is themselves an active member of that same flat.
  select flat_id into v_flat_id
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

  return v_request;
exception
  when unique_violation then
    raise exception 'You already have a pending settlement request with this member';
end;
$$;

comment on function public.create_settlement_request(uuid, bigint, text, text) is
  'Payer-initiated: creates a pending settlement request. Never touches settlements or balances -- only approve_settlement_request() does that.';

create or replace function public.approve_settlement_request(request_id uuid)
returns public.settlements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.settlement_requests;
  v_receiver_user_id uuid;
  v_settlement public.settlements;
begin
  if auth.uid() is null then
    raise exception 'Must be authenticated';
  end if;

  -- Row lock: a second concurrent call (double-click, retry, second tab) blocks
  -- here until the first transaction commits, then sees status <> 'pending' and
  -- raises below -- never a second settlement for the same request.
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

  return v_settlement;
end;
$$;

comment on function public.approve_settlement_request(uuid) is
  'Receiver-only. Atomically finalizes the settlement (insert into settlements) and marks the request approved. The FOR UPDATE lock + pending-status check make this idempotent against double-clicks, retries, and concurrent approval attempts.';

create or replace function public.reject_settlement_request(request_id uuid)
returns public.settlement_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.settlement_requests;
  v_receiver_user_id uuid;
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

  return v_request;
end;
$$;

comment on function public.reject_settlement_request(uuid) is
  'Receiver-only. Leaves settlements/balances untouched -- the debt stays exactly as it was, and the payer is free to submit a new request afterward (the unique pending-pair index only blocks a second *pending* request).';

revoke all on function public.create_settlement_request(uuid, bigint, text, text) from public;
revoke all on function public.approve_settlement_request(uuid) from public;
revoke all on function public.reject_settlement_request(uuid) from public;
grant execute on function public.create_settlement_request(uuid, bigint, text, text) to authenticated;
grant execute on function public.approve_settlement_request(uuid) to authenticated;
grant execute on function public.reject_settlement_request(uuid) to authenticated;
