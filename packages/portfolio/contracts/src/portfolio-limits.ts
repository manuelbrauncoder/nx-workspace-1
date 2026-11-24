// Plain constants without Zod, so the frontend can import them without bundling Zod.

/** How many images a project may have, at least one. */
export const PROJECT_IMAGES_MAX = 10;

/** Length of a project description in characters, markup included, before and after sanitizing. */
export const PROJECT_DESCRIPTION_MAX = 10_000;

/** Length of the accent word that starts the role in the hero, e.g. "Frontend". */
export const HERO_ROLE_ACCENT_MAX = 40;

/** Length of the rest of the role in the hero, e.g. "Developer". */
export const HERO_ROLE_MAX = 60;

/** How many tags a project may have, e.g. "Work project" or the name of a company. */
export const PROJECT_TAGS_MAX = 5;

/** Length of the text of one project tag. */
export const PROJECT_TAG_MAX = 40;

/** The colours a project tag can have. Fixed names, each app maps them to its own tokens. */
export const PROJECT_TAG_COLORS = ['neutral', 'amber', 'blue', 'green', 'rose', 'violet'] as const;
export type ProjectTagColor = (typeof PROJECT_TAG_COLORS)[number];
