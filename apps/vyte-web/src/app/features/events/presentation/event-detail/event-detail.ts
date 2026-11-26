import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '@core/i18n/i18n.service';
import { LocalDatePipe } from '@core/i18n/local-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { injectPageSeo } from '@core/seo/inject-page-seo';
import { toMetaDescription } from '@core/seo/meta-description';
import { AsyncContent } from '@shared/async-content/async-content';
import { UiAttachmentImports } from '@shared/ui/attachment/attachment';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiRichText } from '@shared/ui/rich-text/rich-text';
import { UiSeparator } from '@shared/ui/separator/separator';
import { UiStackedBar, UiStackedBarSegment } from '@shared/ui/stacked-bar/stacked-bar';
import { UiText } from '@shared/ui/text/text';
import { EventsStore } from '../../application/events.store';

/**
 * The overview of one event, the first tab below `EventFrame` on `/events/:id`: a quiet panel
 * "at a glance" with the counts, address, deadline and whether save the date and photo stand are
 * on (each with a link to its tab), next to it description and images. Title, date and the
 * actions stand in the frame.
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
    UiSeparator,
    UiStackedBar,
    UiText,
  ],
  styleUrl: './event-detail.scss',
  templateUrl: './event-detail.html',
})
export class EventDetail {
  private readonly _store = inject(EventsStore);
  private readonly _i18n = inject(I18nService);

  /** The guests by answer. Computed, so the labels follow the language. */
  private readonly _answers = computed((): UiStackedBarSegment[] => {
    const counts = this._store.selected()?.counts;
    if (!counts) {
      return [];
    }
    // `coming` counts people, the guests who accepted are what is left of the list.
    const accepted = counts.invited - counts.declined - counts.pending;
    return [
      {
        label: this._i18n.translate('eventDetail.guests.accepted'),
        value: accepted,
        color: 'var(--status-yes)',
      },
      {
        label: this._i18n.translate('eventDetail.guests.declined'),
        value: counts.declined,
        color: 'var(--status-no)',
      },
      {
        label: this._i18n.translate('eventDetail.guests.pending'),
        value: counts.pending,
        color: 'var(--status-open)',
      },
    ];
  });

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
