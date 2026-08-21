-- Settlements: an immutable record of money actually transferred between two flat
-- members. Balances are never stored -- they are always derived at read time from
-- expenses + expense_splits + settlements (see src/lib/calculations).
create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  flat_id uuid not null references public.flats (id) on delete restrict,
  from_member_id uuid not null references public.flat_members (id) on delete restrict,
  to_member_id uuid not null references public.flat_members (id) on delete restrict,
  amount_paise bigint not null check (amount_paise > 0),
  method text not null default 'other' check (method in ('cash', 'upi', 'bank_transfer', 'other')),
  notes text,
  settled_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint settlements_distinct_parties check (from_member_id <> to_member_id)
);

comment on table public.settlements is
  'An immutable financial event: money actually paid from one flat member to another. Never updated -- correcting a mistake means recording a new settlement.';

create index settlements_flat_id_idx on public.settlements (flat_id);
create index settlements_from_member_idx on public.settlements (from_member_id);
create index settlements_to_member_idx on public.settlements (to_member_id);

alter table public.settlements enable row level security;
-- Policies are added in the RLS migration. Deliberately no UPDATE/DELETE policy
-- anywhere in this project -- settlements are append-only once inserted.
