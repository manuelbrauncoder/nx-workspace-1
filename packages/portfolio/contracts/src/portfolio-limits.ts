// Plain constants without Zod, so the frontend can import them without bundling Zod.

/** How many images a project may have, at least one. */
export const PROJECT_IMAGES_MAX = 10;

/** Length of a project description in characters, markup included, before and after sanitizing. */
export const PROJECT_DESCRIPTION_MAX = 10_000;

/** Length of the accent word that starts the role in the hero, e.g. "Frontend". */
export const HERO_ROLE_ACCENT_MAX = 40;

/** Length of the rest of the role in the hero, e.g. "Developer". */
export const HERO_ROLE_MAX = 60;
