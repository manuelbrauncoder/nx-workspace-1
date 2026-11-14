import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { AsyncContent } from '@shared/async-content/async-content';
import { UiButton } from '@shared/ui/button/button';
import { UiEmpty } from '@shared/ui/empty/empty';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiListImports } from '@shared/ui/list/list';
import { UiText } from '@shared/ui/text/text';
import { EventsStore } from '../../application/events.store';
import { EventRow } from '../event-row/event-row';

/** The events of the signed-in user on `/events`, upcoming ones first. */
@Component({
  selector: 'app-events-list',
  imports: [
    RouterLink,
    TranslatePipe,
    AsyncContent,
    UiButton,
    UiEmpty,
    UiIcon,
    UiListImports,
    UiText,
    EventRow,
  ],
  styleUrl: './events-list.scss',
  templateUrl: './events-list.html',
})
export class EventsList {
  private readonly _store = inject(EventsStore);

  constructor() {
    this._store.loadList();
  }
}
