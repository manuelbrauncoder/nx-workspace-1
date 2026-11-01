import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { success } from '@core/state/async-state';
import { AsyncContent } from '@shared/async-content/async-content';
import { UiButton } from '@shared/ui/button/button';
import { UiCardImports } from '@shared/ui/card/card';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiText } from '@shared/ui/text/text';
import { AdminStore } from '../../application/admin.store';

/** Start of the admin area on `/admin`: users, messages and the editor of the start page. */
@Component({
  selector: 'app-admin-hub',
  imports: [RouterLink, TranslatePipe, AsyncContent, UiButton, UiCardImports, UiIcon, UiText],
  styleUrl: './admin-hub.scss',
  templateUrl: './admin-hub.html',
})
export class AdminHub {
  private readonly _store = inject(AdminStore);

  /** The counts need both lists. A failure of either one is shown, loading wins over success. */
  private readonly _state = computed(() => {
    const states = [this._store.usersState(), this._store.messagesState()];
    return (
      states.find((state) => state.loadingState === 'failure') ??
      states.find((state) => state.loadingState === 'loading') ??
      success()
    );
  });

  private _retry(): void {
    this._store.reloadUsers();
    this._store.reloadMessages();
  }
}
