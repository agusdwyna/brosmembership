-- Card templates are now versioned. A card stores the template revision it was
-- issued with (`membership_cards.templateVersion`), and editing a layout bumps
-- the template's version instead of silently changing how old cards print.

ALTER TABLE "card_templates" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- Existing cards were all issued from the current layout, which is revision 1.
UPDATE "membership_cards" SET "templateVersion" = 1 WHERE "templateVersion" IS DISTINCT FROM 1;
