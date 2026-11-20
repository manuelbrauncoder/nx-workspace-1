import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Reveal } from './reveal';

@Component({
  imports: [Reveal],
  template: `<p appReveal revealDelay="0.2">Text</p>`,
})
class Host {}

/** Remembers the callback, so a test can report the element as visible. */
class FakeObserver {
  static callback: IntersectionObserverCallback | undefined;
  observe = vi.fn();
  disconnect = vi.fn();
  constructor(callback: IntersectionObserverCallback) {
    FakeObserver.callback = callback;
  }
}

describe('Reveal', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    FakeObserver.callback = undefined;
  });

  function stubMotion(reduced: boolean): void {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: reduced })),
    );
    vi.stubGlobal('IntersectionObserver', FakeObserver);
  }

  async function render(top: number): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(Host);
    const paragraph: HTMLElement = fixture.nativeElement.querySelector('p');
    vi.spyOn(paragraph, 'getBoundingClientRect').mockReturnValue({ top } as DOMRect);
    await fixture.whenStable();
    return paragraph;
  }

  it('hides an element below the first screen and lets it rise once in view', async () => {
    stubMotion(false);
    const paragraph = await render(window.innerHeight + 100);

    expect(paragraph.style.opacity).toBe('0');

    FakeObserver.callback!(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    expect(paragraph.style.opacity).toBe('');
    expect(paragraph.style.transform).toBe('');
    expect(paragraph.style.transition).toContain('0.2s');
  });

  it('leaves an element on the first screen alone', async () => {
    stubMotion(false);
    const paragraph = await render(10);

    expect(paragraph.style.opacity).toBe('');
  });

  it('hides nothing with reduced motion', async () => {
    stubMotion(true);
    const paragraph = await render(window.innerHeight + 100);

    expect(paragraph.style.opacity).toBe('');
    expect(FakeObserver.callback).toBeUndefined();
  });
});
