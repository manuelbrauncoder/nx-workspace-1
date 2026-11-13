import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { paginationItems, UiPagination } from './pagination';

describe('paginationItems', () => {
  it('lists every page up to seven pages', () => {
    expect(paginationItems(1, 1)).toEqual([1]);
    expect(paginationItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it.each([
    [1, [1, 2, 3, 4, 5, 'gap', 12]],
    [2, [1, 2, 3, 4, 5, 'gap', 12]],
    [4, [1, 'gap', 3, 4, 5, 'gap', 12]],
    [6, [1, 'gap', 5, 6, 7, 'gap', 12]],
    [9, [1, 'gap', 8, 9, 10, 'gap', 12]],
    [11, [1, 'gap', 8, 9, 10, 11, 12]],
    [12, [1, 'gap', 8, 9, 10, 11, 12]],
  ])('shortens 12 pages around page %i', (page, expected) => {
    expect(paginationItems(page, 12)).toEqual(expected);
  });

  it('keeps the first, the last and the current page, without duplicates, sorted, at most 7', () => {
    for (const count of [8, 12, 50]) {
      for (let page = 1; page <= count; page++) {
        const items = paginationItems(page, count);
        const numbers = items.filter((item): item is number => item !== 'gap');

        expect(items.length).toBeLessThanOrEqual(7);
        expect(numbers[0]).toBe(1);
        expect(numbers.at(-1)).toBe(count);
        expect(numbers).toContain(page);
        expect(new Set(numbers).size).toBe(numbers.length);
        expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
        expect(items[0]).not.toBe('gap');
        expect(items.at(-1)).not.toBe('gap');
      }
    }
  });
});

@Component({
  imports: [UiPagination],
  template: `<app-ui-pagination
    [page]="page()"
    [pageCount]="pageCount()"
    [queryParam]="queryParam()"
    [fragment]="fragment()"
    label="Seiten der Liste"
  />`,
})
class Host {
  readonly page = signal(1);
  readonly pageCount = signal(5);
  readonly queryParam = signal('page');
  readonly fragment = signal<string | undefined>(undefined);
}

describe('UiPagination', () => {
  async function render(
    url = '/',
    inputs: { page?: number; pageCount?: number; queryParam?: string; fragment?: string } = {},
  ) {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: '', component: Host }])] });
    const harness = await RouterTestingHarness.create(url);
    const host = harness.routeNativeElement as HTMLElement;
    const component = harness.routeDebugElement!.componentInstance as Host;
    if (inputs.page !== undefined) component.page.set(inputs.page);
    if (inputs.pageCount !== undefined) component.pageCount.set(inputs.pageCount);
    if (inputs.queryParam !== undefined) component.queryParam.set(inputs.queryParam);
    if (inputs.fragment !== undefined) component.fragment.set(inputs.fragment);
    await harness.fixture.whenStable();
    harness.detectChanges();
    return { host, nav: host.querySelector('nav') };
  }

  const href = (host: HTMLElement, label: string) =>
    host.querySelector(`a[aria-label="${label}"]`)?.getAttribute('href');

  it.each([0, 1])('is hidden with a page count of %i', async (pageCount) => {
    expect((await render('/', { pageCount })).nav).toBeNull();
  });

  it('names the navigation by its label', async () => {
    const { nav } = await render();

    expect(nav?.getAttribute('aria-label')).toBe('Seiten der Liste');
  });

  it('marks the current page', async () => {
    const { host } = await render('/', { page: 3 });

    const current = host.querySelectorAll('a[aria-current="page"]');

    expect(current).toHaveLength(1);
    expect(current[0].getAttribute('aria-label')).toBe('Seite 3');
    expect(current[0].textContent?.trim()).toBe('3');
  });

  it('has no previous link on the first page', async () => {
    const { host } = await render('/', { page: 1 });

    expect(href(host, 'Zurück zur vorherigen Seite')).toBeUndefined();
    expect(href(host, 'Weiter zur nächsten Seite')).toBe('/?page=2');
  });

  it('has no next link on the last page', async () => {
    const { host } = await render('/?page=5', { page: 5 });

    expect(href(host, 'Weiter zur nächsten Seite')).toBeUndefined();
    expect(href(host, 'Zurück zur vorherigen Seite')).toBe('/?page=4');
  });

  it('puts the page into the address, page 1 carries no parameter', async () => {
    const { host } = await render('/?page=3', { page: 3 });

    expect(href(host, 'Seite 1')).toBe('/');
    expect(href(host, 'Seite 2')).toBe('/?page=2');
    expect(href(host, 'Seite 5')).toBe('/?page=5');
    expect(href(host, 'Zurück zur vorherigen Seite')).toBe('/?page=2');
  });

  it('keeps the other query parameters', async () => {
    const { host } = await render('/?q=ada&page=3', { page: 3 });

    expect(href(host, 'Seite 4')).toBe('/?q=ada&page=4');
    expect(href(host, 'Seite 1')).toBe('/?q=ada');
  });

  it('uses a custom query parameter', async () => {
    const { host } = await render('/?page=9', { page: 2, queryParam: 'p' });

    expect(href(host, 'Seite 3')).toBe('/?page=9&p=3');
    expect(href(host, 'Seite 1')).toBe('/?page=9');
  });

  it('jumps to the fragment on every link, so the list takes the focus again', async () => {
    const { host } = await render('/', { page: 2, fragment: 'guests' });

    expect(href(host, 'Seite 3')).toBe('/?page=3#guests');
    expect(href(host, 'Zurück zur vorherigen Seite')).toBe('/#guests');
    expect(href(host, 'Weiter zur nächsten Seite')).toBe('/?page=3#guests');
  });

  it('shows a gap with a text for screen readers', async () => {
    const { host } = await render('/', { page: 1, pageCount: 12 });

    expect(host.textContent).toContain('Weitere Seiten');
    expect(host.querySelectorAll('a[aria-label^="Seite "]').length).toBeLessThanOrEqual(6);
  });

  it('has no accessibility violations', async () => {
    const { host } = await render('/?page=3', { page: 3, pageCount: 12 });

    await expect(host).toBeAccessible();
  });
});
