# Security & regression suites

Two runnable suites that exercise **authorization at the database layer**,
using only the public anon key — i.e. exactly what any logged-in user's
browser can do. They create throwaway `zztest-*` accounts and a throwaway
flat, then assert on real PostgREST/RLS behaviour.

There is no unit-test runner in this project; these are standalone Node
scripts so they can be pointed at any environment.

```bash
node scripts/security/exploit_test.mjs after      # authorization / IDOR suite
node scripts/security/regression_test.mjs         # normal app flows still work
```

`exploit_test.mjs` takes a phase argument:

- `after` (use this) — every attack must be **blocked**.
- `before` — the inverse, kept only to reproduce the pre-hardening state.

`regression_test.mjs` exercises the flows the policies must not break:
create/join flat, expense creation, recording an expense **on someone else's
behalf**, payer-only edit and delete, the settlement request → approve →
reject cycle, creditor "mark as paid", display-name edit, and expense
deduplication (including that two legitimately identical expenses stay
separate).

## Cleaning up

Both write the ids they created to `./.security-test-ids.json`. They do **not**
clean up after themselves, so that a failed run can be inspected. Remove the
throwaway rows afterwards — they are all scoped to `zztest-%@example.com`
accounts and to flats whose members are exclusively those accounts.

> Point `ENV_FILE` at the environment you want to test. Running these against
> production creates and then requires deleting real rows in `auth.users`;
> prefer a staging project where one exists.
