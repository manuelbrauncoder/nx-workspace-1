import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, idle, success } from '@core/state/async-state';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { AuthStore } from '../../application/auth.store';
import { WelcomeStore } from '../../application/welcome.store';
import { AccountInvitePreview } from '../../domain/me';
import { Welcome } from './welcome';
import { welcomeI18n } from './welcome.i18n';

describe('Welcome', () => {
  const select = vi.fn();
  const acceptAccountInvite = vi.fn();
  const resetMutation = vi.fn();
  const toast = { success: vi.fn() };

  beforeEach(() => vi.resetAllMocks());

  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  async function render(
    inviteState: AsyncState,
    invite?: AccountInvitePreview,
    mutationState: AsyncState = idle(),
  ) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: WelcomeStore,
          useValue: { select, invite: signal(invite), inviteState: signal(inviteState) },
        },
        {
          provide: AuthStore,
          useValue: { acceptAccountInvite, resetMutation, mutationState: signal(mutationState) },
        },
        { provide: UiToastService, useValue: toast },
      ],
    });
    await loadI18nScopes(welcomeI18n);
    const fixture = TestBed.createComponent(Welcome);
    fixture.componentRef.setInput('token', 'tok');
    await fixture.whenStable();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    return { element: fixture.nativeElement as HTMLElement, navigate };
  }

  function type(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('loads the link of the route', async () => {
    await render(idle());

    expect(select).toHaveBeenCalledWith('tok');
  });

  it('greets the person of the link and prefills the name', async () => {
    const { element } = await render(success(), { name: 'Ada' });

    expect(element.querySelector('h1')?.textContent).toContain('Willkommen, Ada');
    expect(element.querySelector<HTMLInputElement>('input[autocomplete="name"]')?.value).toBe(
      'Ada',
    );
  });

  it('says that a link is invalid', async () => {
    const { element } = await render(failed(new Failure('not-found', 'Gone')));

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Link ungültig');
    expect(element.querySelector('form')).toBeNull();
  });

  it('creates the account and opens the events', async () => {
    acceptAccountInvite.mockResolvedValue({ id: 'u1' });
    const { element, navigate } = await render(success(), { name: 'Ada' });

    type(element.querySelector('input[type="email"]')!, 'ada@example.com');
    type(element.querySelector('input[type="password"]')!, 'geheim123');
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();

    expect(acceptAccountInvite).toHaveBeenCalledWith('tok', {
      name: 'Ada',
      email: 'ada@example.com',
      password: 'geheim123',
    });
    expect(toast.success).toHaveBeenCalledWith('Dein Konto ist angelegt');
    expect(navigate).toHaveBeenCalledWith('/events');
  });

  it('refuses a password that is too short', async () => {
    const { element } = await render(success(), { name: 'Ada' });

    type(element.querySelector('input[type="email"]')!, 'ada@example.com');
    type(element.querySelector('input[type="password"]')!, 'kurz');
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();

    expect(acceptAccountInvite).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Das Passwort muss mindestens 8 Zeichen lang sein.');
  });

  it('says when the email has an account already', async () => {
    const { element } = await render(
      success(),
      { name: 'Ada' },
      failed(new Failure('conflict', 'Email taken')),
    );

    expect(element.textContent).toContain('Zu dieser E-Mail-Adresse gibt es schon ein Konto.');
  });

  it('has no accessibility violations', async () => {
    const { element } = await render(success(), { name: 'Ada' });

    await expect(element).toBeAccessible();
  });

  it('keeps its heading and says what to do when the link is invalid', async () => {
    const { element } = await render(failed(new Failure('not-found', 'Gone')));

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Willkommen');
    expect(element.textContent).toContain('Bitte frag nach einem neuen.');
    expect(element.querySelector('[role="alert"] button')).toBeNull();
    await expect(element).toBeAccessible();
  });

  it('offers a retry when the server cannot be reached', async () => {
    const { element } = await render(failed(new Failure('network', 'Offline')));

    expect(element.querySelector('[role="alert"] button')).not.toBeNull();
  });

  it('has no accessibility violations with the failure of an existing email', async () => {
    const { element } = await render(
      success(),
      { name: 'Ada' },
      failed(new Failure('conflict', 'Email taken')),
    );

    await expect(element).toBeAccessible();
  });
});
