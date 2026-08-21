# Supabase setup

Schema-only foundation for now -- no UI is wired to this yet (see `src/lib/mock`
and `src/components/providers/app-data-provider.tsx`, which still power the app).

## Getting started

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) if you don't
   have it.
2. `supabase login`, then `supabase link --project-ref <your-project-ref>` (or
   run everything against `supabase start` locally -- no link needed).
3. Copy `.env.local.example` to `.env.local` and fill in your project's URL and
   anon key from Project Settings -> API.
4. Apply the schema:
   - Local dev: `supabase start` then `supabase db reset` (also runs `seed.sql`).
   - Linked project: `supabase db push`.

## Layout

- `migrations/` -- applied in filename order. Each is self-contained and
  documents its own reasoning inline:
  1. `extensions` -- pgcrypto
  2. `profiles` -- one row per auth user, auto-created via trigger
  3. `flats` -- one row per shared home
  4. `flat_members` -- membership, never hard-deleted
  5. `expenses`
  6. `expense_splits` -- permanent per-expense participant snapshot
  7. `settlements` -- immutable, append-only
  8. `helper_functions` -- SECURITY DEFINER membership checks + the
     `create_flat` / `join_flat_with_invite_code` / `leave_flat` RPCs (the
     only way flats and flat_members rows are ever created or a member's own
     row deactivated)
  9. `rls_policies` -- grants + Row Level Security policies for every table
- `seed.sql` -- local-dev-only sample data (flat "4B, Prestige Meridian" with
  members Piyush/Rahul/Aman/Kunal). Inserts fake rows into `auth.users`
  directly, which only works against a local `supabase start` instance, never
  a production project.

## Security model

Every table has RLS enabled. The rule everywhere is: a user can only read or
write data belonging to a flat where `auth.uid()` is (or was) a member --
never a client-supplied id. Financial mutations additionally require being a
currently *active* member. Settlements are select/insert only, with no
update or delete grant at all, anywhere -- they're immutable once recorded.

`flats` and `flat_members` have no direct INSERT policy; rows are created only
through the `create_flat()` and `join_flat_with_invite_code()` RPCs, so an
invite code is actually enforced server-side rather than being just a UI
convention.

## Regenerating TypeScript types

`src/lib/supabase/database.types.ts` is hand-written to match the migrations
above. Once a real project is linked, it can be regenerated from the live
schema instead:

```bash
supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```
