-- Extensions relied on by later migrations:
--   pgcrypto -> gen_random_uuid() for primary keys, gen_random_bytes()/crypt() for
--              invite codes and (in seed.sql only) fake local-dev passwords.
create extension if not exists pgcrypto;
