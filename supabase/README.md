# Supabase setup

Linked to a real Supabase project with all migrations applied and verified
(see "Verification" below) -- but no UI is wired to this yet (see
`src/lib/mock` and `src/components/providers/app-data-provider.tsx`, which
still power the app).

## Getting started

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) if you
   don't have it (`brew install supabase/tap/supabase`).
2. `supabase login`, then `supabase link --project-ref <your-project-ref>` (or
   run everything against `supabase start` locally -- no link needed).
3. Copy `.env.local.example` to `.env.local` and fill in your project's URL
   and publishable key from Project Settings -> API.
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
  10. `scope_policies_to_authenticated` -- explicitly scopes every policy from
      9 to the `authenticated` role (defense in depth; grants already blocked
      `anon` either way -- see "Verification")
  11. `security_advisor_fixes` -- `search_path` hardening on two functions
      that were missed in 8, and revokes the ambient EXECUTE grant on
      `handle_new_user` (only the auth trigger should ever call it)
  12. `performance_advisor_fixes` -- wraps `auth.uid()` in `(select ...)` on
      the two `profiles` policies that called it directly, and merges two
      permissive SELECT policies on `profiles` into one
- `seed.sql` -- local-dev-only sample data (flat "4B, Prestige Meridian" with
  members Piyush/Rahul/Aman/Kunal). Inserts fake rows into `auth.users`
  directly, which only works against a local `supabase start` instance, never
  a production project.

Never edit an already-applied migration file after the fact -- add a new one
instead (that's why 10-12 exist as follow-ups to 9 rather than edits to it).

## Security model

Every table has RLS enabled, scoped to the `authenticated` role. The rule
everywhere is: a user can only read or write data belonging to a flat where
`auth.uid()` is (or was) a member -- never a client-supplied id. Financial
mutations additionally require being a currently *active* member. Settlements
are select/insert only, with no update or delete grant at all, anywhere --
they're immutable once recorded.

`flats` and `flat_members` have no direct INSERT policy; rows are created only
through the `create_flat()` and `join_flat_with_invite_code()` RPCs, so an
invite code is actually enforced server-side rather than being just a UI
convention. Likewise, `flat_members` UPDATE is owner-only (not "owner or self")
specifically so a member leaving voluntarily can't smuggle a role change into
the same statement -- they go through `leave_flat()` instead, which can only
ever deactivate the caller's own row.

## Verification

Run against the real linked project (see Phase 4 report for full detail):
`supabase db advisors --linked --type security` and `--type performance` both
come back clean except for 7 expected "authenticated can call this RPC"
notices on `create_flat`/`join_flat_with_invite_code`/`leave_flat`/the four
`is_*`/`shares_flat_with` helpers -- all intentional, since those either are
meant to be called directly by signed-in users or are called from RLS policies
that run as the querying user. RLS isolation, the invite-code join flow, the
role-escalation block, and the profile trigger were all tested end to end with
two temporary throwaway users and cleaned up afterward -- nothing from that
session was left in the database.

## Regenerating TypeScript types

`src/lib/supabase/database.types.ts` is generated from the live linked
schema, not hand-written. Regenerate it after any schema change:

```bash
supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```
