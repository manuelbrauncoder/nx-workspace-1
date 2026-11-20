import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HeroLens } from './hero-lens';

@Component({
  imports: [HeroLens],
  template: `
    <div #stage>
      <h1 #headline>Hallo</h1>
      <app-hero-lens [stage]="stage" [headline]="headline">
        <div #copy aria-hidden="true">Hallo</div>
      </app-hero-lens>
    </div>
  `,
})
class Host {}

describe('HeroLens', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
  });

  function stubReducedMotion(reduced: boolean): void {
    window.matchMedia = vi.fn(
      (query: string) => ({ matches: reduced, media: query }) as MediaQueryList,
    );
  }

  async function render() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function lens(fixture: { nativeElement: HTMLElement }): HTMLElement {
    return fixture.nativeElement.querySelector('app-hero-lens')!;
  }

  it('is hidden from assistive technology', async () => {
    stubReducedMotion(false);
    const fixture = await render();

    expect(lens(fixture).getAttribute('aria-hidden')).toBe('true');
  });

  it('fades in after the delay', async () => {
    stubReducedMotion(false);
    vi.useFakeTimers();
    window.setTimeout = globalThis.setTimeout;
    window.clearTimeout = globalThis.clearTimeout;
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    TestBed.tick();

    expect(lens(fixture).classList).not.toContain('hero-lens--on');

    vi.advanceTimersByTime(1499);
    fixture.detectChanges();
    expect(lens(fixture).classList).not.toContain('hero-lens--on');

    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(lens(fixture).classList).toContain('hero-lens--on');
  });

  it('shows at once with reduced motion', async () => {
    stubReducedMotion(true);
    vi.useFakeTimers();
    window.setTimeout = globalThis.setTimeout;
    window.clearTimeout = globalThis.clearTimeout;
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    TestBed.tick();

    vi.advanceTimersByTime(0);
    fixture.detectChanges();

    expect(lens(fixture).classList).toContain('hero-lens--on');
  });
});
