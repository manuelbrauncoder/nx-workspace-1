import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { Components } from './components';
import { showcaseComponentsI18n } from './components.i18n';

describe('Components', () => {
  beforeEach(() => {
    // jsdom has no ResizeObserver, some wrappers measure themselves with one.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  async function render(page?: unknown) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    await loadI18nScopes(showcaseComponentsI18n);
    const fixture = TestBed.createComponent(Components);
    if (page !== undefined) {
      fixture.componentRef.setInput('page', page);
    }
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('starts the pagination example on page 1', async () => {
    const element = await render();

    expect(element.textContent).toContain('Seite 1 von 12');
  });

  it('shows the page of the query parameter', async () => {
    const element = await render('3');

    expect(element.textContent).toContain('Seite 3 von 12');
    expect(element.querySelector('a[aria-current="page"]')?.getAttribute('aria-label')).toBe(
      'Seite 3',
    );
  });

  it('keeps an out of range or invalid page inside the page count', async () => {
    expect((await render('99')).textContent).toContain('Seite 12 von 12');
  });
});
