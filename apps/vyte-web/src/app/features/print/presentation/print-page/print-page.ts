import {
  afterNextRender,
  Component,
  computed,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  input,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AppConfigService } from '@core/config/app-config';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { injectPageSeo } from '@core/seo/inject-page-seo';
import { AsyncContent } from '@shared/async-content/async-content';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiQrCode } from '@shared/ui/qr-code/qr-code';
import { UiText } from '@shared/ui/text/text';
import { UiToggleGroup, UiToggleGroupOption } from '@shared/ui/toggle-group/toggle-group';
import { PrintStore } from '../../application/print.store';
import {
  guestPhotosUrl,
  PlaceCardGuests,
  placeCardGuests,
  standUrl,
  toSheets,
} from '../../domain/print-sheets';

/** What the page prints. */
type PrintKind = 'placeCards' | 'stand';

/**
 * The print page of an event on `/events/:id/print`, outside the app shell: place cards with the
 * QR code of each guest's photo link, or the card of the photo stand. On screen it shows the
 * choice and a preview of the sheets, in print only the sheets.
 */
@Component({
  selector: 'app-print-page',
  imports: [
    RouterLink,
    TranslatePipe,
    AsyncContent,
    FailureAlert,
    UiButton,
    UiIcon,
    UiQrCode,
    UiText,
    UiToggleGroup,
  ],
  styleUrl: './print-page.scss',
  templateUrl: './print-page.html',
})
export class PrintPage {
  /** Route parameter, bound through `withComponentInputBinding()`. */
  readonly id = input.required<string>();
  /** Query parameter: `?kind=stand` opens the card of the photo stand, e.g. from its panel. */
  readonly kind = input<string>();

  private readonly _store = inject(PrintStore);
  private readonly _config = inject(AppConfigService);
  private readonly _i18n = inject(I18nService);
  private readonly _document = inject(DOCUMENT);
  private readonly _router = inject(Router);

  private readonly _main = viewChild.required<ElementRef<HTMLElement>>('main');

  private readonly _kind = linkedSignal<PrintKind>(() =>
    this.kind() === 'stand' ? 'stand' : 'placeCards',
  );
  private readonly _which = signal<PlaceCardGuests>('all');

  private readonly _standUrl = computed(() => {
    const stand = this._store.event()?.photoStand;
    return stand ? standUrl(this._config.siteUrl, stand.token) : undefined;
  });

  /** Computed, so the labels follow the language. */
  private readonly _kinds = computed((): UiToggleGroupOption<PrintKind>[] => [
    { value: 'placeCards', label: this._i18n.translate('printPage.kinds.placeCards') },
    { value: 'stand', label: this._i18n.translate('printPage.kinds.stand') },
  ]);
  private readonly _whichOptions = computed((): UiToggleGroupOption<PlaceCardGuests>[] => [
    { value: 'all', label: this._i18n.translate('printPage.which.all') },
    { value: 'accepted', label: this._i18n.translate('printPage.which.accepted') },
  ]);

  /** The place cards, each with the address its QR code holds. */
  private readonly _cards = computed(() =>
    placeCardGuests(this._store.guests(), this._which(), this._i18n.locale()).map((guest) => ({
      id: guest.id,
      name: guest.name,
      url: guestPhotosUrl(this._config.siteUrl, guest.photoToken),
    })),
  );
  private readonly _sheets = computed(() => toSheets(this._cards()));

  /** The one line that tells what will be printed, in a single live region for both kinds. */
  private readonly _summary = computed(() => {
    const t = this._i18n;
    if (this._kind() === 'stand') {
      return t.translate(this._standUrl() ? 'printPage.standSummary' : 'printPage.standOff');
    }
    const state = this._store.guestsState().loadingState;
    if (state === 'loading' || state === 'idle') {
      return t.translate('printPage.loadingGuests');
    }
    if (state === 'failure') {
      return '';
    }
    const cards = this._cards().length;
    if (cards === 0) {
      return t.translate(
        this._which() === 'accepted' ? 'printPage.noneAccepted' : 'printPage.noGuests',
      );
    }
    const sheets = this._sheets().length;
    return (
      t.translate(cards === 1 ? 'printPage.summaryOne' : 'printPage.summary', {
        cards,
        sheets,
      }) +
      ' ' +
      t.translate(sheets === 1 ? 'printPage.sheetsOne' : 'printPage.sheets', { sheets })
    );
  });

  constructor() {
    effect(() => this._store.select(this.id()));
    // Outside the app shell nobody moves the focus after a navigation: the link that held it is
    // gone. Not on the first load, there the browser starts at the top anyway.
    afterNextRender(() => {
      if (this._router.lastSuccessfulNavigation()?.previousNavigation) {
        this._main().nativeElement.focus({ preventScroll: true });
      }
    });
    injectPageSeo(() => {
      const event = this._store.event();
      return event && { title: this._i18n.translate('printPage.titleFor', { title: event.title }) };
    });
  }

  /** Opens the print dialog of the browser. The sheets follow the print styles of the page. */
  private _print(): void {
    this._document.defaultView?.print();
  }
}
