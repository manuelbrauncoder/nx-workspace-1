-- Projects get a draft state: a project with `published: false` is only shown to admins. Every
-- project of the stored `projects` section that has no `published` yet was public until now and
-- stays so: it gets `published: true`. Projects that already have the key are left alone, so the
-- migration can run again without changes.
UPDATE "portfolio_sections"
SET "content" = jsonb_set(
  "content",
  '{items}',
  (
    SELECT coalesce(
      jsonb_agg(
        CASE
          WHEN item ? 'published' THEN item
          ELSE item || '{"published": true}'::jsonb
        END
        ORDER BY position
      ),
      '[]'::jsonb
    )
    FROM jsonb_array_elements("content" -> 'items') WITH ORDINALITY AS items(item, position)
  )
),
"updated_at" = now()
WHERE "key" = 'projects'
  AND jsonb_typeof("content" -> 'items') = 'array'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements("content" -> 'items') AS existing(item)
    WHERE NOT existing.item ? 'published'
  );
