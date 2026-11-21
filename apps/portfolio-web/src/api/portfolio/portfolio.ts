import { Localized } from '@core/i18n/localized';
import {
  HERO_ROLE_ACCENT_MAX,
  HERO_ROLE_MAX,
  PROJECT_DESCRIPTION_MAX,
  PROJECT_IMAGES_MAX,
} from '@portfolio/contracts/portfolio-limits';

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

/** First screen of the start page: the name and the role line below it. */
export interface Hero {
  name: string;
  /** Start of the role, set apart in the italic serif, e.g. "Frontend". */
  roleAccent: Localized<string>;
  /** Rest of the role after the accent, e.g. "Developer". */
  role: Localized<string>;
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
  /** `false`: a draft. The backend only delivers drafts to the admin, who sees them on the site. */
  published: boolean;
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

/** The direct ways of contact in the contact section. */
export interface Settings {
  email: string;
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
  /** Accent word of the role in the hero, e.g. "Frontend". */
  roleAccent: HERO_ROLE_ACCENT_MAX,
  /** Rest of the role in the hero, e.g. "Developer". */
  role: HERO_ROLE_MAX,
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
  seoTitle: 200,
  seoDescription: 300,
  alt: 200,
} as const;
