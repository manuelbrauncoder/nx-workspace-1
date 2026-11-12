import { computed, inject, Service, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { asyncState } from '@core/state/async-state';
import { mutation } from '@core/state/mutation';
import { Invitation, RsvpAnswer } from '../domain/invitation';
import { RsvpUseCase } from '../domain/rsvp.usecase';

/**
 * The invitation of `/rsvp/:token` and the answer of the guest. Provided on that route only. The
 * guest has no account, the token in the address is all the page knows.
 */
@Service({ autoProvided: false })
export class RsvpStore {
  private readonly _useCase = inject(RsvpUseCase);

  private readonly _token = signal<string | undefined>(undefined);
  private readonly _invitation = rxResource({
    params: () => this._token(),
    stream: ({ params: token }) => this._useCase.getByToken(token),
  });
  private readonly _mutation = mutation();

  // Reading `value()` of a failed resource throws, hence the `hasValue()` guard.
  readonly invitation = computed(() =>
    this._invitation.hasValue() ? this._invitation.value() : undefined,
  );
  readonly invitationState = asyncState(this._invitation);
  /** State of the most recent answer. */
  readonly answerState = this._mutation.state;

  select(token: string): void {
    this._token.set(token);
    this._mutation.reset();
  }

  reload(): void {
    this._invitation.reload();
  }

  resetAnswer(): void {
    this._mutation.reset();
  }

  /** Saves the answer. The API answers with the whole invitation, which replaces the old one. */
  async answer(answer: RsvpAnswer): Promise<Invitation | undefined> {
    const token = this._token();
    if (!token) {
      return undefined;
    }
    const invitation = await this._mutation.run(this._useCase.answer(token, answer));
    if (invitation) {
      this._invitation.set(invitation);
    }
    return invitation;
  }

  imageUrl(imageId: string): string | undefined {
    const token = this._token();
    return token ? this._useCase.imageUrl(token, imageId) : undefined;
  }

  calendarUrl(): string | undefined {
    const token = this._token();
    return token ? this._useCase.calendarUrl(token) : undefined;
  }
}
