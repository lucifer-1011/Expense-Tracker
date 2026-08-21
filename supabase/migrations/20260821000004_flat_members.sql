-- Flat membership: one row per (flat, user) pair, ever. A person who leaves is
-- never deleted -- is_active flips to false and left_at is stamped -- because old
-- expenses and splits must keep pointing at a historically valid member row.
create table public.flat_members (
  id uuid primary key default gen_random_uuid(),
  flat_id uuid not null references public.flats (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  role text not null default 'member' check (role in ('owner', 'member')),
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  constraint flat_members_unique_membership unique (flat_id, user_id),
  constraint flat_members_left_at_requires_inactive check (left_at is null or not is_active)
);

comment on table public.flat_members is
  'Membership of a profile inside a flat. Never hard-deleted: leaving sets is_active=false and left_at, preserving historical expense/settlement references.';

create index flat_members_flat_id_idx on public.flat_members (flat_id);
create index flat_members_user_id_idx on public.flat_members (user_id);
create index flat_members_active_idx on public.flat_members (flat_id) where is_active;

alter table public.flat_members enable row level security;
-- Policies are added in the RLS migration. Rows are created only through the
-- create_flat() and join_flat_with_invite_code() RPCs -- there is deliberately no
-- direct INSERT policy on this table (a bare self-insert policy would let anyone
-- join any flat just by guessing its UUID, bypassing the invite code entirely).
