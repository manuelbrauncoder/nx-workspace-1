import { Service } from '@angular/core';
import { Localized } from '@core/i18n/localized';
import { DtoMapper } from '../dto-mapper';
import {
  About,
  ContactSection,
  Hero,
  Portfolio,
  PortfolioImage,
  PortfolioSectionName,
  PortfolioSections,
  Project,
  ProjectsSection,
  Seo,
  Settings,
  SkillsSection,
} from './portfolio';
import {
  AboutDto,
  ContactSectionDto,
  HeroDto,
  PortfolioDto,
  PortfolioImageDto,
  PortfolioImageRefDto,
  PortfolioSectionDtos,
  PortfolioSectionWriteDtos,
  ProjectDto,
  ProjectsSectionDto,
  SeoDto,
  SettingsDto,
  SkillsSectionDto,
} from './portfolio.dto';

/** `create` leaves an unset optional field out, `update` removes it with `null`. */
export type PortfolioWriteMode = 'create' | 'update';

type Readers = {
  [K in PortfolioSectionName]: (dto: PortfolioSectionDtos[K]) => PortfolioSections[K];
};
type Writers = {
  [K in PortfolioSectionName]: (
    value: PortfolioSections[K],
    mode: PortfolioWriteMode,
  ) => PortfolioSectionWriteDtos[K];
};

const copy = <T>(value: Localized<T>): Localized<T> => ({ de: value.de, en: value.en });
const trim = (value: Localized<string>): Localized<string> => ({
  de: value.de.trim(),
  en: value.en.trim(),
});
const trimList = (values: string[]): string[] =>
  values.map((value) => value.trim()).filter((value) => value !== '');
const trimLines = (value: Localized<string[]>): Localized<string[]> => ({
  de: trimList(value.de),
  en: trimList(value.en),
});
const absent = (mode: PortfolioWriteMode): undefined | null =>
  mode === 'create' ? undefined : null;
const optionalText = (value: string | undefined, mode: PortfolioWriteMode) =>
  value?.trim() || absent(mode);
const optionalLocalized = (value: Localized<string> | undefined, mode: PortfolioWriteMode) =>
  value && (value.de.trim() || value.en.trim()) ? trim(value) : absent(mode);

const toImage = (dto: PortfolioImageDto): PortfolioImage => ({
  id: dto.id,
  url: dto.url,
  width: dto.width,
  height: dto.height,
  alt: copy(dto.alt),
});
/** A section points to an uploaded image, `url` and size belong to the image itself. */
const toImageRef = (image: PortfolioImage): PortfolioImageRefDto => ({
  id: image.id,
  alt: trim(image.alt),
});

const toProject = (dto: ProjectDto): Project => ({
  title: dto.title,
  description: copy(dto.description),
  stack: [...dto.stack],
  githubUrl: dto.githubUrl,
  testUrl: dto.testUrl,
  images: dto.images.map(toImage),
});

const READERS: Readers = {
  hero: (dto: HeroDto): Hero => ({
    name: dto.name,
    description: copy(dto.description),
    mapPlace: dto.mapPlace && copy(dto.mapPlace),
    mapCoordinates: dto.mapCoordinates,
  }),
  about: (dto: AboutDto): About => ({
    headline: copy(dto.headline),
    description: copy(dto.description),
    facts: copy(dto.facts),
    image: toImage(dto.image),
  }),
  projects: (dto: ProjectsSectionDto): ProjectsSection => ({
    headline: copy(dto.headline),
    description: copy(dto.description),
    items: dto.items.map(toProject),
  }),
  skills: (dto: SkillsSectionDto): SkillsSection => ({
    headline: copy(dto.headline),
    description: copy(dto.description),
    sets: dto.sets.map((set) => ({
      title: copy(set.title),
      skills: set.skills.map((skill) => ({ name: copy(skill.name), points: copy(skill.points) })),
    })),
  }),
  contact: (dto: ContactSectionDto): ContactSection => ({
    headline: copy(dto.headline),
    description: copy(dto.description),
  }),
  settings: (dto: SettingsDto): Settings => ({
    name: dto.name,
    email: dto.email,
    phone: dto.phone,
    address: dto.address && [...dto.address],
    profiles: { github: dto.profiles.github, linkedin: dto.profiles.linkedin },
  }),
  seo: (dto: SeoDto): Seo => ({
    title: copy(dto.title),
    description: copy(dto.description),
    ogImage: dto.ogImage && toImage(dto.ogImage),
  }),
};

