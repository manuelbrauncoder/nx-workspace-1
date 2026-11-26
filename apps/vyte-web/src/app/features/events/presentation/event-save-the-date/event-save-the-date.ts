import { Component, inject } from '@angular/core';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { injectPageSeo } from '@core/seo/inject-page-seo';
import { AsyncContent } from '@shared/async-content/async-content';
import { UiText } from '@shared/ui/text/text';
import { EventsStore } from '../../application/events.store';
import { SaveTheDatePanel } from '../save-the-date-panel/save-the-date-panel';

/**
 * The save the date of one event, a tab below `EventFrame`. Store and use case come from the frame,
 * which loads the event once for all its tabs.
 */
@Component({
  selector: 'app-event-save-the-date',
  imports: [TranslatePipe, AsyncContent, UiText, SaveTheDatePanel],
  styleUrl: './event-save-the-date.scss',
  templateUrl: './event-save-the-date.html',
})
export class EventSaveTheDate {
  private readonly _store = inject(EventsStore);
  private readonly _i18n = inject(I18nService);

  constructor() {
    injectPageSeo(() => {
      const event = this._store.selected();
      return (
        event && {
          title: this._i18n.translate('eventSaveTheDate.titleFor', { title: event.title }),
        }
      );
    });
  }
}
