import { NgOptimizedImage } from '@angular/common';
import { booleanAttribute, Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '@core/i18n/i18n.service';
import { LocalDatePipe } from '@core/i18n/local-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiBadge } from '@shared/ui/badge/badge';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiMenuImports } from '@shared/ui/menu/menu';
import { UiText } from '@shared/ui/text/text';
import { APP_TIME_ZONE } from '../../../../time-zone';
import { Photo } from '../../domain/photo';

/**
 * One photo for the hosts: the picture (a click opens it large), who took it, how it came in and
 * when, and a menu to hide, show or delete it.
 */
@Component({
  selector: 'app-photo-card',
  imports: [
    NgOptimizedImage,
    LocalDatePipe,
    TranslatePipe,
    UiBadge,
    UiButton,
    UiIcon,
    UiMenuImports,
    UiText,
  ],
  styleUrl: './photo-card.scss',
  templateUrl: './photo-card.html',
  host: {
    '[attr.data-photo]': 'photo().id',
    '[class.photo-card--hidden]': 'photo().hidden',
  },
})
export class PhotoCard {
  readonly photo = input.required<Photo>();
  /** Address of the file. */
  readonly src = input.required<string>();
  /** The first photos of the page load at once, the rest when scrolled to. */
  readonly priority = input(false, { transform: booleanAttribute });
  /** Place in the list, starting at 1. Tells photos of the same person apart in button names. */
  readonly number = input.required<number>();
  /** Hiding or showing this photo is being saved. */
  readonly busy = input(false, { transform: booleanAttribute });

  readonly open = output<void>();
  readonly toggleHidden = output<void>();
  readonly remove = output<void>();

  private readonly _i18n = inject(I18nService);
  private readonly _timeZone = APP_TIME_ZONE;

  /** Who took it, for the texts and the names of the buttons. */
  private readonly _name = computed(
    () => this.photo().uploaderName ?? this._i18n.translate('photoList.card.noName'),
  );
}
