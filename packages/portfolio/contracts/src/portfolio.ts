import { z } from 'zod';
import { PROJECT_DESCRIPTION_MAX, PROJECT_IMAGES_MAX } from './portfolio-limits';

export { PROJECT_DESCRIPTION_MAX, PROJECT_IMAGES_MAX } from './portfolio-limits';

/** The sections of the start page, in page order. Each one is a singleton. */
export const sectionKeys = [
  'hero',
  'about',
  'projects',
  'skills',
  'contact',
  'settings',
  'seo',
] as const;
export type SectionKey = (typeof sectionKeys)[number];

export const languages = ['de', 'en'] as const;
export type Language = (typeof languages)[number];

/** How a localized value appears: `{ de, en }`, or a single language after `?lang=`. */
type Localize = (schema: z.ZodType) => z.ZodType;
const both: Localize = (schema) => z.object({ de: schema, en: schema });
const single: Localize = (schema) => schema;

const text = (max: number) => z.string().trim().min(1).max(max);
const short = text(200);
const long = text(2000);
// HTML following `@contracts/rich-text` (profile `text`), sanitized by the API before it is stored
const richText = text(PROJECT_DESCRIPTION_MAX);
const link = z.httpUrl().max(500);
const list = (item: z.ZodType, max = 50) => z.array(item).max(max);

/**
 * The sections, built once per shape so writes, responses and docs cannot drift apart.
 * Arrays keep their order: the order in the array is the order on the page.
 */
function buildSections(l: Localize, image: z.ZodType) {
  const project = z.object({
    title: short,
    description: l(richText),
    stack: list(text(50)),
    // without one the code is not public
    githubUrl: link.optional(),
    // without one there is no live demo
    testUrl: link.optional(),
    // in page order, the first one is the cover image
    images: z.array(image).min(1).max(PROJECT_IMAGES_MAX),
    // false: a draft, only returned to admins. Missing means published, so a client that does
    // not know drafts yet keeps every project public.
    published: z.boolean().default(true),
  });
  const skill = z.object({ name: l(short), points: l(list(text(500), 20)) });
  const skillSet = z.object({ title: l(short), skills: list(skill) });

  return {
    hero: z.object({
      name: short,
      description: l(long),
      // decorative label of the topo map
      mapPlace: l(short).optional(),
      mapCoordinates: short.optional(),
    }),
    about: z.object({ headline: l(short), description: l(long), facts: l(list(long, 20)), image }),
    projects: z.object({ headline: l(short), description: l(long), items: list(project) }),
    skills: z.object({ headline: l(short), description: l(long), sets: list(skillSet, 20) }),
    contact: z.object({ headline: l(short), description: l(long) }),
    // the site owner; the legal pages and the contact section take their details from here
    settings: z.object({
      name: short,
      email: z.email(),
      phone: short.optional(),
      address: list(short, 10).optional(),
      profiles: z.object({ github: link, linkedin: link }),
    }),
    // title and meta description of the start page
    seo: z.object({ title: l(short), description: l(text(300)), ogImage: image.optional() }),
  } satisfies Record<SectionKey, z.ZodObject>;
}

/** An image in a request: an uploaded media id plus the alt text, required for accessibility. */
const imageRefSchema = z.object({ id: z.uuid(), alt: both(short) });

/** An image in a response, with what `NgOptimizedImage` needs. */
const imageSchema = (l: Localize) =>
  z.object({
    id: z.uuid(),
    url: z.url(),
    width: z.number().int(),
    height: z.number().int(),
    alt: l(z.string()),
  });

/** Request bodies of `POST /portfolio/<section>`. */
export const sectionInputSchemas = buildSections(both, imageRefSchema);

/** PATCH: any subset of the fields, at least one. `null` removes an optional field. */
function updateSchemaOf(schema: z.ZodObject) {
  const shape = Object.fromEntries(
    Object.entries(schema.shape as Record<string, z.ZodType>).map(([key, field]) => [
      key,
      field instanceof z.ZodOptional
        ? (field.unwrap() as z.ZodType).nullable().optional()
        : field.optional(),
    ]),
  );
  return z
    .object(shape)
    .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' });
}

/** Request bodies of `PATCH /portfolio/<section>`. */
export const sectionUpdateSchemas = Object.fromEntries(
  sectionKeys.map((key) => [key, updateSchemaOf(sectionInputSchemas[key])]),
) as Record<SectionKey, ReturnType<typeof updateSchemaOf>>;

/** A section as returned to the editor: both languages, images resolved. */
export const sectionSchemas = buildSections(both, imageSchema(both));

/** A section after `?lang=`: every localized value reduced to that language. */
export const localizedSectionSchemas = buildSections(single, imageSchema(single));

/** The whole page; a section is null until it has been created. */
const pageOf = (sections: Record<SectionKey, z.ZodObject>) =>
  z.object(Object.fromEntries(sectionKeys.map((key) => [key, sections[key].nullable()])));

export const pageSchema = pageOf(sectionSchemas);
export const localizedPageSchema = pageOf(localizedSectionSchemas);

export const pageQuerySchema = z.object({ lang: z.enum(languages).optional() });

export type SectionContent = Record<string, unknown>;
