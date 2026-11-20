import { Component, DOCUMENT, ElementRef, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { injectShellLayout } from '@core/layout/shell-layout';
import { filter, skip } from 'rxjs';
import { AppBackdrop } from '../app-backdrop/app-backdrop';
import { injectBackdrop } from '../app-backdrop/backdrop-route';
import { AppFooter } from '../app-footer/app-footer';
import { AppHeader } from '../app-header/app-header';

/**
 * Frame around every page: header, main area with the routed page and footer. The
 * public pages get the gradient backdrop behind it, see `withBackdrop()`.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, TranslatePipe, AppBackdrop, AppFooter, AppHeader],
  styleUrl: './app-shell.scss',
  templateUrl: './app-shell.html',
})
export class AppShell {
  private readonly _router = inject(Router);
  private readonly _document = inject(DOCUMENT);
  private readonly _main = viewChild.required<ElementRef<HTMLElement>>('main');
  private readonly _layout = injectShellLayout();
  private readonly _backdrop = injectBackdrop();

  constructor() {
    // Moves focus to the new page after each client-side navigation, so
    // keyboard and screen reader users start at its content. The initial navigation is skipped.
    this._router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        skip(1),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        // The router decides where the new page scrolls to, e.g. back to the restored position
        // or to the section of a fragment link.
        this._focusTarget(this._router.parseUrl(event.urlAfterRedirects).fragment);
      });
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
