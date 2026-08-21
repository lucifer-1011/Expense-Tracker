-- Expense splits: the permanent snapshot of who participated in an expense and how
-- much they owed. This is never recalculated from current flat membership -- if a
-- member later leaves the flat, rows here stay exactly as they were.
create table public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  -- Deleting the expense itself is the one legitimate cascade here: a split has no
  -- meaning without its parent expense, and "delete expense" is a real app action.
  expense_id uuid not null references public.expenses (id) on delete cascade,
  -- Historical anchor -- never deleted while any split references it (on delete restrict
  -- on flat_members.id below, declared implicitly via the flat_members table itself).
  member_id uuid not null references public.flat_members (id) on delete restrict,
  share_amount_paise bigint not null check (share_amount_paise >= 0),
  created_at timestamptz not null default now(),
  -- A member cannot appear twice in the same expense's split.
  constraint expense_splits_unique_member unique (expense_id, member_id)
);

comment on table public.expense_splits is
  'Permanent per-expense snapshot of participants and their share, in integer paise. Never derived from current membership.';

create index expense_splits_expense_id_idx on public.expense_splits (expense_id);
create index expense_splits_member_id_idx on public.expense_splits (member_id);

alter table public.expense_splits enable row level security;
-- Policies are added in the RLS migration.
