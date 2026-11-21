import { TestBed } from '@angular/core/testing';
import { PortfolioImage } from './portfolio';
import { PortfolioDtoMapper } from './portfolio-dto.mapper';
import { PortfolioDto } from './portfolio.dto';

const IMAGE: PortfolioImage = {
  id: 'm1',
  url: 'https://api.example.com/media/m1',
  width: 800,
  height: 1200,
  alt: { de: 'Porträt', en: 'Portrait' },
};

const DTO: PortfolioDto = {
  hero: {
    name: 'Ada Lovelace',
    roleAccent: { de: 'Frontend', en: 'Frontend' },
    role: { de: 'Entwicklerin', en: 'Developer' },
  },
  about: {
    headline: { de: 'Über mich', en: 'About me' },
    description: { de: 'Text', en: 'Text' },
    facts: { de: ['Eins'], en: ['One'] },
    image: IMAGE,
  },
  projects: null,
  skills: null,
  contact: null,
  settings: null,
  seo: null,
};

describe('PortfolioDtoMapper', () => {
  let mapper: PortfolioDtoMapper;

  beforeEach(() => (mapper = TestBed.inject(PortfolioDtoMapper)));

  it('maps a missing section to undefined and back to null', () => {
    const portfolio = mapper.toModel(DTO);

    expect(portfolio.hero?.name).toBe('Ada Lovelace');
    expect(portfolio.about?.image).toEqual(IMAGE);
    expect(portfolio.projects).toBeUndefined();
    expect(mapper.toDto(portfolio)).toEqual(DTO);
  });

  it('sends an image as a reference', () => {
    const about = mapper.toModel(DTO).about!;

    expect(mapper.toSectionDto('about', about, 'create').image).toEqual({
      id: 'm1',
      alt: { de: 'Porträt', en: 'Portrait' },
    });
  });

  it('trims texts and drops empty list entries', () => {
    const dto = mapper.toSectionDto(
      'about',
      {
        headline: { de: ' Über mich ', en: 'About me ' },
        description: { de: 'Text', en: 'Text' },
        facts: { de: [' Eins ', ''], en: ['One', '  '] },
        image: IMAGE,
      },
      'update',
    );

    expect(dto.headline).toEqual({ de: 'Über mich', en: 'About me' });
    expect(dto.facts).toEqual({ de: ['Eins'], en: ['One'] });
  });

  it('trims the hero, its role included', () => {
    expect(
      mapper.toSectionDto(
        'hero',
        {
          name: ' Ada ',
          roleAccent: { de: ' Frontend ', en: 'Frontend' },
          role: { de: 'Entwicklerin ', en: ' Developer' },
        },
        'create',
      ),
    ).toEqual({
      name: 'Ada',
      roleAccent: { de: 'Frontend', en: 'Frontend' },
      role: { de: 'Entwicklerin', en: 'Developer' },
    });
  });

  it('sends only the email and the profiles of the settings', () => {
    expect(
      mapper.toSectionDto(
        'settings',
        {
          email: ' ada@example.com ',
          profiles: { github: 'https://github.com/ada', linkedin: 'https://linkedin.com/in/ada ' },
        },
        'update',
      ),
    ).toEqual({
      email: 'ada@example.com',
      profiles: { github: 'https://github.com/ada', linkedin: 'https://linkedin.com/in/ada' },
    });
  });

  it('leaves an unset preview image out when creating and removes it with null when updating', () => {
    const seo = { title: DTO.about!.headline, description: DTO.about!.description };

    expect(mapper.toSectionDto('seo', seo, 'create').ogImage).toBeUndefined();
    expect(mapper.toSectionDto('seo', seo, 'update').ogImage).toBeNull();
  });

  it('never sends null for the links of a project', () => {
    const dto = mapper.toSectionDto(
      'projects',
      {
        headline: { de: 'Projekte', en: 'Projects' },
        description: { de: 'Text', en: 'Text' },
        items: [
          {
            title: 'Join',
            description: { de: 'Text', en: 'Text' },
            stack: ['Angular', ' '],
            githubUrl: '',
            testUrl: 'https://join.example.com',
            images: [IMAGE, { ...IMAGE, id: 'second' }],
            published: true,
          },
        ],
      },
      'update',
    );

    expect(dto.items[0].githubUrl).toBeUndefined();
    expect(dto.items[0].testUrl).toBe('https://join.example.com');
    expect(dto.items[0].stack).toEqual(['Angular']);
    // the images stay in their order and go out as references
    expect(dto.items[0].images.map((image) => image.id)).toEqual([IMAGE.id, 'second']);
    expect(dto.items[0].images[0]).not.toHaveProperty('url');
  });

  describe('published state of a project', () => {
    const projectDto = (published?: boolean): PortfolioDto => ({
      ...DTO,
      projects: {
        headline: { de: 'Projekte', en: 'Projects' },
        description: { de: 'Text', en: 'Text' },
        items: [
          {
            title: 'Join',
            description: { de: 'Text', en: 'Text' },
            stack: ['Angular'],
            images: [IMAGE],
            ...(published === undefined ? {} : { published }),
          },
        ],
      },
    });

    it.each([true, false])('reads published = %s from the DTO', (published) => {
      expect(mapper.toModel(projectDto(published)).projects?.items[0].published).toBe(published);
    });

    it('treats a project without the field as published', () => {
      expect(mapper.toModel(projectDto()).projects?.items[0].published).toBe(true);
    });

    it.each([true, false])('writes published = %s of a project', (published) => {
      const section = mapper.toModel(projectDto(published)).projects!;

      for (const mode of ['create', 'update'] as const) {
        expect(mapper.toSectionDto('projects', section, mode).items[0].published).toBe(published);
      }
    });
  });
});
