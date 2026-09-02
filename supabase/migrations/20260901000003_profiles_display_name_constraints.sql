-- profiles.display_name already exists and is the name shown everywhere in
-- the app (see mapFlatMemberRow) -- no new column needed for editable
-- display names. This just adds the same lightweight CHECK-constraint
-- validation already used elsewhere (e.g. expenses.title) as a server-side
-- backstop behind the client-side zod validation, since profiles_update_own
-- (existing RLS) lets a user set this column to anything.
alter table public.profiles
  add constraint profiles_display_name_not_blank check (char_length(btrim(display_name)) > 0),
  add constraint profiles_display_name_length check (char_length(display_name) <= 80);
