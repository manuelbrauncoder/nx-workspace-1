import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '@core/config/app-config';
import { firstValueFrom } from 'rxjs';
import { LegalPageDto } from './legal-page.dto';
import { LegalRepository } from './legal.repository';

const DTO: LegalPageDto = {
  de: '<h2>Angaben</h2>',
  en: '<h2>Details</h2>',
  updatedAt: '2026-10-26T09:00:00.000Z',
};

describe('LegalRepository', () => {
  let repository: LegalRepository;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: { apiBaseUrl: 'https://api.example.com' } },
      ],
    });
    repository = TestBed.inject(LegalRepository);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('loads the HTML of one page in the requested language as text', async () => {
    const html = firstValueFrom(repository.getHtml('imprint', 'en'));
    const request = backend.expectOne('https://api.example.com/legal/imprint?lang=en');
    request.flush('<h2>Details</h2>');

    expect(request.request.responseType).toBe('text');
    expect(await html).toBe('<h2>Details</h2>');
  });

  it('loads every page, a missing one as undefined', async () => {
    const pages = firstValueFrom(repository.getAll());
    backend
      .expectOne('https://api.example.com/legal')
      .flush({ imprint: DTO, privacy: null, accessibility: null, cookies: null });

    const result = await pages;
    expect(result.imprint).toEqual({
      html: { de: DTO.de, en: DTO.en },
      updatedAt: new Date(DTO.updatedAt),
    });
    expect(result.privacy).toBeUndefined();
  });

  it('sends both languages with PATCH and unwraps the answer', async () => {
    const page = firstValueFrom(repository.update('cookies', { de: DTO.de, en: DTO.en }));
    const request = backend.expectOne('https://api.example.com/legal/cookies');
    request.flush({ cookies: DTO });

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ de: DTO.de, en: DTO.en });
    expect((await page).html.en).toBe(DTO.en);
  });
});
