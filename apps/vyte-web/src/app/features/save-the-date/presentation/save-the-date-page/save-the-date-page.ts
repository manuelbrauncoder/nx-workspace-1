import { NgOptimizedImage } from '@angular/common';
import { Component, computed, effect, inject, input } from '@angular/core';
import { injectResponseStatus } from '@core/http/response-status';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { injectPageSeo } from '@core/seo/inject-page-seo';
import { AsyncContent } from '@shared/async-content/async-content';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiText } from '@shared/ui/text/text';
import { SaveTheDateStore } from '../../application/save-the-date.store';
import { UpcomingSaveTheDate } from '../../domain/save-the-date';
import { saveTheDateTime } from '../../domain/save-the-date-time';

/**
 * The public page `/save-the-date/:token`: title, cover, date and the name of the place before
 * the invitations go out, with a calendar file. After the event only that it is over.
 */
@Component({
  selector: 'app-save-the-date-page',
  imports: [NgOptimizedImage, TranslatePipe, AsyncContent, UiButton, UiIcon, UiText],
  styleUrl: './save-the-date-page.scss',
  templateUrl: './save-the-date-page.html',
})
export class SaveTheDatePage {
  /** Route parameter, bound through `withComponentInputBinding()`. */
  readonly token = input.required<string>();

  private readonly _store = inject(SaveTheDateStore);
  private readonly _i18n = inject(I18nService);

  /** The announcement before the event, `undefined` while loading and after the event. */
  private readonly _upcoming = computed((): UpcomingSaveTheDate | undefined => {
    const saveTheDate = this._store.saveTheDate();
    return saveTheDate && !saveTheDate.past ? saveTheDate : undefined;
  });

  private readonly _time = computed(() => {
    const upcoming = this._upcoming();
    return upcoming && saveTheDateTime(upcoming, this._i18n.locale());
  });

  private readonly _cover = computed(() => {
    const cover = this._upcoming()?.cover;
    const url = this._store.coverUrl();
    return cover && url ? { ...cover, url } : undefined;
  });

  private readonly _calendarUrl = computed(() => this._store.calendarUrl());

  private readonly _setResponseStatus = injectResponseStatus();

  constructor() {
    effect(() => this._store.select(this.token()));
    // `app-async-content` would set it, but the page shows its own message for this case.
    effect(() => {
      if (this._store.saveTheDateState().failure?.kind === 'not-found') {
        this._setResponseStatus(404);
      }
    });
    injectPageSeo(() => {
      const saveTheDate = this._store.saveTheDate();
      return saveTheDate && { title: saveTheDate.title };
    });
  }
}
