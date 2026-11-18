import { Localized } from '@core/i18n/localized';

// Without `?lang` the backend answers every localized value as `{ de, en }`, the shape of
// `Localized`. Optional fields are left out when they are not set.

export interface PortfolioImageDto {
  id: string;
  url: string;
  width: number;
  height: number;
  alt: Localized<string>;
}

/** How a section points to an image uploaded through `/media`. */
export interface PortfolioImageRefDto {
  id: string;
  alt: Localized<string>;
}

export interface HeroDto {
  name: string;
  description: Localized<string>;
  mapPlace?: Localized<string>;
  mapCoordinates?: string;
}

export interface AboutDto {
  headline: Localized<string>;
  description: Localized<string>;
  facts: Localized<string[]>;
  image: PortfolioImageDto;
}

export interface ProjectDto {
  title: string;
  /** Sanitized rich-text HTML. */
  description: Localized<string>;
  stack: string[];
  githubUrl?: string;
  testUrl?: string;
  /** In page order, the first one is the cover. */
  images: PortfolioImageDto[];
}

export interface ProjectsSectionDto {
  headline: Localized<string>;
  description: Localized<string>;
  items: ProjectDto[];
}

export interface SkillDto {
  name: Localized<string>;
  points: Localized<string[]>;
}

export interface SkillSetDto {
  title: Localized<string>;
  skills: SkillDto[];
}

export interface SkillsSectionDto {
  headline: Localized<string>;
  description: Localized<string>;
  sets: SkillSetDto[];
}

export interface ContactSectionDto {
  headline: Localized<string>;
  description: Localized<string>;
}

export interface SettingsDto {
  name: string;
  email: string;
  phone?: string;
  address?: string[];
  profiles: { github: string; linkedin: string };
}

export interface SeoDto {
  title: Localized<string>;
  description: Localized<string>;
  ogImage?: PortfolioImageDto;
}

export interface PortfolioSectionDtos {
  hero: HeroDto;
  about: AboutDto;
  projects: ProjectsSectionDto;
  skills: SkillsSectionDto;
  contact: ContactSectionDto;
  settings: SettingsDto;
  seo: SeoDto;
}

/** `GET /portfolio` is not wrapped. A section is `null` until it has been created. */
export type PortfolioDto = { [K in keyof PortfolioSectionDtos]: PortfolioSectionDtos[K] | null };

// The bodies of `POST` and `PATCH /portfolio/{section}`. An image is a reference. Creating leaves
// an unset optional field out, changing sends `null` to remove it.

export interface HeroWriteDto {
  name: string;
  description: Localized<string>;
  mapPlace?: Localized<string> | null;
  mapCoordinates?: string | null;
}

export interface AboutWriteDto {
  headline: Localized<string>;
  description: Localized<string>;
  facts: Localized<string[]>;
  image: PortfolioImageRefDto;
}

export interface ProjectWriteDto {
  title: string;
  description: Localized<string>;
  stack: string[];
  // A project is replaced as a whole, so an unset link is left out, never `null`.
  githubUrl?: string;
  testUrl?: string;
  images: PortfolioImageRefDto[];
}

export interface ProjectsSectionWriteDto {
  headline: Localized<string>;
  description: Localized<string>;
  items: ProjectWriteDto[];
}

export interface SettingsWriteDto {
  name: string;
  email: string;
  phone?: string | null;
  address?: string[] | null;
  profiles: { github: string; linkedin: string };
}

export interface SeoWriteDto {
  title: Localized<string>;
  description: Localized<string>;
  ogImage?: PortfolioImageRefDto | null;
}

export interface PortfolioSectionWriteDtos {
  hero: HeroWriteDto;
  about: AboutWriteDto;
  projects: ProjectsSectionWriteDto;
  skills: SkillsSectionDto;
  contact: ContactSectionDto;
  settings: SettingsWriteDto;
  seo: SeoWriteDto;
}

/** Creating and changing a section answer with the section, wrapped in its name. */
export type PortfolioSectionResponseDto<K extends keyof PortfolioSectionDtos> = {
  [P in K]: PortfolioSectionDtos[P];
};
