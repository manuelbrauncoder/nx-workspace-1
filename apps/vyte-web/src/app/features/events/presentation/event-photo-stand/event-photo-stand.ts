import { Component, inject } from '@angular/core';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { injectPageSeo } from '@core/seo/inject-page-seo';
import { AsyncContent } from '@shared/async-content/async-content';
import { UiText } from '@shared/ui/text/text';
import { EventsStore } from '../../application/events.store';
import { PhotoStandPanel } from '../photo-stand-panel/photo-stand-panel';

/**
 * The photo stand of one event, a tab below `EventFrame`. Store and use case come from the frame,
 * which loads the event once for all its tabs.
 */
@Component({
  selector: 'app-event-photo-stand',
  imports: [TranslatePipe, AsyncContent, UiText, PhotoStandPanel],
  styleUrl: './event-photo-stand.scss',
  templateUrl: './event-photo-stand.html',
})
export class EventPhotoStand {
  private readonly _store = inject(EventsStore);
  private readonly _i18n = inject(I18nService);

  constructor() {
    injectPageSeo(() => {
      const event = this._store.selected();
      return (
        event && { title: this._i18n.translate('eventPhotoStand.titleFor', { title: event.title }) }
      );
    });
  }
}
