-- Expenses: one shared expense within a flat. Split data lives separately in
-- expense_splits (see next migration) as a permanent per-expense snapshot.
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  flat_id uuid not null references public.flats (id) on delete restrict,
  title text not null check (char_length(btrim(title)) > 0),
  description text,
  category text not null check (category in (
    'groceries', 'rent', 'utilities', 'internet', 'food',
    'transport', 'household', 'entertainment', 'other'
  )),
  -- Integer paise, never floating point. e.g. Rs 2,400.00 is stored as 240000.
  amount_paise bigint not null check (amount_paise > 0),
  expense_date timestamptz not null,
  split_type text not null default 'equal' check (split_type in ('equal', 'custom')),
  -- References the flat_members row that paid, not a bare user id -- so historical
  -- expenses stay correct even after that member becomes inactive.
  paid_by uuid not null references public.flat_members (id) on delete restrict,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.expenses is
  'A single shared expense in a flat. Money is stored as integer paise. paid_by points at a flat_members row, not a user id directly.';

create index expenses_flat_id_idx on public.expenses (flat_id);
create index expenses_paid_by_idx on public.expenses (paid_by);
create index expenses_flat_id_date_idx on public.expenses (flat_id, expense_date desc);

create trigger set_expenses_updated_at
  before update on public.expenses
  for each row
  execute function public.set_updated_at();

alter table public.expenses enable row level security;
-- Policies are added in the RLS migration.
