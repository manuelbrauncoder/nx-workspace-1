import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { defineI18nScope } from '@core/i18n/i18n-scope';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { UiTabNav, UiTabNavItem } from './tab-nav';

// The labels come from the app, so the spec brings its own.
const LABELS = { overview: 'Übersicht', guests: 'Gäste' };

declare module '@core/i18n/translation-key' {
  interface I18nScopes {
    tabNavSpec: typeof LABELS;
  }
}

const tabNavSpecI18n = defineI18nScope('tabNavSpec', {
  de: () => Promise.resolve({ default: LABELS }),
  en: () => Promise.resolve({ default: LABELS }),
});

const ITEMS: UiTabNavItem[] = [
  { labelKey: 'tabNavSpec.overview', path: '/events/e1', exact: true },
  { labelKey: 'tabNavSpec.guests', path: '/events/e1/guests' },
];

@Component({ template: '' })
class Page {}

describe('UiTabNav', () => {
  async function render(url = '/events/e1', items: readonly UiTabNavItem[] = ITEMS) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'events/:id', component: Page, children: [{ path: 'guests', component: Page }] },
        ]),
      ],
    });
    await loadI18nScopes(tabNavSpecI18n);
    await TestBed.inject(Router).navigateByUrl(url);
    const fixture = TestBed.createComponent(UiTabNav);
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('label', 'Bereiche');
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const current = (element: HTMLElement) =>
    Array.from(element.querySelectorAll('a[aria-current="page"]'), (a) => a.textContent?.trim());

  it('is a navigation named by its label with one link per item', async () => {
    const element = await render();

    expect(element.querySelector('nav')?.getAttribute('aria-label')).toBe('Bereiche');
    const links = Array.from(element.querySelectorAll('li > a'));
    expect(links.map((a) => a.textContent?.trim())).toEqual(['Übersicht', 'Gäste']);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/events/e1', '/events/e1/guests']);
  });

  it('marks the active tab as the current page', async () => {
    const element = await render('/events/e1/guests');

    expect(current(element)).toEqual(['Gäste']);
    const link = element.querySelector('a[aria-current="page"]');
    expect(link?.classList).toContain('ui-tab-nav__link--current');
  });

  it('does not mark an exact tab on a path below it', async () => {
    const element = await render('/events/e1/guests');

    const overview = element.querySelector('a[href="/events/e1"]');
    expect(overview?.hasAttribute('aria-current')).toBe(false);
    expect(overview?.classList).not.toContain('ui-tab-nav__link--current');
  });

  it('marks an exact tab on its own path only', async () => {
    const element = await render('/events/e1');

    expect(current(element)).toEqual(['Übersicht']);
  });

  it('marks a tab that is not exact on a path below it', async () => {
    const element = await render('/events/e1/guests');

    expect(current(element)).toEqual(['Gäste']);
  });

  it('renders no links without items', async () => {
    const element = await render('/events/e1', []);

    expect(element.querySelectorAll('a')).toHaveLength(0);
  });

  it('has no accessibility violations', async () => {
    const element = await render('/events/e1/guests');

    await expect(element).toBeAccessible();
  });
});
