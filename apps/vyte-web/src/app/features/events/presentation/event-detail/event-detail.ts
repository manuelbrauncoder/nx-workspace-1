import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocalDatePipe } from '@core/i18n/local-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { injectPageSeo } from '@core/seo/inject-page-seo';
import { toMetaDescription } from '@core/seo/meta-description';
import { AsyncContent } from '@shared/async-content/async-content';
import { UiAttachmentImports } from '@shared/ui/attachment/attachment';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiRichText } from '@shared/ui/rich-text/rich-text';
import { UiText } from '@shared/ui/text/text';
import { EventsStore } from '../../application/events.store';
import { PhotoStandPanel } from '../photo-stand-panel/photo-stand-panel';
import { SaveTheDatePanel } from '../save-the-date-panel/save-the-date-panel';

/**
 * The overview of one event, the first tab below `EventFrame` on `/events/:id`: address and
 * deadline, the counts, description and images, and the public links (save the date, photo
 * stand). Title, date and the actions stand in the frame.
 */
@Component({
  selector: 'app-event-detail',
  imports: [
    RouterLink,
    LocalDatePipe,
    TranslatePipe,
    AsyncContent,
    UiAttachmentImports,
    UiIcon,
    UiRichText,
    UiText,
    PhotoStandPanel,
    SaveTheDatePanel,
  ],
  styleUrl: './event-detail.scss',
  templateUrl: './event-detail.html',
})
export class EventDetail {
  private readonly _store = inject(EventsStore);

  /** A search on OpenStreetMap. Nothing is loaded from there until the link is followed. */
  private readonly _mapUrl = computed(() => {
    const address = this._store.selected()?.address;
    return address
      ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`
      : undefined;
  });

  constructor() {
    // The frame selects the event, this page shares its store.
    injectPageSeo(() => {
      const event = this._store.selected();
      return event && { title: event.title, description: toMetaDescription(event.description) };
    });
  }
}
