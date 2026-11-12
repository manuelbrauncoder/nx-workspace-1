import { Component, computed, effect, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { I18nService } from '@core/i18n/i18n.service';
import { LocalDatePipe } from '@core/i18n/local-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { injectPageSeo } from '@core/seo/inject-page-seo';
import { toMetaDescription } from '@core/seo/meta-description';
import { AsyncContent } from '@shared/async-content/async-content';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { UiAttachmentImports } from '@shared/ui/attachment/attachment';
import { UiBreadcrumb, UiBreadcrumbItem } from '@shared/ui/breadcrumb/breadcrumb';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiRichText } from '@shared/ui/rich-text/rich-text';
import { UiText } from '@shared/ui/text/text';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { EventsStore } from '../../application/events.store';
import { EventDeleteButton } from '../event-delete-button/event-delete-button';
import { EventWhen } from '../event-when/event-when';

/** The page of one event on `/events/:id`: when and where, the description, images and counts. */
@Component({
  selector: 'app-event-detail',
  imports: [
    RouterLink,
    LocalDatePipe,
    TranslatePipe,
    AsyncContent,
    FailureAlert,
    UiAttachmentImports,
    UiBreadcrumb,
    UiButton,
    UiIcon,
    UiRichText,
    UiText,
    EventDeleteButton,
    EventWhen,
  ],
  styleUrl: './event-detail.scss',
  templateUrl: './event-detail.html',
})
export class EventDetail {
  /** Route parameter, bound through `withComponentInputBinding()`. */
  readonly id = input.required<string>();

  private readonly _store = inject(EventsStore);
  private readonly _router = inject(Router);
  private readonly _toast = inject(UiToastService);
  private readonly _i18n = inject(I18nService);

  private readonly _breadcrumb = computed((): UiBreadcrumbItem[] => {
    const event = this._store.selected();
    return [
      { labelKey: 'events.breadcrumb', path: '/events' },
      event ? { label: event.title } : { labelKey: 'eventDetail.title' },
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
    effect(() => this._store.select(this.id()));
    injectPageSeo(() => {
      const event = this._store.selected();
      return event && { title: event.title, description: toMetaDescription(event.description) };
    });
  }

  private async _remove(): Promise<void> {
    if (await this._store.remove(this.id())) {
      this._toast.success(this._i18n.translate('events.deleted'));
      await this._router.navigate(['/events']);
    }
  }
}
