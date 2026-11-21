-- The redesigned start page shows the hero as the name and a role line, e.g. "*Frontend* Developer".
-- The hero gets the role (`roleAccent` and `role`, both languages) with the text the page showed so
-- far, and loses the introduction and the map label it no longer shows. Stored role texts win, so
-- the migration can run again without changes.
UPDATE "portfolio_sections"
SET "content" = '{"roleAccent": {"de": "Frontend", "en": "Frontend"}, "role": {"de": "Developer", "en": "Developer"}}'::jsonb
    || ("content" - 'description' - 'mapPlace' - 'mapCoordinates'),
  "updated_at" = now()
WHERE "key" = 'hero'
  AND (
    NOT "content" ? 'roleAccent'
    OR NOT "content" ? 'role'
    OR "content" ?| array['description', 'mapPlace', 'mapCoordinates']
  );
--> statement-breakpoint
-- Name, phone and address of the site owner are read by no page: the legal pages are stored HTML.
-- The settings keep the email and the profiles of the contact section.
UPDATE "portfolio_sections"
SET "content" = "content" - 'name' - 'phone' - 'address',
  "updated_at" = now()
WHERE "key" = 'settings'
  AND "content" ?| array['name', 'phone', 'address'];
