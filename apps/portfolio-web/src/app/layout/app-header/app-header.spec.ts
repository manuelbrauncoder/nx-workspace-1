import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthStore } from '@features/auth/public-api';
import { AppHeader } from './app-header';

describe('AppHeader', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: { me: signal(undefined), isAdmin: signal(false) } },
      ],
    });
  });
  afterEach(() => {
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  function scrollTo(y: number): void {
    Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
    window.dispatchEvent(new Event('scroll'));
  }

  async function render() {
    const fixture = TestBed.createComponent(AppHeader);
    await fixture.whenStable();
    return fixture;
  }

  it('is not scrolled at the top of the page', async () => {
    const fixture = await render();

    expect(fixture.nativeElement.classList).not.toContain('app-header--scrolled');
  });

  it('stays unscrolled up to 40px', async () => {
    const fixture = await render();

    scrollTo(40);
    await fixture.whenStable();

    expect(fixture.nativeElement.classList).not.toContain('app-header--scrolled');
  });

  it('gets the scrolled class past 40px and loses it when back on top', async () => {
    const fixture = await render();

    scrollTo(41);
    await fixture.whenStable();
    expect(fixture.nativeElement.classList).toContain('app-header--scrolled');

    scrollTo(0);
    await fixture.whenStable();
    expect(fixture.nativeElement.classList).not.toContain('app-header--scrolled');
  });

  it('stops listening once destroyed', async () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const fixture = await render();

    fixture.destroy();

    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
  });

  it('is accessible', async () => {
    const fixture = await render();

    await expect(fixture.nativeElement as HTMLElement).toBeAccessible();
  });
});
