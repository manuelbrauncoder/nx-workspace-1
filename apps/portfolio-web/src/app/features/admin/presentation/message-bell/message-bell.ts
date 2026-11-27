import { Component, computed, effect, inject, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { LocalDatePipe } from '@core/i18n/local-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiBadge } from '@shared/ui/badge/badge';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiMenu, UiMenuImports } from '@shared/ui/menu/menu';
import { filter } from 'rxjs';
import { InboxStore } from '../../application/inbox.store';
import { ReceivedMessage } from '../../domain/admin';

/** How many unread messages the menu lists, the rest is on the page of all messages. */
const LISTED = 5;

/**
 * The bell in the header, for an admin: how many messages of the contact form are unread, and a
 * menu with the newest of them. The list is loaded again after each navigation and when the menu
 * opens.
 */
@Component({
  selector: 'app-message-bell',
  imports: [LocalDatePipe, TranslatePipe, UiBadge, UiButton, UiIcon, UiMenuImports],
  styleUrl: './message-bell.scss',
  templateUrl: './message-bell.html',
})
export class MessageBell {
  private readonly _store = inject(InboxStore);
  private readonly _router = inject(Router);
  // Only there while the menu is open.
  private readonly _menu = viewChild(UiMenu);

  private readonly _listed = computed(() => this._store.unread().slice(0, LISTED));
  private readonly _badge = computed(() => {
    const count = this._store.unreadCount();
    return count > 9 ? '9+' : String(count);
  });

  constructor() {
    this._router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this._store.reload());
    // Not on the click of the trigger: the keyboard opens the menu without one.
    effect(() => {
      if (this._menu()) {
        untracked(() => this._store.reload());
      }
    });
  }

  /** Counts the message as read and shows it on the page of all messages. */
  private _open(message: ReceivedMessage): void {
    void this._store.setRead(message.id, true);
    this._openAll();
  }

  private _openAll(): void {
    void this._router.navigateByUrl('/admin/messages');
  }
}
