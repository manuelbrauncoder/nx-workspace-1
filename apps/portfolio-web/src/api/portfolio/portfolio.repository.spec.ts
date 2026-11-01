import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '@core/config/app-config';
import { firstValueFrom } from 'rxjs';
import { ContactSection } from './portfolio';
import { PortfolioRepository } from './portfolio.repository';

const CONTACT: ContactSection = {
  headline: { de: 'Kontakt', en: 'Contact' },
  description: { de: 'Schreib mir', en: 'Write to me' },
};

describe('PortfolioRepository', () => {
  let repository: PortfolioRepository;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: { apiBaseUrl: 'https://api.example.com' } },
      ],
    });
    repository = TestBed.inject(PortfolioRepository);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('loads the content in every language, the response is not wrapped', async () => {
    const portfolio = firstValueFrom(repository.get());
    const request = backend.expectOne('https://api.example.com/portfolio');
    request.flush({
      hero: null,
      about: null,
      projects: null,
      skills: null,
      contact: CONTACT,
      settings: null,
      seo: null,
    });

    expect(request.request.method).toBe('GET');
    expect((await portfolio).contact).toEqual(CONTACT);
    expect((await portfolio).hero).toBeUndefined();
  });

  it('creates a section with POST and unwraps the answer', async () => {
    const contact = firstValueFrom(repository.create('contact', CONTACT));
    const request = backend.expectOne('https://api.example.com/portfolio/contact');
    request.flush({ contact: CONTACT }, { status: 201, statusText: 'Created' });

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(CONTACT);
    expect(await contact).toEqual(CONTACT);
  });

  it('changes a section with PATCH', async () => {
    const hero = { name: 'Ada', description: { de: 'Hallo', en: 'Hello' } };
    const saved = firstValueFrom(repository.update('hero', hero));
    const request = backend.expectOne('https://api.example.com/portfolio/hero');
    request.flush({ hero });

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ ...hero, mapPlace: null, mapCoordinates: null });
    expect((await saved).name).toBe('Ada');
  });
});
