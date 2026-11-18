import { Localized } from '@core/i18n/localized';
import { PROJECT_DESCRIPTION_MAX, PROJECT_IMAGES_MAX } from '@portfolio/contracts/portfolio-limits';

/** An uploaded image as part of the content, with its alternative text in every language. */
export interface PortfolioImage {
  id: string;
  /** Public address on the backend, no cookie needed. */
  url: string;
  /** Size of the stored file in pixels. */
  width: number;
  height: number;
  alt: Localized<string>;
}

/** First screen of the start page. */
export interface Hero {
  name: string;
  description: Localized<string>;
  /** Label of the pin on the map, e.g. the home town. */
  mapPlace?: Localized<string>;
  /** Coordinates next to the pin, e.g. `50°03′ N  9°31′ E`. */
  mapCoordinates?: string;
}

export interface About {
  headline: Localized<string>;
  description: Localized<string>;
  facts: Localized<string[]>;
  image: PortfolioImage;
}

export interface Project {
  title: string;
  /** Rich-text HTML, shown with `app-ui-rich-text`. */
  description: Localized<string>;
  stack: string[];
  githubUrl?: string;
  /** Where visitors can try the project. */
  testUrl?: string;
  /** In the order they are shown, the first one is the cover. */
  images: PortfolioImage[];
}

export interface ProjectsSection {
  headline: Localized<string>;
  description: Localized<string>;
  /** In the order they are shown. */
  items: Project[];
}

export interface Skill {
  name: Localized<string>;
  points: Localized<string[]>;
}

export interface SkillSet {
  title: Localized<string>;
  skills: Skill[];
}

export interface SkillsSection {
  headline: Localized<string>;
  description: Localized<string>;
  sets: SkillSet[];
}

export interface ContactSection {
  headline: Localized<string>;
  description: Localized<string>;
}

/** Who runs the site and how to reach them. */
export interface Settings {
  name: string;
  email: string;
  phone?: string;
  /** Lines of the postal address. */
  address?: string[];
  profiles: {
    github: string;
    linkedin: string;
  };
}

/** Title, description and preview image of the start page for search engines and shared links. */
export interface Seo {
  title: Localized<string>;
  description: Localized<string>;
  ogImage?: PortfolioImage;
}

/** Every section by its name in the API, e.g. `/portfolio/hero`. */
export interface PortfolioSections {
  hero: Hero;
  about: About;
  projects: ProjectsSection;
  skills: SkillsSection;
  contact: ContactSection;
  settings: Settings;
  seo: Seo;
}

export type PortfolioSectionName = keyof PortfolioSections;

/**
 * The content of the start page. A section is `undefined` until an admin created it. The same
 * models are written back: an image keeps its `url` for the preview, only `id` and `alt` are sent.
 */
export type Portfolio = { [K in PortfolioSectionName]: PortfolioSections[K] | undefined };

/** All sections in the order of the start page. */
export const PORTFOLIO_SECTIONS: readonly PortfolioSectionName[] = [
  'hero',
  'about',
  'projects',
  'skills',
  'contact',
  'settings',
  'seo',
];

export const isPortfolioSectionName = (value: unknown): value is PortfolioSectionName =>
  typeof value === 'string' && (PORTFOLIO_SECTIONS as readonly string[]).includes(value);

/** The limits of the backend, so a form can report them before sending. */
export const PORTFOLIO_LIMITS = {
  name: 200,
  headline: 200,
  description: 2000,
  /** One fact of "about me". */
  fact: 2000,
  facts: 20,
  mapPlace: 200,
  mapCoordinates: 200,
  projectTitle: 200,
  /** Rich-text HTML of a project, markup included. */
  projectDescription: PROJECT_DESCRIPTION_MAX,
  /** Images of one project, at least one. */
  projectImages: PROJECT_IMAGES_MAX,
  projects: 50,
  /** One technology of a project. */
  stackItem: 50,
  stack: 50,
  url: 500,
  skillSetTitle: 200,
  skillSets: 20,
  skillName: 200,
  skills: 50,
  /** One point of a skill. */
  point: 500,
  points: 20,
  phone: 200,
  addressLine: 200,
  addressLines: 10,
  seoTitle: 200,
  seoDescription: 300,
  alt: 200,
} as const;
