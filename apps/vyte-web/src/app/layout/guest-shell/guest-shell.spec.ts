import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { GuestShell } from './guest-shell';

@Component({ template: `<h1>Einladung</h1>` })
class Page {}

describe('GuestShell', () => {
  async function render() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: GuestShell, children: [{ path: 'rsvp', component: Page }] },
        ]),
      ],
    });
    const harness = await RouterTestingHarness.create('/rsvp');
    const element: HTMLElement = harness.routeNativeElement!;
    return { element };
  }

  it('shows the wordmark in lower case, and it is no link', async () => {
    const { element } = await render();

    const wordmark = element.querySelector('header .guest-shell__wordmark');
    expect(wordmark?.textContent?.trim()).toBe('vyte');
    expect(element.querySelector('header a')).toBeNull();
    expect(wordmark?.closest('a')).toBeNull();
  });

  it('has no navigation and no sign-in apart from the legal links', async () => {
    const { element } = await render();

    expect(element.querySelectorAll('nav')).toHaveLength(1);
    expect(element.querySelector('header nav')).toBeNull();
    expect(element.querySelector('a[href="/sign-in"]')).toBeNull();
  });

  it('renders the routed page in the main area that skip links can target', async () => {
    const { element } = await render();

    const main = element.querySelector('main');
    expect(main?.id).toBe('main');
    expect(main?.getAttribute('tabindex')).toBe('-1');
    expect(main?.querySelector('h1')?.textContent).toBe('Einladung');
  });

  it('links to the legal pages in the footer', async () => {
    const { element } = await render();

    const nav = element.querySelector('footer nav');
    expect(nav?.getAttribute('aria-label')).toBe('Rechtliches');
    expect(Array.from(nav!.querySelectorAll('a'), (link) => link.getAttribute('href'))).toEqual([
      '/imprint',
      '/privacy',
      '/accessibility',
      '/cookies',
    ]);
    expect(Array.from(nav!.querySelectorAll('a'), (link) => link.textContent?.trim())).toEqual([
      'Impressum',
      'Datenschutz',
      'Barrierefreiheit',
      'Cookies',
    ]);
    expect(element.querySelector('footer')?.textContent).toContain('Erstellt mit vyte');
  });

  it('hides the decoration from assistive technology', async () => {
    const { element } = await render();

    const layer = element.querySelector('.guest-shell__decor-layer')!;
    expect(layer.getAttribute('aria-hidden')).toBe('true');
    expect(layer.querySelectorAll('.guest-shell__decor')).toHaveLength(2);
    expect(layer.textContent?.trim()).toBe('');
  });

  it('has no accessibility violations', async () => {
    const { element } = await render();

    await expect(element).toBeAccessible();
  });
});
