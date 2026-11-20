import { booleanAttribute, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { SITE_OWNER } from '../../site-owner';

/**
 * The logo as a link to the start page: an amber tile with a code sign `</>`, next to it the name
 * and the job title. Shown in the header and the footer, the tile is the favicon too.
 */
@Component({
  selector: 'app-logo',
  imports: [RouterLink, TranslatePipe],
  styleUrl: './app-logo.scss',
  templateUrl: './app-logo.html',
  host: { '[class.app-logo--sign-on-tablet]': 'signOnTablet()' },
})
export class AppLogo {
  /**
   * Shows only the tile between `md` and `lg`, where the header needs the room for its links.
   * The link keeps its name for screen readers.
   */
  readonly signOnTablet = input(false, { transform: booleanAttribute });

  private readonly _name = SITE_OWNER.name;
}
