import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocalDatePipe } from '@core/i18n/local-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiBadge } from '@shared/ui/badge/badge';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiText } from '@shared/ui/text/text';
import { VyteEvent } from '../../domain/event';
import { EventWhen } from '../event-when/event-when';

/**
 * An event as a row of the list: a small date block, the title as the link to it, time, place
 * and how many come. The date block is decoration, the full date stands next to it.
 */
@Component({
  selector: 'app-event-row',
  imports: [RouterLink, LocalDatePipe, TranslatePipe, UiBadge, UiIcon, EventWhen, UiText],
  styleUrl: './event-row.scss',
  templateUrl: './event-row.html',
})
export class EventRow {
  readonly event = input.required<VyteEvent>();
}
