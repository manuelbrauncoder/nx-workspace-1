import {
  afterNextRender,
  Component,
  contentChild,
  DestroyRef,
  DOCUMENT,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

/** Radius of the sphere in px and how much it magnifies, on a phone and from 640px up. */
const SMALL = { radius: 70, scale: 1.55 };
const LARGE = { radius: 104, scale: 1.7 };
/** Without pointer movement for this long, in ms, the sphere wanders on its own again. */
const IDLE_AFTER = 4500;
/** The sphere fades in after the headline has arrived, in ms. */
const SHOW_AFTER = 1500;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A glass sphere that magnifies the hero headline. It follows a mouse over the headline. Over the
 * header or the buttons it flies back to the nearest point of the headline instead of
 * vanishing. Without a mouse (on a phone) or after a while without movement it wanders across
 * the headline by itself. The magnified copy comes in as content with `#copy` and must be hidden
 * from assistive technology (`aria-hidden`), the sphere itself is decorative.
 *
 * Motion starts in the browser and only while the stage is on screen. With
 * `prefers-reduced-motion` the sphere rests on the headline.
 *
 * @example
 * <app-hero-lens [stage]="stage" [headline]="headline">
 *   <div #copy aria-hidden="true">...the same lines as the h1...</div>
 * </app-hero-lens>
 */
@Component({
  selector: 'app-hero-lens',
  styleUrl: './hero-lens.scss',
  templateUrl: './hero-lens.html',
  host: { 'aria-hidden': 'true', '[class.hero-lens--on]': '_on()' },
})
export class HeroLens {
  /** The area the sphere moves in, positioned, with the headline inside. */
  readonly stage = input.required<HTMLElement>();
  /** The real headline, its size and position decide where the copy goes. */
  readonly headline = input.required<HTMLElement>();

  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly _document = inject(DOCUMENT);
  private readonly _inner = viewChild.required<ElementRef<HTMLElement>>('inner');
  private readonly _copy = contentChild.required<string, ElementRef<HTMLElement>>('copy', {
    read: ElementRef,
  });
  private readonly _on = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => destroyRef.onDestroy(this._start()));
  }

  /** Starts the sphere and returns the cleanup. */
  private _start(): () => void {
    const view = this._document.defaultView;
    if (!view) {
      return () => undefined;
    }
    const lens = this._host.nativeElement;
    const inner = this._inner().nativeElement;
    const copy = this._copy().nativeElement;
    const stage = this.stage();
    const headline = this.headline();
    const reduced = view.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    let { radius, scale } = LARGE;
    let text: Box = { x: 0, y: 0, width: 0, height: 0 };

    // Measures stage and headline and puts the copy where the headline is, at the same size.
    const layout = (): void => {
      ({ radius, scale } = view.innerWidth < 640 ? SMALL : LARGE);
      lens.style.setProperty('--hero-lens-size', `${radius * 2}px`);
      const s = stage.getBoundingClientRect();
      const h = headline.getBoundingClientRect();
      text = { x: h.left - s.left, y: h.top - s.top, width: h.width, height: h.height };
      inner.style.width = `${s.width}px`;
      inner.style.height = `${s.height}px`;
      copy.style.left = `${text.x}px`;
      copy.style.top = `${text.y}px`;
      copy.style.width = `${text.width}px`;
      copy.style.fontSize = view.getComputedStyle(headline).fontSize;
    };
    // The centre of the sphere at (x, y) of the stage, the copy moves the other way, magnified.
    const place = (x: number, y: number): void => {
      lens.style.transform = `translate(${x - radius}px, ${y - radius}px)`;
      inner.style.transform = `translate(${radius - x * scale}px, ${radius - y * scale}px) scale(${scale})`;
    };
    // A slow figure across the headline for the idle sphere.
    const wander = (seconds: number): [number, number] => [
      text.x + text.width * (0.5 + 0.38 * Math.sin(seconds * 0.55)),
      text.y + text.height * (0.5 + 0.3 * Math.sin(seconds * 0.83 + 1.2)),
    ];

    layout();
    const showTimer = view.setTimeout(() => this._on.set(true), reduced ? 0 : SHOW_AFTER);
    const onResize = (): void => layout();
    view.addEventListener('resize', onResize, { passive: true });
    void this._document.fonts?.ready.then(layout);

    if (reduced) {
      place(text.x + text.width * 0.3, text.y + text.height * 0.35);
      return () => {
        view.clearTimeout(showTimer);
        view.removeEventListener('resize', onResize);
      };
    }

    const pointer = { x: 0, y: 0, active: false, outside: false, movedAt: -Infinity };
    const sphere = { x: 0, y: 0, placed: false };
    let visible = true;
    let frame = 0;

    const step = (now: number): void => {
      frame = view.requestAnimationFrame(step);
      if (!visible) {
        return;
      }
      const following = pointer.active && now - pointer.movedAt < IDLE_AFTER;
      let [x, y] = following ? [pointer.x, pointer.y] : wander(now / 1000);
      if (following && pointer.outside) {
        // Over the header, the buttons or the arrow: back to the nearest point of the headline.
        x = Math.min(Math.max(x, text.x), text.x + text.width);
        y = Math.min(Math.max(y, text.y + text.height * 0.15), text.y + text.height * 0.85);
      }
      if (!sphere.placed) {
        Object.assign(sphere, { x, y, placed: true });
      }
      const easing = following ? (pointer.outside ? 0.14 : 0.16) : 0.05;
      sphere.x += (x - sphere.x) * easing;
      sphere.y += (y - sphere.y) * easing;
      place(sphere.x, sphere.y);
    };
    const onPointerMove = (event: PointerEvent): void => {
      // A finger scrolls the page, the sphere keeps wandering on a touch screen.
      if (event.pointerType === 'touch' || !visible) {
        return;
      }
      const s = stage.getBoundingClientRect();
      pointer.x = event.clientX - s.left;
      pointer.y = event.clientY - s.top;
      pointer.outside = pointer.y < 0 || pointer.y > s.height - radius;
      pointer.active = true;
      pointer.movedAt = view.performance.now();
    };
    const onPointerLeave = (): void => {
      pointer.active = false;
    };
    const observer =
      'IntersectionObserver' in view
        ? new view.IntersectionObserver(([entry]) => (visible = entry.isIntersecting))
        : undefined;
    observer?.observe(stage);

    view.addEventListener('pointermove', onPointerMove, { passive: true });
    this._document.documentElement.addEventListener('pointerleave', onPointerLeave);
    frame = view.requestAnimationFrame(step);

    return () => {
      view.clearTimeout(showTimer);
      view.cancelAnimationFrame(frame);
      observer?.disconnect();
      view.removeEventListener('resize', onResize);
      view.removeEventListener('pointermove', onPointerMove);
      this._document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    };
  }
}
