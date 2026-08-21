-- SECURITY DEFINER helper functions used by RLS policies (next migration).
--
-- Why SECURITY DEFINER: a policy on flat_members that queried flat_members again to
-- check membership would recurse. Routing that check through a function that runs
-- with the function owner's privileges (bypassing RLS internally) breaks the cycle.
-- Each function below only ever returns a boolean or a single new row it just
-- created -- never an arbitrary result set -- so it cannot be used to leak rows a
-- caller shouldn't see. `set search_path = public` on every one prevents search-path
-- hijacking, a well-known SECURITY DEFINER footgun.

create or replace function public.is_flat_member(target_flat_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.flat_members fm
    where fm.flat_id = target_flat_id
      and fm.user_id = auth.uid()
  );
$$;

comment on function public.is_flat_member(uuid) is
  'True if the current user has ever been a member (active or former) of the given flat.';

create or replace function public.is_active_flat_member(target_flat_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.flat_members fm
    where fm.flat_id = target_flat_id
      and fm.user_id = auth.uid()
      and fm.is_active
  );
$$;

comment on function public.is_active_flat_member(uuid) is
  'True if the current user is a currently-active member of the given flat.';

create or replace function public.is_flat_owner(target_flat_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.flat_members fm
    where fm.flat_id = target_flat_id
      and fm.user_id = auth.uid()
      and fm.is_active
      and fm.role = 'owner'
  );
$$;

comment on function public.is_flat_owner(uuid) is
  'True if the current user is a currently-active owner of the given flat.';

create or replace function public.shares_flat_with(target_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.flat_members my
    join public.flat_members their on their.flat_id = my.flat_id
    where my.user_id = auth.uid()
      and their.user_id = target_user_id
  );
$$;

comment on function public.shares_flat_with(uuid) is
  'True if the current user shares at least one flat (active or former membership on either side) with the given user. Used to let flatmates see each other''s profile.';

revoke all on function public.is_flat_member(uuid) from public;
revoke all on function public.is_active_flat_member(uuid) from public;
revoke all on function public.is_flat_owner(uuid) from public;
revoke all on function public.shares_flat_with(uuid) from public;
grant execute on function public.is_flat_member(uuid) to authenticated;
grant execute on function public.is_active_flat_member(uuid) to authenticated;
grant execute on function public.is_flat_owner(uuid) to authenticated;
grant execute on function public.shares_flat_with(uuid) to authenticated;

-- RPCs: the only way flats/flat_members rows are ever created. Routing flat
-- creation and invite-code joins through SECURITY DEFINER functions (instead of a
-- direct INSERT policy) means the invite code is actually enforced server-side --
-- a bare "insert your own membership row" policy would let anyone join any flat
-- just by knowing its UUID.

create or replace function public.create_flat(flat_name text)
returns public.flats
language plpgsql
security definer
set search_path = public
as $$
declare
  new_flat public.flats;
begin
  if auth.uid() is null then
    raise exception 'Must be authenticated to create a flat';
  end if;

  if btrim(flat_name) = '' then
    raise exception 'Flat name cannot be empty';
  end if;

  insert into public.flats (name, created_by)
  values (btrim(flat_name), auth.uid())
  returning * into new_flat;

  insert into public.flat_members (flat_id, user_id, role, is_active)
  values (new_flat.id, auth.uid(), 'owner', true);

  return new_flat;
end;
$$;

comment on function public.create_flat(text) is
  'Creates a flat and inserts the caller as its active owner, atomically.';

create or replace function public.join_flat_with_invite_code(code text)
returns public.flat_members
language plpgsql
security definer
set search_path = public
as $$
declare
  target_flat public.flats;
  membership public.flat_members;
begin
  if auth.uid() is null then
    raise exception 'Must be authenticated to join a flat';
  end if;

  select * into target_flat from public.flats where invite_code = upper(btrim(code));
  if not found then
    raise exception 'Invalid invite code';
  end if;

  insert into public.flat_members (flat_id, user_id, role, is_active)
  values (target_flat.id, auth.uid(), 'member', true)
  on conflict (flat_id, user_id)
    do update set is_active = true, left_at = null
  returning * into membership;

  return membership;
end;
$$;

comment on function public.join_flat_with_invite_code(text) is
  'Validates an invite code server-side and inserts (or reactivates) the caller''s membership in that flat.';

create or replace function public.leave_flat(target_flat_id uuid)
returns public.flat_members
language plpgsql
security definer
set search_path = public
as $$
declare
  membership public.flat_members;
begin
  if auth.uid() is null then
    raise exception 'Must be authenticated to leave a flat';
  end if;

  update public.flat_members
  set is_active = false, left_at = now()
  where flat_id = target_flat_id
    and user_id = auth.uid()
    and is_active
  returning * into membership;

  if not found then
    raise exception 'You are not an active member of this flat';
  end if;

  return membership;
end;
$$;

comment on function public.leave_flat(uuid) is
  'Lets the caller deactivate their own membership in a flat. Cannot touch role or any other member''s row -- this is the only way a non-owner can change their own flat_members row, since the UPDATE policy on that table is owner-only (see the RLS migration). A bare self-update policy would let a member sneak a role change into the same statement.';

revoke all on function public.create_flat(text) from public;
revoke all on function public.join_flat_with_invite_code(text) from public;
revoke all on function public.leave_flat(uuid) from public;
grant execute on function public.create_flat(text) to authenticated;
grant execute on function public.join_flat_with_invite_code(text) to authenticated;
grant execute on function public.leave_flat(uuid) to authenticated;
