import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { UiRichText } from './rich-text';

describe('UiRichText', () => {
  async function render(html: string): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(UiRichText);
    fixture.componentRef.setInput('html', html);
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('.rich-text');
  }

  it('renders the formatting', async () => {
    const content = await render('<p>Milch und <strong>Brot</strong></p>');

    expect(content.querySelector('strong')?.textContent).toBe('Brot');
  });

  it('opens links in a new tab without access to the opener', async () => {
    const content = await render('<p><a href="https://angular.dev">Angular</a></p>');
    const link = content.querySelector('a')!;

    expect(link.getAttribute('href')).toBe('https://angular.dev');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer nofollow');
  });

  it('renders nothing that could run a script', async () => {
    const run = vi.fn();
    vi.stubGlobal('injected', run);

    const content = await render(
      '<p onclick="injected()">a</p><img src="x" onerror="injected()">' +
        '<script>injected()</script><a href="javascript:injected()">b</a>',
    );
    content.querySelector('p')!.click();

    expect(content.innerHTML).toBe('<p>a</p>b');
    expect(run).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('follows a link within the site through the router', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(UiRichText);
    fixture.componentRef.setInput('html', '<p><a href="/privacy">Datenschutz</a></p>');
    fixture.componentRef.setInput('profile', 'page');
    await fixture.whenStable();

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(click);

    expect(navigate).toHaveBeenCalledWith('/privacy');
    expect(click.defaultPrevented).toBe(true);
    expect(link.target).toBe('');
  });
});
