import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, idle } from '@core/state/async-state';
import { AuthStore } from '../../application/auth.store';
import { SignIn } from './sign-in';
import { signInI18n } from './sign-in.i18n';

describe('SignIn', () => {
  const signIn = vi.fn();
  const resetMutation = vi.fn();

  beforeEach(() => {
    signIn.mockReset();
    resetMutation.mockReset();
  });

  async function render(mutationState: AsyncState = idle(), returnUrl?: string) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthStore,
          useValue: { mutationState: signal(mutationState), signIn, resetMutation },
        },
      ],
    });
    await loadI18nScopes(signInI18n);
    const fixture = TestBed.createComponent(SignIn);
    fixture.componentRef.setInput('returnUrl', returnUrl);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    return {
      element,
      email: element.querySelector<HTMLInputElement>('input[type="email"]')!,
      password: element.querySelector<HTMLInputElement>('input[type="password"]')!,
    };
  }

  function type(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function submit(element: HTMLElement): Promise<void> {
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await TestBed.inject(ApplicationRef).whenStable();
  }

  it('lets a password manager recognize the fields', async () => {
    const { email, password } = await render();

    expect(email.getAttribute('autocomplete')).toBe('username');
    expect(password.getAttribute('autocomplete')).toBe('current-password');
  });

  it('drops the failure of an earlier attempt', async () => {
    await render();

    expect(resetMutation).toHaveBeenCalledOnce();
  });

  it('shows the errors and signs nobody in when the empty form is submitted', async () => {
    const { element } = await render();

    await submit(element);

    expect(signIn).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Bitte gib deine E-Mail-Adresse ein.');
    expect(element.textContent).toContain('Bitte gib dein Passwort ein.');
  });

  it('rejects an invalid email address', async () => {
    const { element, email, password } = await render();
    type(email, 'ada');
    type(password, 'geheim12');

    await submit(element);

    expect(signIn).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Bitte gib eine gültige E-Mail-Adresse ein.');
  });

  it('signs in and goes to the page the user came for', async () => {
    signIn.mockResolvedValue({ id: '1' });
    const { element, email, password } = await render(idle(), '/notes/1');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    type(email, 'ada@example.com');
    type(password, 'geheim12');

    await submit(element);

    expect(signIn).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'geheim12' });
    expect(navigate).toHaveBeenCalledWith('/notes/1');
  });

  it('goes to the start page when the return URL leaves the app', async () => {
    signIn.mockResolvedValue({ id: '1' });
    const { element, email, password } = await render(idle(), 'https://evil.example');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    type(email, 'ada@example.com');
    type(password, 'geheim12');

    await submit(element);

    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('stays on the page when signing in fails', async () => {
    signIn.mockResolvedValue(undefined);
    const { element, email, password } = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    type(email, 'ada@example.com');
    type(password, 'falsch');

    await submit(element);

    expect(navigate).not.toHaveBeenCalled();
  });

  it('names wrong credentials', async () => {
    const { element } = await render(failed(new Failure('unauthorized', 'Invalid credentials')));

    const alert = element.querySelector('[role="alert"]')?.textContent;
    expect(alert).toContain('Anmeldung fehlgeschlagen');
    expect(alert).toContain('E-Mail-Adresse oder Passwort ist falsch.');
  });

  it('shows the generic text for every other failure', async () => {
    const { element } = await render(failed(new Failure('too-many-requests', 'Too many')));

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Zu viele Versuche.');
  });
});
