import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { APP_VERSION } from '@core/app-version';
import { AppFooter } from './app-footer';

describe('AppFooter', () => {
  async function render(version = '1.2.0') {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: APP_VERSION, useValue: version }],
    });
    const fixture = TestBed.createComponent(AppFooter);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows one English line with place and version', async () => {
    const element = await render();

    const line = element.querySelector('.app-footer__made-with')!;
    expect(line.getAttribute('lang')).toBe('en');
    const text = line.textContent?.replace(/\s+/g, ' ').trim();
    expect(text).toContain('Made with');
    expect(text).toContain('in Partenstein');
    expect(text).toContain('v1.2.0');
    expect(
      line.querySelector('app-ui-icon')?.getAttribute('aria-label') ?? line.innerHTML,
    ).toContain('love');
  });

  it('leaves out the version when there is none', async () => {
    const element = await render('');

    const text = element.querySelector('.app-footer__made-with')!.textContent!;
    expect(text).toContain('Partenstein');
    expect(text).not.toContain('·');
    expect(text).not.toContain('v1');
  });

  it('links to the legal pages', async () => {
    const element = await render();

    const links = Array.from(element.querySelectorAll('nav a'));
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/imprint',
      '/privacy',
      '/accessibility',
      '/cookies',
    ]);
    expect(element.querySelector('nav')?.getAttribute('aria-label')).toBeTruthy();
  });

  it('is accessible', async () => {
    const element = await render();

    await expect(element).toBeAccessible();
  });
});
