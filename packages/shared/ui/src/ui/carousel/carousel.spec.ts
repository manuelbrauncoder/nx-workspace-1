import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiCarousel } from './carousel';

@Component({
  imports: [UiCarousel],
  template: `
    <app-ui-carousel
      [items]="items()"
      [label]="label()"
      [previousLabel]="previousLabel()"
      [nextLabel]="nextLabel()"
      [controls]="controls()"
    >
      <ng-template let-item let-index="index">
        <p class="slide">{{ index }}:{{ item }}</p>
      </ng-template>
    </app-ui-carousel>
  `,
})
class Host {
  readonly items = input<string[]>([]);
  readonly label = input('Screenshots von Kochwelt');
  readonly previousLabel = input<string>();
  readonly nextLabel = input<string>();
  readonly controls = input<'below' | 'overlay'>('below');
}

/** jsdom has none of these, embla needs them to start. They never report, so nothing scrolls. */
class IdleObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords(): [] {
    return [];
  }
}

describe('UiCarousel', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', IdleObserver);
    vi.stubGlobal('ResizeObserver', IdleObserver);
  });
  afterEach(() => vi.unstubAllGlobals());

  async function render(inputs: Partial<Record<keyof Host, unknown>>): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(Host);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('renders nothing for an empty list', async () => {
    const element = await render({ items: [] });

    expect(element.querySelector('.slide')).toBeNull();
    expect(element.querySelector('[role="region"]')).toBeNull();
  });

  it('shows a single item without region and buttons', async () => {
    const element = await render({ items: ['a'] });

    expect(element.querySelectorAll('.slide')).toHaveLength(1);
    expect(element.querySelector('.slide')?.textContent).toBe('0:a');
    expect(element.querySelector('[role="region"]')).toBeNull();
    expect(element.querySelector('button')).toBeNull();
  });

  it('names the region by the label', async () => {
    const element = await render({ items: ['a', 'b', 'c'] });

    const region = element.querySelector('[role="region"]')!;

    expect(region.getAttribute('aria-label')).toBe('Screenshots von Kochwelt');
    // translated, the helm components set the English words
    expect(region.getAttribute('aria-roledescription')).toBe('Karussell');
    const slide = element.querySelector('[aria-label="1 von 3"]')!;
    expect(slide.getAttribute('aria-roledescription')).toBe('Folie');
  });

  it('renders one labelled slide per item with its index', async () => {
    const element = await render({ items: ['a', 'b', 'c'] });

    const slides = Array.from(element.querySelectorAll('[aria-label$=" von 3"]'));

    expect(slides.map((slide) => slide.getAttribute('aria-label'))).toEqual([
      '1 von 3',
      '2 von 3',
      '3 von 3',
    ]);
    expect(slides.map((slide) => slide.querySelector('.slide')?.textContent)).toEqual([
      '0:a',
      '1:b',
      '2:c',
    ]);
  });

  it('names the buttons by the default texts', async () => {
    const element = await render({ items: ['a', 'b'] });

    const labels = Array.from(element.querySelectorAll('button'), (button) =>
      button.getAttribute('aria-label'),
    );

    expect(labels).toEqual(['Vorherige Folie', 'Nächste Folie']);
  });

  it('names the buttons by previousLabel and nextLabel', async () => {
    const element = await render({
      items: ['a', 'b'],
      previousLabel: 'Vorheriger Screenshot',
      nextLabel: 'Nächster Screenshot',
    });

    const labels = Array.from(element.querySelectorAll('button'), (button) =>
      button.getAttribute('aria-label'),
    );

    expect(labels).toEqual(['Vorheriger Screenshot', 'Nächster Screenshot']);
  });

  it('announces the position politely', async () => {
    const element = await render({ items: ['a', 'b', 'c'] });

    const position = element.querySelector('p[aria-live="polite"]')!;

    expect(position.textContent?.trim()).toBe('1 von 3');
  });

  it('is accessible', async () => {
    const element = await render({ items: ['a', 'b', 'c'] });

    await expect(element).toBeAccessible();
  });

  describe('with overlay controls', () => {
    it('puts the arrows over the slides, named by the default texts', async () => {
      const element = await render({ items: ['a', 'b', 'c'], controls: 'overlay' });

      const labels = Array.from(element.querySelectorAll('.ui-carousel__arrow'), (button) =>
        button.getAttribute('aria-label'),
      );

      expect(labels).toEqual(['Vorherige Folie', 'Nächste Folie']);
      expect(element.querySelector('.ui-carousel__controls')).toBeNull();
    });

    it('shows a hidden dash per slide and the counter, announced in words', async () => {
      const element = await render({ items: ['a', 'b', 'c'], controls: 'overlay' });

      const dashes = element.querySelector('.ui-carousel__dashes')!;
      expect(dashes.getAttribute('aria-hidden')).toBe('true');
      expect(dashes.querySelectorAll('.ui-carousel__dash')).toHaveLength(3);
      expect(dashes.querySelector('.ui-carousel__dash--current')).toBe(
        dashes.querySelector('.ui-carousel__dash'),
      );
      const counter = element.querySelector('p[aria-live="polite"]')!;
      expect(counter.querySelector('[aria-hidden="true"]')?.textContent?.trim()).toBe('1 / 3');
      expect(counter.querySelector('.sr-only')?.textContent?.trim()).toBe('1 von 3');
    });

    it('keeps a single item free of controls', async () => {
      const element = await render({ items: ['a'], controls: 'overlay' });

      expect(element.querySelector('button')).toBeNull();
      expect(element.querySelector('.ui-carousel__bar')).toBeNull();
    });

    it('is accessible', async () => {
      const element = await render({ items: ['a', 'b', 'c'], controls: 'overlay' });

      await expect(element).toBeAccessible();
    });
  });
});
