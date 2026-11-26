import { Component, computed, effect, inject, input } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { UiBreadcrumb, UiBreadcrumbItem } from '@shared/ui/breadcrumb/breadcrumb';
import { UiButton } from '@shared/ui/button/button';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiMenuImports } from '@shared/ui/menu/menu';
import { UiTabNav, UiTabNavItem } from '@shared/ui/tab-nav/tab-nav';
import { UiText } from '@shared/ui/text/text';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { EventsStore } from '../../application/events.store';
import { EventsUseCase } from '../../domain/events.usecase';
import { EventWhen } from '../event-when/event-when';

/**
 * The frame of one event on `/events/:id` and its tabs: title, when and where, editing, printing
 * and deleting, and the tabs overview, guests, save the date, photo stand, photos and team. The page of the tab renders
 * below. Use case and store live as long as the frame, the overview shares them.
 */
@Component({
  selector: 'app-event-frame',
  imports: [
    RouterLink,
    RouterOutlet,
    TranslatePipe,
    FailureAlert,
    UiBreadcrumb,
    UiButton,
    UiIcon,
    UiMenuImports,
    UiTabNav,
    UiText,
    EventWhen,
  ],
  providers: [EventsUseCase, EventsStore],
  styleUrl: './event-frame.scss',
  templateUrl: './event-frame.html',
})
export class EventFrame {
  /** Route parameter, bound through `withComponentInputBinding()`. */
  readonly id = input.required<string>();

  private readonly _store = inject(EventsStore);
  private readonly _router = inject(Router);
  private readonly _toast = inject(UiToastService);
  private readonly _confirmDialog = inject(UiConfirmDialogService);
  private readonly _i18n = inject(I18nService);

  private readonly _breadcrumb = computed((): UiBreadcrumbItem[] => {
    const events: UiBreadcrumbItem = { labelKey: 'events.breadcrumb', path: '/events' };
    // The title is missing while the event loads, the trail is shorter until then.
    const title = this._store.selected()?.title;
    return title ? [events, { label: title }] : [events];
  });

  private readonly _tabs = computed((): UiTabNavItem[] => {
    const base = `/events/${this.id()}`;
    return [
      { labelKey: 'events.frame.overview', path: base, exact: true },
      { labelKey: 'events.frame.guests', path: `${base}/guests` },
      { labelKey: 'events.frame.saveTheDate', path: `${base}/save-the-date` },
      { labelKey: 'events.frame.photoStand', path: `${base}/photo-stand` },
      { labelKey: 'events.frame.photos', path: `${base}/photos` },
      { labelKey: 'events.frame.team', path: `${base}/team` },
    ];
  });

  constructor() {
    effect(() => this._store.select(this.id()));
  }

  private _print(): void {
    void this._router.navigate(['/events', this.id(), 'print']);
  }

  private async _remove(title: string): Promise<void> {
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('events.delete.heading'),
      description: this._i18n.translate('events.delete.description', { title }),
      confirmLabel: this._i18n.translate('events.delete.confirm'),
      variant: 'destructive',
    });
    if (confirmed && (await this._store.remove(this.id()))) {
      this._toast.success(this._i18n.translate('events.deleted'));
      await this._router.navigate(['/events']);
    }
  }
}
