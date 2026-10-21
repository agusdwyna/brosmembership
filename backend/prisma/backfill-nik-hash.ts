import { PrismaClient } from '@prisma/client';
import { hashNik, last4Nik } from '../src/lib/nik';

/**
 * One-off data migration: copies every plaintext `members.nik` into
 * `nikHash`/`nikLast4`, then removes the plaintext column.
 *
 * Runs from `docker/docker-entrypoint.sh` after `prisma migrate deploy` and
 * before the API starts. It is safe to re-run: rows that already have a hash
 * are skipped, and if the column is gone it exits immediately.
 *
 * Kept as a script (not SQL) because hashing needs NIK_HASH_KEY, which only
 * the application environment has — putting the key into a committed migration
 * file would defeat the point of hashing.
 */

const prisma = new PrismaClient();

async function hasPlaintextNik(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'members' AND column_name = 'nik'
    ) AS exists
  `;
  return rows[0]?.exists === true;
}

async function main() {
  if (!(await hasPlaintextNik())) {
    console.log('↷ Backfill NIK dilewati — kolom "nik" sudah tidak ada.');
    return;
  }

  const members = await prisma.$queryRaw<
    { id: string; nik: string | null; nikHash: string | null }[]
  >`SELECT id, nik, "nikHash" FROM members`;

  const pending = members.filter((m) => m.nik && !m.nikHash);
  console.log(
    `▶ Backfill NIK: ${pending.length} member dari ${members.length} (sisanya kosong/sudah di-hash).`,
  );

  for (const member of pending) {
    await prisma.$executeRaw`
      UPDATE members
      SET "nikHash" = ${hashNik(member.nik!)},
          "nikLast4" = ${last4Nik(member.nik!)}
      WHERE id = ${member.id}
    `;
  }

  // Now that every row has its hash, drop the plaintext column and its index.
  await prisma.$executeRawUnsafe('DROP INDEX IF EXISTS "members_nik_key"');
  await prisma.$executeRawUnsafe('ALTER TABLE "members" DROP COLUMN IF EXISTS "nik"');

  console.log('✅ Backfill NIK selesai — kolom plaintext "nik" dihapus.');
}

main()
  .catch((e) => {
    // Do not mark the backfill as done on failure; the next start retries.
    console.error('❌ Backfill NIK gagal:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
