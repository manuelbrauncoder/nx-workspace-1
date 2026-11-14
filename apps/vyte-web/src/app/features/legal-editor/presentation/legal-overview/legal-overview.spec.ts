import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, loading, success } from '@core/state/async-state';
import { LegalEditorStore } from '../../application/legal-editor.store';
import { LegalPages } from '../../domain/legal';
import { LegalOverview } from './legal-overview';
import { legalOverviewI18n } from './legal-overview.i18n';

const EMPTY: LegalPages = {
  imprint: undefined,
  privacy: undefined,
  accessibility: undefined,
  cookies: undefined,
};
const STORED = {
  html: { de: '<p>Hallo</p>', en: '<p>Hello</p>' },
  updatedAt: new Date(2026, 10, 12, 9, 30),
};

describe('LegalOverview', () => {
  const reload = vi.fn();

  async function render(options: { pages?: LegalPages; state?: AsyncState } = {}) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: LegalEditorStore,
          useValue: {
            pages: signal(options.pages),
            state: signal(options.state ?? success()),
            reload,
          },
        },
      ],
    });
    await loadI18nScopes(legalOverviewI18n);
    const fixture = TestBed.createComponent(LegalOverview);
    await fixture.whenStable();
    return { element: fixture.nativeElement as HTMLElement };
  }

  const row = (element: HTMLElement, title: string) =>
    Array.from(element.querySelectorAll('li[appUiListItem]')).find(
      (item) => item.querySelector('h2')?.textContent?.trim() === title,
    )!;

  it('lists the four pages in order', async () => {
    const { element } = await render({ pages: EMPTY });

    expect(
      Array.from(element.querySelectorAll('li[appUiListItem] h2')).map((h) =>
        h.textContent?.trim(),
      ),
    ).toEqual(['Impressum', 'Datenschutzerklärung', 'Barrierefreiheit', 'Cookie-Richtlinie']);
  });

  it('offers only to create a page that does not exist yet', async () => {
    const { element } = await render({ pages: EMPTY });
    const imprint = row(element, 'Impressum');

    expect(imprint.textContent).toContain('Noch nicht angelegt');
    expect(imprint.textContent).toContain('Anlegen');
    expect(imprint.textContent).not.toContain('Ansehen');
    expect(imprint.querySelector('a')?.getAttribute('href')).toMatch(/imprint$/);
  });

  it('shows the date, a view link and an edit link of a stored page', async () => {
    const { element } = await render({ pages: { ...EMPTY, privacy: STORED } });
    const privacy = row(element, 'Datenschutzerklärung');

    expect(privacy.textContent).toMatch(/Stand: .*2026/);
    expect(privacy.textContent).not.toContain('Noch nicht angelegt');
    expect(
      privacy.querySelector('a[aria-label$="auf der Website ansehen"]')?.getAttribute('href'),
    ).toBe('/privacy');
    const edit = privacy.querySelector('a[aria-label="Datenschutzerklärung bearbeiten"]');
    expect(edit?.getAttribute('href')).toMatch(/privacy$/);
    expect(edit?.textContent).toContain('Bearbeiten');
  });

  it('leads back to the accounts through the tabs', async () => {
    const { element } = await render({ pages: EMPTY });

    const tabs = Array.from(element.querySelectorAll('nav a')).map((link) => [
      link.textContent?.trim(),
      link.getAttribute('href'),
    ]);
    expect(tabs).toEqual([
      ['Konten', '/admin/users'],
      ['Rechtsseiten', '/admin/legal'],
    ]);
  });

  it('shows the failure and retries', async () => {
    const { element } = await render({ state: failed(new Failure('server', 'Down')) });

    expect(element.textContent).toContain('Die Rechtsseiten konnten nicht geladen werden');
    expect(element.querySelector('li[appUiListItem]')).toBeNull();
    const retry = Array.from(element.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Erneut'),
    );
    retry?.click();
    expect(reload).toHaveBeenCalled();
  });

  it('shows no list while loading', async () => {
    const { element } = await render({ state: loading() });

    expect(element.querySelector('li[appUiListItem]')).toBeNull();
  });

  it('has no accessibility violations', async () => {
    const { element } = await render({ pages: { ...EMPTY, imprint: STORED } });

    await expect(element).toBeAccessible();
  });
});
