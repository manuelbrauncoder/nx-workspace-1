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
  hero: { name: 'Ada Lovelace', description: { de: 'Hallo', en: 'Hello' } },
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

  it('leaves unset optional fields out when creating', () => {
    const dto = mapper.toSectionDto(
      'hero',
      { name: 'Ada', description: { de: 'Hallo', en: 'Hello' }, mapCoordinates: ' ' },
      'create',
    );

    expect(dto.mapPlace).toBeUndefined();
    expect(dto.mapCoordinates).toBeUndefined();
  });

  it('removes unset optional fields with null when updating', () => {
    expect(
      mapper.toSectionDto(
        'hero',
        { name: 'Ada', description: { de: 'Hallo', en: 'Hello' }, mapPlace: { de: '', en: '' } },
        'update',
      ),
    ).toEqual({
      name: 'Ada',
      description: { de: 'Hallo', en: 'Hello' },
      mapPlace: null,
      mapCoordinates: null,
    });

    const settings = mapper.toSectionDto(
      'settings',
      {
        name: 'Ada',
        email: 'ada@example.com',
        address: [''],
        profiles: { github: 'https://github.com/ada', linkedin: 'https://linkedin.com/in/ada' },
      },
      'update',
    );
    expect(settings.phone).toBeNull();
    expect(settings.address).toBeNull();
    expect(
      mapper.toSectionDto(
        'seo',
        { title: DTO.about!.headline, description: DTO.about!.description },
        'update',
      ).ogImage,
    ).toBeNull();
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
});
