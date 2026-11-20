import {
  afterNextRender,
  Component,
  DestroyRef,
  DOCUMENT,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';

/** How fast the drift follows the scroll position per frame, between 0 and 1. */
const SCROLL_EASING = 0.07;
/** Largest shift of the blobs towards the pointer, in px. */
const PARALLAX_X = 36;
const PARALLAX_Y = 28;

/**
 * The animated gradient behind the public pages: four blurred colour blobs, a grain and a shade
 * that keeps text readable. The blobs drift slowly, wander across the page while it scrolls and
 * lean away from the pointer. Purely decorative. The server renders it still, motion starts in
 * the browser, and with `prefers-reduced-motion` the blobs stand still.
 *
 * @example
 * <app-backdrop />
 */
@Component({
  selector: 'app-backdrop',
  styleUrl: './app-backdrop.scss',
  templateUrl: './app-backdrop.html',
  host: { 'aria-hidden': 'true' },
})
export class AppBackdrop {
  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly _document = inject(DOCUMENT);
  private readonly _parallax = viewChild.required<ElementRef<HTMLElement>>('parallax');
  private readonly _blobs = [1, 2, 3, 4] as const;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => destroyRef.onDestroy(this._animate()));
  }

  /** Starts the motion and returns the cleanup. */
  private _animate(): () => void {
    const view = this._document.defaultView;
    if (!view) {
      return () => undefined;
    }
    const root = this._document.documentElement;
    const host = this._host.nativeElement;
    const reduced = view.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduced) {
      return () => undefined;
    }
    const progress = (): number => {
      const scrollable = root.scrollHeight - view.innerHeight;
      return scrollable > 0 ? Math.min(1, Math.max(0, view.scrollY / scrollable)) : 0;
    };
    const setScroll = (value: number): void => host.style.setProperty('--scroll', value.toFixed(4));

    let current = progress();
    let frame = 0;
    setScroll(current);

    // Eases towards the scroll position and stops once it got there, so an idle page costs nothing.
    const step = (): void => {
      const target = progress();
      current += (target - current) * SCROLL_EASING;
      if (Math.abs(target - current) < 0.0005) {
        current = target;
        frame = 0;
      } else {
        frame = view.requestAnimationFrame(step);
      }
      setScroll(current);
    };
    const onScroll = (): void => {
      if (!frame) {
        frame = view.requestAnimationFrame(step);
      }
    };
    const onPointerMove = (event: PointerEvent): void => {
      const x = (event.clientX / view.innerWidth - 0.5) * -PARALLAX_X;
      const y = (event.clientY / view.innerHeight - 0.5) * -PARALLAX_Y;
      this._parallax().nativeElement.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    };

    view.addEventListener('scroll', onScroll, { passive: true });
    view.addEventListener('resize', onScroll, { passive: true });
    view.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      view.removeEventListener('scroll', onScroll);
      view.removeEventListener('resize', onScroll);
      view.removeEventListener('pointermove', onPointerMove);
      if (frame) {
        view.cancelAnimationFrame(frame);
      }
    };
  }
}
