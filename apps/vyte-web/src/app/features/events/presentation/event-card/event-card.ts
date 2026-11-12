import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiCardImports } from '@shared/ui/card/card';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiText } from '@shared/ui/text/text';
import { VyteEvent } from '../../domain/event';
import { EventWhen } from '../event-when/event-when';

/** An event in the list: title as the link to it, time, place and how many come. */
@Component({
  selector: 'app-event-card',
  imports: [RouterLink, TranslatePipe, UiCardImports, UiIcon, UiText, EventWhen],
  styleUrl: './event-card.scss',
  templateUrl: './event-card.html',
})
export class EventCard {
  readonly event = input.required<VyteEvent>();
}
