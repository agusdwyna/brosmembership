/*
  Warnings:

  - You are about to drop the column `cardTemplateId` on the `card_template_elements` table. All the data in the column will be lost.
  - You are about to drop the column `backDesign` on the `card_templates` table. All the data in the column will be lost.
  - You are about to drop the column `frontDesign` on the `card_templates` table. All the data in the column will be lost.
  - Added the required column `cardTemplateSideId` to the `card_template_elements` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "card_template_elements" DROP CONSTRAINT "card_template_elements_cardTemplateId_fkey";

-- AlterTable
ALTER TABLE "card_template_elements" DROP COLUMN "cardTemplateId",
ADD COLUMN     "cardTemplateSideId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "card_templates" DROP COLUMN "backDesign",
DROP COLUMN "frontDesign";

-- CreateTable
CREATE TABLE "card_template_sides" (
    "id" TEXT NOT NULL,
    "cardTemplateId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "designUrl" TEXT,

    CONSTRAINT "card_template_sides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "card_template_sides_cardTemplateId_side_key" ON "card_template_sides"("cardTemplateId", "side");

-- AddForeignKey
ALTER TABLE "card_template_sides" ADD CONSTRAINT "card_template_sides_cardTemplateId_fkey" FOREIGN KEY ("cardTemplateId") REFERENCES "card_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_template_elements" ADD CONSTRAINT "card_template_elements_cardTemplateSideId_fkey" FOREIGN KEY ("cardTemplateSideId") REFERENCES "card_template_sides"("id") ON DELETE CASCADE ON UPDATE CASCADE;
