-- Projects get several images and a rich-text description: every project of the stored
-- `projects` section turns its `image` into `images: [image]` and its plain-text description
-- into escaped HTML (blank lines start a new paragraph, single line breaks become `<br>`).
-- Projects already in the new format are left alone.
CREATE FUNCTION pg_temp.plain_to_html(plain text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT '<p>' || replace(
    regexp_replace(
      replace(replace(replace(replace(plain, E'\r\n', E'\n'), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
      E'\n{2,}', '</p><p>', 'g'
    ),
    E'\n', '<br>'
  ) || '</p>'
$$;
--> statement-breakpoint
UPDATE "portfolio_sections"
SET "content" = jsonb_set(
  "content",
  '{items}',
  (
    SELECT coalesce(
      jsonb_agg(
        CASE
          WHEN item ? 'image' THEN
            (item - 'image') || jsonb_build_object(
              'images', jsonb_build_array(item -> 'image'),
              'description', jsonb_build_object(
                'de', pg_temp.plain_to_html(item -> 'description' ->> 'de'),
                'en', pg_temp.plain_to_html(item -> 'description' ->> 'en')
              )
            )
          ELSE item
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
  AND jsonb_path_exists("content", '$.items[*] ? (exists(@.image))');
--> statement-breakpoint
DROP FUNCTION pg_temp.plain_to_html(text);
