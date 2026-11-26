import { computed, inject, Service, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { asyncState } from '@core/state/async-state';
import type { PreviewImage } from '../domain/save-the-date';
import { SaveTheDateUseCase } from '../domain/save-the-date.usecase';

/**
 * The announcement of `/save-the-date/:token`. Provided on that route only. A visitor has no
 * account, the token in the address is all the page knows.
 */
@Service({ autoProvided: false })
export class SaveTheDateStore {
  private readonly _useCase = inject(SaveTheDateUseCase);

  private readonly _token = signal<string | undefined>(undefined);
  private readonly _saveTheDate = rxResource({
    params: () => this._token(),
    stream: ({ params: token }) => this._useCase.getByToken(token),
  });

  // Reading `value()` of a failed resource throws, hence the `hasValue()` guard.
  readonly saveTheDate = computed(() =>
    this._saveTheDate.hasValue() ? this._saveTheDate.value() : undefined,
  );
  readonly saveTheDateState = asyncState(this._saveTheDate);

  select(token: string): void {
    this._token.set(token);
  }

  reload(): void {
    this._saveTheDate.reload();
  }

  /** Address of the cover. Only shown while the event has one (`cover` is set). */
  coverUrl(): string | undefined {
    const token = this._token();
    return token ? this._useCase.coverUrl(token) : undefined;
  }

  /** Preview image of the shared link; the page names it only while the event has a cover. */
  previewImage(): PreviewImage | undefined {
    const token = this._token();
    return token ? this._useCase.previewImage(token) : undefined;
  }

  calendarUrl(): string | undefined {
    const token = this._token();
    return token ? this._useCase.calendarUrl(token) : undefined;
  }
}
