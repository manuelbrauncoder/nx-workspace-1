import { Service } from '@angular/core';
import { DtoMapper } from '../dto-mapper';
import { LEGAL_PAGES, LegalPage, LegalPages } from './legal-page';
import { LegalPageDto, LegalPagesDto } from './legal-page.dto';

@Service()
export class LegalPageDtoMapper extends DtoMapper<LegalPageDto, LegalPage> {
  toModel(dto: LegalPageDto): LegalPage {
    return { html: { de: dto.de, en: dto.en }, updatedAt: new Date(dto.updatedAt) };
  }

  toDto(page: LegalPage): LegalPageDto {
    return { de: page.html.de, en: page.html.en, updatedAt: page.updatedAt.toISOString() };
  }

  /** Every page of `GET /legal`; a page that does not exist yet becomes `undefined`. */
  toPages(dto: LegalPagesDto): LegalPages {
    return Object.fromEntries(
      LEGAL_PAGES.map((name) => {
        const page = dto[name];
        return [name, page ? this.toModel(page) : undefined];
      }),
    ) as LegalPages;
  }
}
