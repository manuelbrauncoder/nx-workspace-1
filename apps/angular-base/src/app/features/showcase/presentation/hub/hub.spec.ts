import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { SHOWCASE_PAGES } from '../showcase-pages';
import { showcaseShellI18n } from '../showcase-shell/showcase-shell.i18n';
import { Hub } from './hub';
import { showcaseHubI18n } from './hub.i18n';

describe('Hub', () => {
  it('links to every showcase page', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    // The page titles on the cards belong to the scope of the showcase shell.
    await loadI18nScopes(showcaseHubI18n, showcaseShellI18n);
    const fixture = TestBed.createComponent(Hub);
    await fixture.whenStable();

    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a'));

    expect(links.map((link) => link.getAttribute('href'))).toEqual(
      SHOWCASE_PAGES.map((page) => `/${page.path}`),
    );
  });
});
