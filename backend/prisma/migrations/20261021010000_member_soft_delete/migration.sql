-- Soft delete in the application, and full cleanup on a hard delete in the DB.
--
-- 1. members.deletedAt — the app hides deleted members; rows and history stay.
-- 2. Everything that belongs to a member cascades from it, so deleting a row
--    straight in the database (DELETE FROM members WHERE id = …) also removes
--    that member's memberships, cards, visits and scan history in one go.
-- 3. Deleting a membership TYPE that is still in use remains blocked
--    (RESTRICT) — a type is shared master data, not owned by one member.

ALTER TABLE "members" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "members_deletedAt_idx" ON "members"("deletedAt");

ALTER TABLE "scan_history" DROP CONSTRAINT "scan_history_memberId_fkey";
ALTER TABLE "scan_history" ADD CONSTRAINT "scan_history_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "visits" DROP CONSTRAINT "visits_memberId_fkey";
ALTER TABLE "visits" ADD CONSTRAINT "visits_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_memberId_fkey";
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "memberships" DROP CONSTRAINT "memberships_memberId_fkey";
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "membership_cards" DROP CONSTRAINT "membership_cards_membershipId_fkey";
ALTER TABLE "membership_cards" ADD CONSTRAINT "membership_cards_membershipId_fkey"
  FOREIGN KEY ("membershipId") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
