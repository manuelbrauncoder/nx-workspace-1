import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, idle } from '@core/state/async-state';
import { AuthStore } from '../../application/auth.store';
import { SignUp } from './sign-up';
import { signUpI18n } from './sign-up.i18n';

describe('SignUp', () => {
  const signUp = vi.fn();

  beforeEach(() => signUp.mockReset());

  async function render(mutationState: AsyncState = idle()) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthStore,
          useValue: { mutationState: signal(mutationState), signUp, resetMutation: vi.fn() },
        },
      ],
    });
    await loadI18nScopes(signUpI18n);
    const fixture = TestBed.createComponent(SignUp);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    return {
      element,
      name: element.querySelector<HTMLInputElement>('input[type="text"]')!,
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
    expect(password.getAttribute('autocomplete')).toBe('new-password');
  });

  it('tells the minimum length of the password up front', async () => {
    const { element } = await render();

    expect(element.textContent).toContain('Mindestens 8 Zeichen.');
  });

  it('rejects a password that is too short', async () => {
    const { element, email, password } = await render();
    type(email, 'ada@example.com');
    type(password, 'kurz');

    await submit(element);

    expect(signUp).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Das Passwort muss mindestens 8 Zeichen lang sein.');
  });

  it('creates the account without a name and goes to the start page', async () => {
    signUp.mockResolvedValue({ id: '1' });
    const { element, email, password } = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    type(email, 'ada@example.com');
    type(password, 'geheim12');

    await submit(element);

    expect(signUp).toHaveBeenCalledWith({
      name: '',
      email: 'ada@example.com',
      password: 'geheim12',
    });
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('passes the name on', async () => {
    signUp.mockResolvedValue(undefined);
    const { element, name, email, password } = await render();
    type(name, 'Ada');
    type(email, 'ada@example.com');
    type(password, 'geheim12');

    await submit(element);

    expect(signUp).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ada' }));
  });

  it('names an email address that is already registered', async () => {
    const { element } = await render(failed(new Failure('conflict', 'Email already in use')));

    const alert = element.querySelector('[role="alert"]')?.textContent;
    expect(alert).toContain('Registrierung fehlgeschlagen');
    expect(alert).toContain('Zu dieser E-Mail-Adresse gibt es schon ein Konto.');
  });
});
