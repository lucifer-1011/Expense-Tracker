-- Concurrency-safe idempotent expense creation.
--
-- Without this, two near-simultaneous inserts describing "the same logical
-- expense" (a retried request, a double-submitted form, a resubmit after the
-- page refreshed mid-request) each pass application-level checks
-- independently and both succeed -- a classic check-then-insert race, since
-- there is no gap-free way to prevent it purely in application code.
--
-- client_dedupe_key is a UUID the client generates once per "logical" new
-- expense (see src/components/expenses/add-expense-flow.tsx), sent with
-- every submit attempt of that same logical expense. The unique constraint
-- makes Postgres itself the single point of truth: whichever insert reaches
-- the database first wins, and any other insert carrying the same key is
-- rejected atomically, with no window for both to succeed. NULL is used for
-- all existing rows and isn't required going forward, so this is backward
-- compatible; Postgres treats NULLs as distinct from each other under a
-- unique constraint, so any number of legacy rows can coexist.
alter table public.expenses
  add column client_dedupe_key uuid;

alter table public.expenses
  add constraint expenses_client_dedupe_key_key unique (client_dedupe_key);

comment on column public.expenses.client_dedupe_key is
  'Client-generated UUID identifying one logical "add expense" submission attempt (not one HTTP request) -- lets a retried/duplicated insert resolve to the original row via the unique constraint instead of creating a second one. NULL for edits and for rows created before this column existed.';
