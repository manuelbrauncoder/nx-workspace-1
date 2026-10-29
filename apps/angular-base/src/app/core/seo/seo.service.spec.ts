import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AppConfigService } from '@core/config/app-config';
import { I18nService } from '@core/i18n/i18n.service';
import { injectPageSeo } from './inject-page-seo';
import { provideSeo } from './provide-seo';
import { routeSeo } from './route-seo';

@Component({ selector: 'app-page', template: '' })
class Page {}

@Component({ selector: 'app-data-page', template: '' })
class DataPage {
  constructor() {
    injectPageSeo(() => ({ title: 'Einkauf', description: 'Milch und Brot' }));
  }
}

describe('SeoService', () => {
  let router: Router;
  let meta: Meta;

  const content = (selector: string) => meta.getTag(selector)?.content;
  const canonical = () =>
    document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href');

  function setup(allowIndexing = true): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'internal',
            data: routeSeo({ index: false }),
            children: [{ path: 'page', title: 'common.close', component: Page }],
          },
          {
            path: 'described',
            title: 'common.cancel',
            data: routeSeo({ description: 'common.retry', image: '/other.png' }),
            component: Page,
          },
          { path: 'data', title: 'common.cancel', component: DataPage },
          { path: 'plain', title: 'common.cancel', component: Page },
        ]),
        provideSeo(),
        {
          provide: AppConfigService,
          useValue: { siteUrl: 'https://example.com', allowIndexing },
        },
      ],
    });
    router = TestBed.inject(Router);
    meta = TestBed.inject(Meta);
  }

  afterEach(() => {
    document.head
      .querySelectorAll('meta[name], meta[property], link[rel="canonical"]')
      .forEach((tag) => tag.remove());
  });

  it('writes title, description and social tags of a route', async () => {
    setup();
    await router.navigateByUrl('/plain');

    expect(TestBed.inject(Title).getTitle()).toBe('Abbrechen | angular-base');
    expect(content('name="description"')).toContain('Basis für Angular-Anwendungen');
    expect(content('name="robots"')).toBe('index, follow');
    expect(content('property="og:title"')).toBe('Abbrechen | angular-base');
    expect(content('property="og:url"')).toBe('https://example.com/plain');
    expect(content('property="og:locale"')).toBe('de_DE');
    expect(content('property="og:image"')).toBe('https://example.com/og-image.png');
    expect(content('property="og:image:width"')).toBe('1200');
    expect(content('name="twitter:image"')).toBe('https://example.com/og-image.png');
    expect(content('name="twitter:card"')).toBe('summary_large_image');
  });

  it('uses description and image of the route', async () => {
    setup();
    await router.navigateByUrl('/described');

    expect(content('name="description"')).toBe('Erneut versuchen');
    expect(content('property="og:image"')).toBe('https://example.com/other.png');
    expect(content('property="og:image:width"')).toBeUndefined();
  });

  it('leaves query and fragment out of the canonical URL', async () => {
    setup();
    await router.navigateByUrl('/plain?page=2#top');

    expect(canonical()).toBe('https://example.com/plain');
  });

  it('keeps a page out of the index when a parent route says so', async () => {
    setup();
    await router.navigateByUrl('/internal/page');

    expect(content('name="robots"')).toBe('noindex, nofollow');
  });

  it('keeps every page out of the index when the deployment does not allow indexing', async () => {
    setup(false);
    await router.navigateByUrl('/plain');

    expect(content('name="robots"')).toBe('noindex, nofollow');
  });

  it('takes title and description from the page and drops them when it is left', async () => {
    setup();
    const harness = await RouterTestingHarness.create('/data');

    expect(TestBed.inject(Title).getTitle()).toBe('Einkauf | angular-base');
    expect(content('name="description"')).toBe('Milch und Brot');

    await harness.navigateByUrl('/plain');

    expect(TestBed.inject(Title).getTitle()).toBe('Abbrechen | angular-base');
    expect(content('name="description"')).toContain('Basis für Angular-Anwendungen');
  });

  it('follows a language switch', async () => {
    setup();
    await router.navigateByUrl('/plain');
    await TestBed.inject(I18nService).setLanguage('en');
    TestBed.tick();

    expect(TestBed.inject(Title).getTitle()).toBe('Cancel | angular-base');
    expect(content('property="og:locale"')).toBe('en_GB');
  });
});
