import { TestBed } from '@angular/core/testing';
import { LegalPageDtoMapper } from './legal-page-dto.mapper';
import { LegalPageDto } from './legal-page.dto';

const DTO: LegalPageDto = {
  de: '<p>Hallo</p>',
  en: '<p>Hello</p>',
  updatedAt: '2026-10-26T09:00:00.000Z',
};

describe('LegalPageDtoMapper', () => {
  const mapper = () => TestBed.inject(LegalPageDtoMapper);

  it('maps both directions without loss', () => {
    const page = mapper().toModel(DTO);

    expect(page.html).toEqual({ de: '<p>Hallo</p>', en: '<p>Hello</p>' });
    expect(page.updatedAt).toEqual(new Date(DTO.updatedAt));
    expect(mapper().toDto(page)).toEqual(DTO);
  });

  it('turns a page that does not exist into undefined', () => {
    const pages = mapper().toPages({
      imprint: null,
      privacy: DTO,
      accessibility: null,
      cookies: null,
    });

    expect(pages.imprint).toBeUndefined();
    expect(pages.privacy?.html.de).toBe('<p>Hallo</p>');
  });
});
