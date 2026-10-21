-- NIK is no longer stored in plaintext. `nikHash` (HMAC, key in the app env)
-- carries uniqueness and lookup; `nikLast4` is the only part shown to users.
--
-- The old `nik` column is intentionally left in place here: it is data, not
-- structure, and hashing it needs NIK_HASH_KEY which only the application has.
-- `prisma/backfill-nik-hash.ts` copies each value into the new columns and then
-- drops `nik` and its unique index. It runs from the container entrypoint once.

ALTER TABLE "members"
  ADD COLUMN "nikHash" TEXT,
  ADD COLUMN "nikLast4" TEXT;

CREATE UNIQUE INDEX "members_nikHash_key" ON "members"("nikHash");
