import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppConfigService } from '@core/config/app-config';
import { I18nService } from '@core/i18n/i18n.service';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { LegalStore } from '../../application/legal.store';
import { LegalUseCase } from '../../domain/legal.usecase';
import { LegalPage } from './legal-page';
import { legalPageI18n } from './legal-page.i18n';

describe('LegalPage', () => {
  async function render() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: { apiBaseUrl: 'https://api.example.com' } },
        LegalUseCase,
        LegalStore,
      ],
    });
    await loadI18nScopes(legalPageI18n);
    const fixture = TestBed.createComponent(LegalPage);
    fixture.componentRef.setInput('page', 'imprint');
    fixture.detectChanges();
    return {
      fixture,
      element: fixture.nativeElement as HTMLElement,
      backend: TestBed.inject(HttpTestingController),
    };
  }

  it('shows the heading of the app and the content from the backend', async () => {
    const { fixture, element, backend } = await render();

    backend
      .expectOne('https://api.example.com/legal/imprint?lang=de')
      .flush('<h2>Angaben</h2><p><a href="/privacy">Datenschutz</a></p>');
    await fixture.whenStable();

    expect(element.querySelector('h1')?.textContent).toBe('Impressum');
    expect(element.querySelector('h2')?.textContent).toBe('Angaben');
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/privacy');
    backend.verify();
  });

  it('loads the page again in the new language', async () => {
    const { fixture, element, backend } = await render();
    backend.expectOne('https://api.example.com/legal/imprint?lang=de').flush('<p>Hallo</p>');
    await fixture.whenStable();

    await TestBed.inject(I18nService).setLanguage('en');
    fixture.detectChanges();
    backend.expectOne('https://api.example.com/legal/imprint?lang=en').flush('<p>Hello</p>');
    await fixture.whenStable();

    expect(element.querySelector('h1')?.textContent).toBe('Imprint');
    expect(element.querySelector('p')?.textContent).toBe('Hello');
    backend.verify();
  });
});
