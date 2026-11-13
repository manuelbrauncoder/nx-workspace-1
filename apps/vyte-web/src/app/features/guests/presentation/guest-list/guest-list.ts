import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  numberAttribute,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { AppConfigService } from '@core/config/app-config';
import { I18nService } from '@core/i18n/i18n.service';
import { formatLocalDate } from '@core/i18n/local-date';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { injectPageSeo } from '@core/seo/inject-page-seo';
import { AsyncContent } from '@shared/async-content/async-content';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { FormText } from '@shared/form-controls/form-text/form-text';
import { UiAlert } from '@shared/ui/alert/alert';
import { UiBreadcrumb, UiBreadcrumbItem } from '@shared/ui/breadcrumb/breadcrumb';
import { UiButton } from '@shared/ui/button/button';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiDialogService } from '@shared/ui/dialog/dialog.service';
import { UiEmpty } from '@shared/ui/empty/empty';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiListImports } from '@shared/ui/list/list';
import { UiPagination } from '@shared/ui/pagination/pagination';
import { UiText } from '@shared/ui/text/text';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { UiToggleGroup, UiToggleGroupOption } from '@shared/ui/toggle-group/toggle-group';
import { GuestsStore } from '../../application/guests.store';
import { Guest } from '../../domain/guest';
import {
  clampPage,
  countPages,
  filterGuests,
  GUEST_PAGE_SIZE,
  GuestFilter,
  guestLinkUrl,
  GuestSort,
  pageOf,
  sortGuests,
  toGuestFilter,
  toGuestSort,
} from '../../domain/guest-list';
import { GuestFormDialog, GuestFormDialogData } from '../guest-form-dialog/guest-form-dialog';
import { GuestRow } from '../guest-row/guest-row';
import { GuestsBulkDialog, GuestsBulkDialogData } from '../guests-bulk-dialog/guests-bulk-dialog';
import { HostAnswerDialog, HostAnswerDialogData } from '../host-answer-dialog/host-answer-dialog';

/**
 * The guest list of an event on `/events/:id/guests`: the counts, adding one guest or a pasted
 * list, filter, sort and search, and a row per guest with their link, answer and changes, 25 to a
 * page. Page, filter and sort live in the address (`?page=2&filter=accepted&sort=answered`), so
 * the back button and a shared link keep them; the search stays on the page. A past event only
 * shows the list and its export.
 */
@Component({
  selector: 'app-guest-list',
  imports: [
    FormField,
    TranslatePipe,
    AsyncContent,
    FailureAlert,
    FormText,
    UiAlert,
    UiBreadcrumb,
    UiButton,
    UiEmpty,
    UiIcon,
    UiText,
    UiToggleGroup,
    UiListImports,
    UiPagination,
    GuestRow,
  ],
  styleUrl: './guest-list.scss',
  templateUrl: './guest-list.html',
})
export class GuestList {
  /** Route parameter, bound through `withComponentInputBinding()`. */
  readonly id = input.required<string>();
  /** Query parameters, bound the same way. Unknown values fall back to the defaults. */
  readonly page = input(1, { transform: (value: unknown) => numberAttribute(value, 1) });
  readonly filter = input<string>();
  readonly sort = input<string>();

  private readonly _store = inject(GuestsStore);
  private readonly _config = inject(AppConfigService);
  private readonly _i18n = inject(I18nService);
  private readonly _toast = inject(UiToastService);
  private readonly _dialog = inject(UiDialogService);
  private readonly _confirmDialog = inject(UiConfirmDialogService);
  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly _injector = inject(Injector);
  private readonly _router = inject(Router);

  private readonly _listHeading = viewChild<ElementRef<HTMLElement>>('listHeading');

  private readonly _filter = computed(() => toGuestFilter(this.filter()));
  private readonly _sort = computed(() => toGuestSort(this.sort()));
  private readonly _search = signal({ query: '' });
  private readonly _searchForm = form(this._search);

  /** Set in the browser only, the server cannot know whether the device shares. */
  private readonly _canShare = signal(false);

  private readonly _readonly = computed(() => this._store.event()?.past ?? false);

  private readonly _visible = computed(() =>
    sortGuests(
      filterGuests(this._store.guests(), this._filter(), this._search().query),
      this._sort(),
      this._i18n.locale(),
    ),
  );

