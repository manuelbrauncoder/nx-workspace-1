import {
  afterNextRender,
  DestroyRef,
  Directive,
  DOCUMENT,
  ElementRef,
  inject,
  input,
  numberAttribute,
} from '@angular/core';

const HIDDEN = { opacity: '0', transform: 'translateY(12px)' };
const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

/**
 * Lets an element rise into place the first time it scrolls into view. The server renders it
 * visible: only in the browser, and only below the first screen, does it start hidden. Without
 * JavaScript, with `prefers-reduced-motion` or above the fold nothing moves.
 *
 * @example
 * <li appReveal [revealDelay]="0.1">...</li>
 */
@Directive({ selector: '[appReveal]' })
export class Reveal {
  /** Seconds to wait once in view, to stagger the items of a list. */
  readonly revealDelay = input(0, { transform: numberAttribute });

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const view = inject(DOCUMENT).defaultView;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const reduced = view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;
      if (!view || reduced || !('IntersectionObserver' in view)) {
        return;
      }
      // Whatever is on the first screen is already seen, it stays where it is.
      if (element.getBoundingClientRect().top < view.innerHeight) {
        return;
      }
      Object.assign(element.style, HIDDEN);
      const show = (delay: number): void => {
        observer.disconnect();
        element.removeEventListener('focusin', onFocus);
        element.style.transition = `opacity 0.6s ${EASE} ${delay}s, transform 0.6s ${EASE} ${delay}s`;
        element.style.opacity = '';
        element.style.transform = '';
      };
      // The keyboard may get there first, e.g. tabbing to a link: then it shows at once.
      const onFocus = (): void => show(0);
      const observer = new view.IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            show(this.revealDelay());
          }
        },
        { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
      );
      observer.observe(element);
      element.addEventListener('focusin', onFocus);
      destroyRef.onDestroy(() => {
        observer.disconnect();
        element.removeEventListener('focusin', onFocus);
      });
    });
  }
}
