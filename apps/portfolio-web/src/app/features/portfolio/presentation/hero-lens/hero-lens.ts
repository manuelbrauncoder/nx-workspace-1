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
const SMALL = { radius: 70, scale: 1.3 };
const LARGE = { radius: 104, scale: 1.4 };
/** Without pointer movement for this long, in ms, the sphere wanders on its own again. */
const IDLE_AFTER = 4500;
/** After the pointer leaves the headline, the sphere glides back faster for this long, in ms. */
const RETURN_FOR = 700;
/** The sphere fades in after the headline has arrived, in ms. */
const SHOW_AFTER = 1500;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A clear glass sphere that magnifies the hero headline. It follows the mouse only while the
 * pointer is over the headline. Once the pointer leaves it (towards the header, the buttons or
 * the side), the sphere glides back onto the headline and wanders across it by itself, as it
 * does without a mouse (on a phone) or after a while without movement. The magnified copy comes in
 * as content with `#copy` and must be hidden from assistive technology (`aria-hidden`), the
 * sphere itself is decorative.
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

    const pointer = { x: 0, y: 0, over: false, movedAt: -Infinity, leftAt: -Infinity };
    const sphere = { x: 0, y: 0, placed: false };
    let visible = true;
    let frame = 0;

    const step = (now: number): void => {
      frame = view.requestAnimationFrame(step);
      if (!visible) {
        return;
      }
      const following = pointer.over && now - pointer.movedAt < IDLE_AFTER;
      const [x, y] = following ? [pointer.x, pointer.y] : wander(now / 1000);
      if (!sphere.placed) {
        Object.assign(sphere, { x, y, placed: true });
      }
      // Right after the pointer left the headline the sphere hurries back, then it drifts slowly.
      const returning = now - pointer.leftAt < RETURN_FOR;
      const easing = following ? 0.16 : returning ? 0.12 : 0.05;
      sphere.x += (x - sphere.x) * easing;
      sphere.y += (y - sphere.y) * easing;
      place(sphere.x, sphere.y);
    };
    const leave = (): void => {
      if (pointer.over) {
        pointer.over = false;
        pointer.leftAt = view.performance.now();
      }
    };
    const onPointerMove = (event: PointerEvent): void => {
      // A finger scrolls the page, the sphere keeps wandering on a touch screen.
      if (event.pointerType === 'touch' || !visible) {
        return;
      }
      const s = stage.getBoundingClientRect();
      const x = event.clientX - s.left;
      const y = event.clientY - s.top;
      // Only the box of the headline counts, anywhere else the sphere stays on the text.
      const over =
        x >= text.x && x <= text.x + text.width && y >= text.y && y <= text.y + text.height;
      if (!over) {
        leave();
        return;
      }
      Object.assign(pointer, { x, y, over: true, movedAt: view.performance.now() });
    };
    const observer =
      'IntersectionObserver' in view
        ? new view.IntersectionObserver(([entry]) => (visible = entry.isIntersecting))
        : undefined;
    observer?.observe(stage);

    view.addEventListener('pointermove', onPointerMove, { passive: true });
    this._document.documentElement.addEventListener('pointerleave', leave);
    frame = view.requestAnimationFrame(step);

    return () => {
      view.clearTimeout(showTimer);
      view.cancelAnimationFrame(frame);
      observer?.disconnect();
      view.removeEventListener('resize', onResize);
      view.removeEventListener('pointermove', onPointerMove);
      this._document.documentElement.removeEventListener('pointerleave', leave);
    };
  }
}
