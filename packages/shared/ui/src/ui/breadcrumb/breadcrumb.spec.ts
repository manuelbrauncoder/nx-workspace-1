import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { defineI18nScope } from '@core/i18n/i18n-scope';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { UiBreadcrumb, UiBreadcrumbItem } from './breadcrumb';

// The labels come from the app, so the spec brings its own.
const LABELS = { home: 'Start', notes: 'Notizen', projects: 'Projekte' };

declare module '@core/i18n/translation-key' {
  interface I18nScopes {
    breadcrumbSpec: typeof LABELS;
  }
}

const breadcrumbSpecI18n = defineI18nScope('breadcrumbSpec', {
  de: () => Promise.resolve({ default: LABELS }),
  en: () => Promise.resolve({ default: LABELS }),
});

const ITEMS: UiBreadcrumbItem[] = [
  { labelKey: 'breadcrumbSpec.home', path: '/' },
  { labelKey: 'breadcrumbSpec.notes', path: '/notes' },
  { labelKey: 'breadcrumbSpec.projects' },
];

describe('UiBreadcrumb', () => {
  async function render(inputs: Record<string, unknown> = {}): Promise<HTMLElement> {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    await loadI18nScopes(breadcrumbSpecI18n);
    const fixture = TestBed.createComponent(UiBreadcrumb);
    fixture.componentRef.setInput('items', ITEMS);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('links every item but the last, which is the current page', async () => {
    const element = await render();

    const links = Array.from(element.querySelectorAll('a'), (link) => link.getAttribute('href'));
    const current = element.querySelector('[aria-current="page"]');

    expect(links).toEqual(['/', '/notes']);
    expect(current?.tagName).toBe('SPAN');
    expect(current?.textContent?.trim()).toBe('Projekte');
  });

  it('is a named navigation with hidden separators between the items', async () => {
    const element = await render();
    const nav = element.querySelector('nav')!;

    expect(nav.getAttribute('aria-label')).toBe('Navigationspfad');
    expect(nav.querySelectorAll('li[aria-hidden="true"]')).toHaveLength(2);
  });

  it('takes its own label', async () => {
    const element = await render({ label: 'Pfad' });

    expect(element.querySelector('nav')?.getAttribute('aria-label')).toBe('Pfad');
  });
});
