import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_NAME } from '@core/app-name';

/** The wordmark as a link to the start page, shown in the header and in the mobile drawer. */
@Component({
  selector: 'app-logo',
  imports: [RouterLink],
  styleUrl: './app-logo.scss',
  templateUrl: './app-logo.html',
})
export class AppLogo {
  /** Written in lower case, the name of the app stays `Vyte` everywhere else. */
  private readonly _wordmark = inject(APP_NAME).toLowerCase();
}
