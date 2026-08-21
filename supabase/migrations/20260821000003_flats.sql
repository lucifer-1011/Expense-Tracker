-- Flats: one row per shared home. Designed to support many flats, even though the
-- current UI only ever shows the signed-in user's one flat.
create or replace function public.generate_invite_code()
returns text
language plpgsql
volatile
as $$
declare
  -- Uppercase alphanumeric, excluding visually ambiguous characters (0/O, 1/I).
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := '';
  i int;
begin
  for i in 1..8 loop
    code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return code;
end;
$$;

comment on function public.generate_invite_code() is
  'Generates an 8-character invite code. Collisions are astronomically unlikely at this scale; not retried on conflict.';

create table public.flats (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default public.generate_invite_code(),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.flats is 'One row per shared home. A flat has many flat_members.';

create trigger set_flats_updated_at
  before update on public.flats
  for each row
  execute function public.set_updated_at();

alter table public.flats enable row level security;
-- Policies are added in the RLS migration, once flat_members + helper functions exist.
-- Rows are created only through the create_flat() RPC (see helper-functions migration) --
-- there is deliberately no direct INSERT policy on this table.
