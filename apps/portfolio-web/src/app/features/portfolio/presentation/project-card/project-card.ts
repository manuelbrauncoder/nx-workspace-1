import { NgOptimizedImage } from '@angular/common';
import { booleanAttribute, Component, input } from '@angular/core';
import { LocalizedPipe } from '@core/i18n/localized.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiBadge } from '@shared/ui/badge/badge';
import { UiCarousel } from '@shared/ui/carousel/carousel';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiRichText } from '@shared/ui/rich-text/rich-text';
import { UiText } from '@shared/ui/text/text';
import { Project } from '../../domain/portfolio';

/**
 * One project: its screenshots, one at a time in a carousel with the arrows over the image, next
 * to name, description, stack and the links to try it. Its tags (e.g. "Work project") sit under
 * the name, each in its colour. A draft carries a badge; only the signed-in admin ever gets one.
 */
@Component({
  selector: 'app-project-card',
  imports: [
    NgOptimizedImage,
    LocalizedPipe,
    TranslatePipe,
    UiBadge,
    UiCarousel,
    UiIcon,
    UiRichText,
    UiText,
  ],
  styleUrl: './project-card.scss',
  templateUrl: './project-card.html',
  host: { '[class.project-card--reversed]': 'reversed()' },
})
export class ProjectCard {
  readonly project = input.required<Project>();
  /** Puts the screenshot on the right from `md` on, so the projects alternate down the page. */
  readonly reversed = input(false, { transform: booleanAttribute });
  /** Lets the browser load the cover screenshot early, it is the largest image on the page. */
  readonly priority = input(false, { transform: booleanAttribute });
}