  private readonly _pageCount = computed(() => countPages(this._visible().length));
  /** A page beyond the end, e.g. after removing the last guest on it, shows the last one. */
  private readonly _page = computed(() => clampPage(this.page(), this._pageCount()));
  private readonly _pageGuests = computed(() => pageOf(this._visible(), this._page()));

  /**
   * Computed, so the labels follow the language. Without counts: they stand above the list and
   * in the result line, and the four options have to fit side by side on a phone.
   */
  private readonly _filterOptions = computed((): UiToggleGroupOption<GuestFilter>[] =>
    (['all', 'accepted', 'declined', 'pending'] as const).map((value) => ({
      value,
      label: this._i18n.translate(`guestList.filter.${value}`),
    })),
  );

  private readonly _sortOptions = computed((): UiToggleGroupOption<GuestSort>[] => [
    { value: 'name', label: this._i18n.translate('guestList.sort.name') },
    { value: 'answered', label: this._i18n.translate('guestList.sort.answered') },
  ]);

  private readonly _exportUrl = computed(() => this._store.exportUrl(this._i18n.language()));

  private readonly _breadcrumb = computed((): UiBreadcrumbItem[] => {
    const event = this._store.event();
    return [
      { labelKey: 'events.breadcrumb', path: '/events' },
      event
        ? { label: event.title, path: `/events/${this.id()}` }
        : { labelKey: 'guestList.event', path: `/events/${this.id()}` },
      { labelKey: 'guestList.heading' },
    ];
  });

  constructor() {
    effect(() => this._store.select(this.id()));
    injectPageSeo(() => {
      const event = this._store.event();
      return event && { title: this._i18n.translate('guestList.titleFor', { title: event.title }) };
    });
    afterNextRender(() => this._canShare.set(typeof navigator.share === 'function'));
    // A new search starts on the first page. The search is not in the address, so the page is
    // replaced instead of adding a step to the history.
    let query = this._search().query;
    effect(() => {
      const next = this._search().query;
      if (next !== query) {
        query = next;
        untracked(() => this.page() > 1 && void this._navigate({ page: null }, true));
      }
    });
  }

  private _setFilter(filter: GuestFilter | null): void {
    void this._navigate({ filter: filter === 'all' || !filter ? null : filter, page: null });
  }

  private _setSort(sort: GuestSort | null): void {
    void this._navigate({ sort: sort === 'name' || !sort ? null : sort, page: null });
  }

  /**
   * Changes the query of the page. Without scrolling: the page stays where it is, and the app
   * shell keeps the focus on the control that changed it.
   */
  private _navigate(params: Record<string, string | number | null>, replaceUrl = false) {
    return this._router.navigate([], {
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl,
      scroll: 'manual',
    });
  }

  /**
   * After a change that may move the guest (a new name, an answer under a filter or a sort):
   * on the same page the dialog has given the focus back to their menu already. Otherwise the
   * focus follows them to their page, or goes to the list heading when a filter hides them.
   */
  private _followGuest(guest: Guest): void {
    if (this._pageGuests().some((shown) => shown.id === guest.id)) {
      return;
    }
    if (this._visible().some((visible) => visible.id === guest.id)) {
      void this._showGuest(guest);
    } else {
      this._focusLater('#guest-list-guests');
    }
  }

  /** Turns to the page that shows the guest, then moves the focus to their link button. */
  private async _showGuest(guest: Guest): Promise<void> {
    const index = this._visible().findIndex((visible) => visible.id === guest.id);
    if (index === -1) {
      return;
    }
    const page = Math.floor(index / GUEST_PAGE_SIZE) + 1;
    if (page !== this._page()) {
      await this._navigate({ page: page === 1 ? null : page });
    }
    this._focusLater(`[data-guest="${guest.id}"] .guest-row__copy`);
  }

  private _link(guest: Guest): string {
    return guestLinkUrl(this._config.siteUrl, guest.token);
  }

  private _add(): void {
    this._store.resetMutation();
    const ref = this._dialog.open<Guest, GuestFormDialogData>(GuestFormDialog, {
      data: { save: (draft) => this._store.create(draft), state: this._store.mutationState },
    });
    void ref.closed.then((guest) => {
      if (guest) {
        this._toast.success(this._i18n.translate('guestList.added', { name: guest.name }));
        // The link of the new guest is what the host wants next.
        void this._showGuest(guest);
      }
    });
  }

