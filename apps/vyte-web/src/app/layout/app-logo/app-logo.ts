import { NgOptimizedImage } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_NAME } from '@core/app-name';

/**
 * The logo (the app icon next to the wordmark, `public/logo-full.svg`) as a link to the start
 * page, shown in the header and in the mobile drawer.
 */
@Component({
  selector: 'app-logo',
  imports: [NgOptimizedImage, RouterLink],
  styleUrl: './app-logo.scss',
  templateUrl: './app-logo.html',
})
export class AppLogo {
  /** The logo writes it in lower case, the name of the app stays `Vyte` for screen readers. */
  private readonly _appName = inject(APP_NAME);
}
