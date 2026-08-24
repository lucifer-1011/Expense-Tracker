-- Local development seed data ONLY.
--
-- Run automatically by `supabase db reset` (Supabase CLI). Never run this against a
-- production project -- it inserts directly into auth.users, which is a
-- local-dev-only convenience (real users are always created through Supabase Auth
-- sign-up, never like this). The exact set of required auth.users columns can shift
-- between Supabase CLI/GoTrue versions; adjust this block if `supabase db reset`
-- reports a missing/failing column.
--
-- Two gotchas confirmed against a real project (Phase 5), both required for the
-- seeded accounts to actually be able to sign in with a password, not just exist:
--   1. The `*_token`/`*_change` text columns must be '' rather than NULL --
--      GoTrue's password grant scans them as non-nullable strings and fails
--      with a generic "Database error querying schema" if any are NULL.
--   2. A matching auth.identities row is required per user (a real sign-up
--      creates one alongside auth.users; inserting only into auth.users does not).
--
-- Login for all four seeded accounts: password "password123".

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change,
  email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'piyush@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Piyush Pagare"}', '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'rahul@example.com',  crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Rahul Mehta"}', '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'aman@example.com',   crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Aman Verma"}', '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'kunal@example.com',  crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Kunal Shah"}', '', '', '', '', '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', jsonb_build_object('sub', '11111111-1111-1111-1111-111111111111', 'email', 'piyush@example.com', 'email_verified', true), 'email', now(), now(), now()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', jsonb_build_object('sub', '22222222-2222-2222-2222-222222222222', 'email', 'rahul@example.com', 'email_verified', true), 'email', now(), now(), now()),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', jsonb_build_object('sub', '33333333-3333-3333-3333-333333333333', 'email', 'aman@example.com', 'email_verified', true), 'email', now(), now(), now()),
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', jsonb_build_object('sub', '44444444-4444-4444-4444-444444444444', 'email', 'kunal@example.com', 'email_verified', true), 'email', now(), now(), now())
on conflict (provider, provider_id) do nothing;

-- public.profiles rows are created automatically by the on_auth_user_created trigger.

-- The flat + memberships are inserted directly here (rather than via the
-- create_flat()/join_flat_with_invite_code() RPCs) because seed.sql runs as the
-- postgres role with no authenticated JWT, so auth.uid() would be null.
insert into public.flats (id, name, invite_code, created_by)
values ('99999999-9999-9999-9999-999999999999', '4B, Prestige Meridian', 'FLAT-DEV1', '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

insert into public.flat_members (id, flat_id, user_id, role, is_active) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'owner',  true),
  ('aaaaaaaa-0000-0000-0000-000000000002', '99999999-9999-9999-9999-999999999999', '22222222-2222-2222-2222-222222222222', 'member', true),
  ('aaaaaaaa-0000-0000-0000-000000000003', '99999999-9999-9999-9999-999999999999', '33333333-3333-3333-3333-333333333333', 'member', true),
  ('aaaaaaaa-0000-0000-0000-000000000004', '99999999-9999-9999-9999-999999999999', '44444444-4444-4444-4444-444444444444', 'member', true)
on conflict (flat_id, user_id) do nothing;

-- A couple of example expenses, enough to smoke-test balances/splits end to end.
insert into public.expenses (id, flat_id, title, category, amount_paise, expense_date, split_type, paid_by, created_by)
values (
  'bbbbbbbb-0000-0000-0000-000000000001', '99999999-9999-9999-9999-999999999999',
  'Big Bazaar Groceries', 'groceries', 240000, now(), 'equal',
  'aaaaaaaa-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222'
)
on conflict (id) do nothing;

insert into public.expense_splits (expense_id, member_id, share_amount_paise) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 60000),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 60000),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003', 60000),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000004', 60000)
on conflict (expense_id, member_id) do nothing;

insert into public.expenses (id, flat_id, title, category, amount_paise, expense_date, split_type, paid_by, created_by)
values (
  'bbbbbbbb-0000-0000-0000-000000000002', '99999999-9999-9999-9999-999999999999',
  'Electricity Bill', 'utilities', 320000, now() - interval '2 days', 'equal',
  'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111'
)
on conflict (id) do nothing;

insert into public.expense_splits (expense_id, member_id, share_amount_paise) values
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 80000),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 80000),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003', 80000),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000004', 80000)
on conflict (expense_id, member_id) do nothing;

-- One example settlement, so the history view has something to show.
insert into public.settlements (flat_id, from_member_id, to_member_id, amount_paise, method, notes, created_by)
select
  '99999999-9999-9999-9999-999999999999', 'aaaaaaaa-0000-0000-0000-000000000003',
  'aaaaaaaa-0000-0000-0000-000000000002', 30000, 'upi', 'Partial settle-up for groceries',
  '33333333-3333-3333-3333-333333333333'
where not exists (
  select 1 from public.settlements
  where notes = 'Partial settle-up for groceries'
);