  private _addMany(): void {
    this._store.resetMutation();
    const ref = this._dialog.open<Guest[], GuestsBulkDialogData>(GuestsBulkDialog, {
      data: { save: (bulk) => this._store.createBulk(bulk), state: this._store.mutationState },
    });
    void ref.closed.then((guests) => {
      if (guests) {
        this._toast.success(this._i18n.translate('guestList.addedMany', { count: guests.length }));
      }
    });
  }

  private _edit(guest: Guest): void {
    this._store.resetMutation();
    const ref = this._dialog.open<Guest, GuestFormDialogData>(GuestFormDialog, {
      data: {
        guest,
        save: (draft) => this._store.update(guest.id, draft),
        state: this._store.mutationState,
      },
    });
    void ref.closed.then((saved) => {
      if (saved) {
        this._toast.success(this._i18n.translate('guestList.saved', { name: saved.name }));
        this._followGuest(saved);
      }
    });
  }

  private _answer(guest: Guest): void {
    this._store.resetMutation();
    const ref = this._dialog.open<Guest, HostAnswerDialogData>(HostAnswerDialog, {
      data: {
        guest,
        save: (answer) => this._store.setResponse(guest.id, answer),
        state: this._store.mutationState,
      },
    });
    void ref.closed.then((saved) => {
      if (saved) {
        this._toast.success(this._i18n.translate('guestList.answered', { name: saved.name }));
        this._followGuest(saved);
      }
    });
  }

  private async _renew(guest: Guest): Promise<void> {
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('guestList.renew.heading', { name: guest.name }),
      description: this._i18n.translate('guestList.renew.description'),
      confirmLabel: this._i18n.translate('guestList.renew.confirm'),
    });
    if (confirmed && (await this._store.renewToken(guest.id))) {
      this._toast.success(this._i18n.translate('guestList.renew.done', { name: guest.name }));
    }
  }

  private async _renewPhoto(guest: Guest): Promise<void> {
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('guestList.renewPhoto.heading', { name: guest.name }),
      description: this._i18n.translate('guestList.renewPhoto.description'),
      confirmLabel: this._i18n.translate('guestList.renewPhoto.confirm'),
    });
    if (confirmed && (await this._store.renewPhotoToken(guest.id))) {
      this._toast.success(this._i18n.translate('guestList.renewPhoto.done', { name: guest.name }));
    }
  }

  private async _remove(guest: Guest): Promise<void> {
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('guestList.remove.heading', { name: guest.name }),
      description: this._i18n.translate('guestList.remove.description'),
      confirmLabel: this._i18n.translate('guestList.remove.confirm'),
      variant: 'destructive',
    });
    if (confirmed && (await this._store.remove(guest.id))) {
      this._toast.success(this._i18n.translate('guestList.remove.done', { name: guest.name }));
      // The row that held the focus is gone.
      this._listHeading()?.nativeElement.focus();
    }
  }

  private async _copy(guest: Guest): Promise<void> {
    try {
      await navigator.clipboard.writeText(this._link(guest));
      this._toast.success(this._i18n.translate('guestList.copied', { name: guest.name }));
    } catch {
      this._toast.error(this._i18n.translate('guestList.copyFailed'));
    }
  }

  private async _share(guest: Guest): Promise<void> {
    const event = this._store.event();
    if (!event) {
      return;
    }
    const date = formatLocalDate(event.startsAt, this._i18n.locale(), 'date', event.timeZone);
    try {
      await navigator.share({
        title: event.title,
        text: this._i18n.translate('guestList.shareText', { title: event.title, date }),
        url: this._link(guest),
      });
    } catch (error) {
      // Closing the share sheet is no failure.
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        this._toast.error(this._i18n.translate('guestList.shareFailed'));
      }
    }
  }

  /** After the dialog is gone and has given the focus back. */
  private _focusLater(selector: string): void {
    afterNextRender(
      () =>
        setTimeout(() => this._host.nativeElement.querySelector<HTMLElement>(selector)?.focus()),
      { injector: this._injector },
    );
  }
}
