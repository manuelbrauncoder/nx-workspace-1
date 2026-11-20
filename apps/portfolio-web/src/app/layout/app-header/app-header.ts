import { ViewportScroller } from '@angular/common';
import {
  afterNextRender,
  Component,
  DestroyRef,
  DOCUMENT,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiNavMenu } from '@shared/ui/nav-menu/nav-menu';
import { AppLogo } from '../app-logo/app-logo';
import { APP_NAV_ITEMS } from '../app-nav-items';
import { AppSettingsMenu } from '../app-settings-menu/app-settings-menu';

/** Scroll distance in px after which the header gets its frosted background. */
const SCROLLED_AFTER = 40;

/**
 * The bar at the top: logo, the links to the sections of the start page and the settings menu.
 * Transparent over the top of the page, frosted once the page scrolls.
 */
@Component({
  selector: 'app-header',
  imports: [AppLogo, AppSettingsMenu, TranslatePipe, UiNavMenu],
  styleUrl: './app-header.scss',
  templateUrl: './app-header.html',
  host: { '[class.app-header--scrolled]': '_scrolled()' },
})
export class AppHeader {
  private readonly _items = APP_NAV_ITEMS;
  private readonly _scrolled = signal(false);

  constructor() {
    // The header sticks to the top, so a jump to a section stops below it instead of behind it.
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    inject(ViewportScroller).setOffset(() => [0, host.offsetHeight]);

    const view = inject(DOCUMENT).defaultView;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (!view) {
        return;
      }
      const update = (): void => this._scrolled.set(view.scrollY > SCROLLED_AFTER);
      update();
      view.addEventListener('scroll', update, { passive: true });
      destroyRef.onDestroy(() => view.removeEventListener('scroll', update));
    });
  }
}
