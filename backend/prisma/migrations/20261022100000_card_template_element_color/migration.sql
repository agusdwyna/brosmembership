-- Optional text color per card element. NULL keeps the previous behaviour:
-- the card renderer picks a readable color from the background artwork.
ALTER TABLE "card_template_elements" ADD COLUMN "color" TEXT;