const WRITERS: Writers = {
  hero: (hero, mode) => ({
    name: hero.name.trim(),
    description: trim(hero.description),
    mapPlace: optionalLocalized(hero.mapPlace, mode),
    mapCoordinates: optionalText(hero.mapCoordinates, mode),
  }),
  about: (about) => ({
    headline: trim(about.headline),
    description: trim(about.description),
    facts: trimLines(about.facts),
    image: toImageRef(about.image),
  }),
  projects: (projects) => ({
    headline: trim(projects.headline),
    description: trim(projects.description),
    items: projects.items.map((project) => ({
      title: project.title.trim(),
      description: trim(project.description),
      stack: trimList(project.stack),
      githubUrl: project.githubUrl?.trim() || undefined,
      testUrl: project.testUrl?.trim() || undefined,
      images: project.images.map(toImageRef),
    })),
  }),
  skills: (skills) => ({
    headline: trim(skills.headline),
    description: trim(skills.description),
    sets: skills.sets.map((set) => ({
      title: trim(set.title),
      skills: set.skills.map((skill) => ({
        name: trim(skill.name),
        points: trimLines(skill.points),
      })),
    })),
  }),
  contact: (contact) => ({
    headline: trim(contact.headline),
    description: trim(contact.description),
  }),
  settings: (settings, mode) => {
    const address = trimList(settings.address ?? []);
    return {
      name: settings.name.trim(),
      email: settings.email.trim(),
      phone: optionalText(settings.phone, mode),
      address: address.length > 0 ? address : absent(mode),
      profiles: {
        github: settings.profiles.github.trim(),
        linkedin: settings.profiles.linkedin.trim(),
      },
    };
  },
  seo: (seo, mode) => ({
    title: trim(seo.title),
    description: trim(seo.description),
    ogImage: seo.ogImage ? toImageRef(seo.ogImage) : absent(mode),
  }),
};

@Service()
export class PortfolioDtoMapper extends DtoMapper<PortfolioDto, Portfolio> {
  toModel(dto: PortfolioDto): Portfolio {
    return {
      hero: dto.hero ? READERS.hero(dto.hero) : undefined,
      about: dto.about ? READERS.about(dto.about) : undefined,
      projects: dto.projects ? READERS.projects(dto.projects) : undefined,
      skills: dto.skills ? READERS.skills(dto.skills) : undefined,
      contact: dto.contact ? READERS.contact(dto.contact) : undefined,
      settings: dto.settings ? READERS.settings(dto.settings) : undefined,
      seo: dto.seo ? READERS.seo(dto.seo) : undefined,
    };
  }

  /** The read format has the shape of the model, only a missing section is `null`. */
  toDto(portfolio: Portfolio): PortfolioDto {
    return {
      hero: portfolio.hero ?? null,
      about: portfolio.about ?? null,
      projects: portfolio.projects ?? null,
      skills: portfolio.skills ?? null,
      contact: portfolio.contact ?? null,
      settings: portfolio.settings ?? null,
      seo: portfolio.seo ?? null,
    };
  }

  /** A section from the response of a write. */
  toSectionModel<K extends PortfolioSectionName>(
    name: K,
    dto: PortfolioSectionDtos[K],
  ): PortfolioSections[K] {
    return READERS[name](dto);
  }

  /** The body to create or change a section. Texts are trimmed, empty list entries dropped. */
  toSectionDto<K extends PortfolioSectionName>(
    name: K,
    value: PortfolioSections[K],
    mode: PortfolioWriteMode,
  ): PortfolioSectionWriteDtos[K] {
    return WRITERS[name](value, mode);
  }
}
