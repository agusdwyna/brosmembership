-- Reconciles the migration history with schema.prisma.
--
-- Earlier migrations were never updated after the schema changed, so a fresh
-- `prisma migrate deploy` produced a database that was MISSING members.nik and
-- members.qrHash (breaking every member/scan query) and that carried retired
-- columns (membership_cards.secureToken NOT NULL / status / revokedAt and
-- scan_history.cardId) which broke card inserts.
--
-- Applying this migration on top of the existing history makes a fresh database
-- match schema.prisma exactly. Databases that were built with `db push` (already
-- in the target state) must be marked applied instead of executed:
--   npx prisma migrate resolve --applied 20261020150000_reconcile_member_columns

-- DropForeignKey
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_memberId_fkey";

-- DropForeignKey
ALTER TABLE "scan_history" DROP CONSTRAINT "scan_history_cardId_fkey";

-- DropIndex
DROP INDEX "membership_cards_secureToken_key";

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "nik" TEXT,
ADD COLUMN     "qrHash" TEXT;

-- AlterTable
ALTER TABLE "membership_cards" DROP COLUMN "revokedAt",
DROP COLUMN "secureToken",
DROP COLUMN "status";

-- AlterTable
ALTER TABLE "scan_history" DROP COLUMN "cardId";

-- CreateIndex
CREATE UNIQUE INDEX "members_nik_key" ON "members"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "members_qrHash_key" ON "members"("qrHash");

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
