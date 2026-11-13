import {
  afterNextRender,
  Component,
  DOCUMENT,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { injectShellLayout } from '@core/layout/shell-layout';
import { filter } from 'rxjs';
import { AppDrawer } from '../app-drawer/app-drawer';
import { AppFooter } from '../app-footer/app-footer';
import { AppHeader } from '../app-header/app-header';

function pathOf(url: string): string {
  return url.split(/[?#]/)[0] ?? url;
}

/** Frame around every page: header, main area with the routed page, footer and mobile drawer. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, TranslatePipe, AppDrawer, AppFooter, AppHeader],
  styleUrl: './app-shell.scss',
  templateUrl: './app-shell.html',
})
export class AppShell {
  private readonly _router = inject(Router);
  private readonly _document = inject(DOCUMENT);
  private readonly _injector = inject(Injector);
  private readonly _drawerOpen = signal(false);
  private readonly _main = viewChild.required<ElementRef<HTMLElement>>('main');
  private readonly _layout = injectShellLayout();
  /** Path of the current page, without query and fragment. Unset until the first navigation. */
  private _path: string | undefined;

  constructor() {
    // Closes the drawer and moves focus to the new page after each client-side navigation, so
    // keyboard and screen reader users start at its content.
    this._router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this._drawerOpen.set(false);
        const url = event.urlAfterRedirects;
        const previous = this._path;
        this._path = pathOf(url);
        // The initial navigation keeps the focus where the browser put it.
        if (previous === undefined) {
          return;
        }
        const fragment = this._router.parseUrl(url).fragment;
        const samePage = this._path === previous;
        // Only the query changed (a filter, a sort): the page stays, so does the focus, e.g. on
        // the control that changed it. A page link with a fragment still moves it there.
        if (samePage && !fragment) {
          this._keepFocus();
          return;
        }
        // The router decides where the new page scrolls to, e.g. back to the restored position
        // or to the section of a fragment link.
        this._focusTarget(fragment);
      });
  }

  /**
   * Leaves the focus where it is, unless the new query removed its element (Back to another page
   * of a list): then the main area takes it, instead of the start of the document.
   */
  private _keepFocus(): void {
    afterNextRender(
      () => {
        const active = this._document.activeElement;
        if (!active || active === this._document.body || !active.isConnected) {
          this._focusMain({ preventScroll: true });
        }
      },
      { injector: this._injector },
    );
  }

  /** A plain `href="#main"` would resolve against the base href and leave the current page. */
  private _skipToMain(event: Event): void {
    event.preventDefault();
    this._focusMain();
  }

  /** Focuses the section of a fragment link if it can take focus, otherwise the main area. */
  private _focusTarget(fragment: string | null): void {
    const section = fragment ? this._document.getElementById(fragment) : null;
    if (section?.hasAttribute('tabindex')) {
      section.focus({ preventScroll: true });
    } else {
      this._focusMain({ preventScroll: true });
    }
  }

  private _focusMain(options?: FocusOptions): void {
    this._main().nativeElement.focus(options);
  }
}
