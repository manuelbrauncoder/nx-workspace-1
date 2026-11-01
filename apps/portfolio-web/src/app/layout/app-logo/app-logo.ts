import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { SITE_OWNER } from '../../site-owner';

/**
 * The signpost logo as a link to the start page: a trail sign reading `</MB>`, next to it the
 * name and the job title. Shown in the header, the footer and the mobile drawer.
 */
@Component({
  selector: 'app-logo',
  imports: [RouterLink, TranslatePipe],
  styleUrl: './app-logo.scss',
  templateUrl: './app-logo.html',
})
export class AppLogo {
  private readonly _name = SITE_OWNER.name;
}
