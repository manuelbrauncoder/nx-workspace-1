import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, idle, loading, success } from '@core/state/async-state';
import { AuthStore } from '@features/auth/public-api';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { InviteStore } from '../../application/invite.store';
import { InvitePreview, VyteEvent } from '../../domain/invite';
import { InvitePage } from './invite-page';
import { invitePageI18n } from './invite-page.i18n';

const PREVIEW: InvitePreview = {
  eventTitle: 'Sommerfest',
  startsAt: new Date('2027-03-13T18:00:00.000Z'),
  allDay: false,
  timeZone: 'Europe/Berlin',
  ownerName: 'Olga',
};
const EVENT = { id: 'e9', title: 'Sommerfest' } as VyteEvent;

describe('InvitePage', () => {
  const store = { select: vi.fn(), reload: vi.fn(), accept: vi.fn(), signUp: vi.fn() };
  const toast = { success: vi.fn(), error: vi.fn() };
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(() => vi.resetAllMocks());

  interface Options {
    me?: { id: string; name?: string; email: string };
    preview?: InvitePreview;
    previewState?: AsyncState;
    mutationState?: AsyncState;
    token?: string;
  }

  async function render(options: Options = {}) {
    const preview = 'preview' in options ? options.preview : PREVIEW;
    const me = signal(options.me);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: InviteStore,
          useValue: {
            ...store,
            preview: signal(preview),
            previewState: signal(options.previewState ?? success()),
            mutationState: signal(options.mutationState ?? idle()),
          },
        },
        { provide: AuthStore, useValue: { me, isSignedIn: () => me() !== undefined } },
        { provide: UiToastService, useValue: toast },
      ],
    });
    await loadI18nScopes(invitePageI18n);
    const fixture = TestBed.createComponent(InvitePage);
    fixture.componentRef.setInput('token', options.token ?? 'tok');
    await fixture.whenStable();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    return { fixture, element: fixture.nativeElement as HTMLElement, navigate };
  }

  const ME = { id: 'u1', name: 'Ada', email: 'ada@example.com' };
  const buttonWith = (element: HTMLElement, text: string) =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((candidate) =>
      candidate.textContent?.includes(text),
    );

  function type(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function submit(element: HTMLElement): Promise<void> {
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
  }

  async function fill(element: HTMLElement, email: string, password: string, name = '') {
    type(element.querySelector<HTMLInputElement>('input[autocomplete="name"]')!, name);
    type(element.querySelector<HTMLInputElement>('input[type="email"]')!, email);
    type(element.querySelector<HTMLInputElement>('input[type="password"]')!, password);
    await settle();
  }

  it('selects the token of the route', async () => {
    await render();

    expect(store.select).toHaveBeenCalledWith('tok');
  });

  it('shows the event, who invites and when it takes place', async () => {
    const { element } = await render();

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Einladung zu Sommerfest');
    expect(element.querySelector('.invite-page__lead')?.textContent?.trim()).toBe(
      'Olga lädt dich ein, dieses Event mitzuplanen.',
    );
    expect(element.querySelector('time')?.getAttribute('datetime')).toBe(
      '2027-03-13T18:00:00.000Z',
    );
    expect(element.querySelector('time')?.textContent).toContain('2027');
  });

  it('shows a neutral lead when the owner has no name', async () => {
    const { element } = await render({ preview: { ...PREVIEW, ownerName: null } });

    expect(element.querySelector('.invite-page__lead')?.textContent?.trim()).toBe(
      'Du bist eingeladen, dieses Event mitzuplanen.',
    );
  });

  it('keeps its heading while loading', async () => {
    const { element } = await render({ preview: undefined, previewState: loading() });

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Einladung');
    expect(element.querySelector('form')).toBeNull();
  });

  it('offers a retry when the preview cannot be loaded', async () => {
    const { element } = await render({
      preview: undefined,
      previewState: failed(new Failure('network', 'Offline')),
    });

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Die Einladung konnte nicht geladen werden',
    );
    buttonWith(element, 'Erneut versuchen')!.click();

    expect(store.reload).toHaveBeenCalledTimes(1);
  });

  describe('of a link that is gone', () => {
    const gone = () => ({
      preview: undefined,
      previewState: failed(new Failure('not-found', 'Gone')),
    });

    it('says so in the heading and the lead, without an alert or a retry', async () => {
      const { element } = await render(gone());

      expect(element.querySelector('h1')?.textContent?.trim()).toBe('Einladung ungültig');
      expect(element.querySelector('.invite-page__lead')?.textContent).toContain(
        'Der Link ist abgelaufen, wurde schon benutzt oder zurückgezogen.',
      );
      expect(element.querySelector('app-failure-alert')).toBeNull();
      expect(element.querySelector('[role="alert"]')).toBeNull();
      expect(buttonWith(element, 'Erneut versuchen')).toBeUndefined();
      expect(element.querySelector('form')).toBeNull();
    });

    it('has no accessibility violations', async () => {
      const { element } = await render(gone());

      await expect(element).toBeAccessible();
    });
  });

  describe('signed in', () => {
    it('says who is signed in and offers to accept', async () => {
      const { element } = await render({ me: ME });

      expect(element.querySelector('.invite-page__signed-in')?.textContent?.trim()).toBe(
        'Angemeldet als Ada.',
      );
      expect(buttonWith(element, 'Einladung annehmen')).toBeDefined();
      expect(element.querySelector('form')).toBeNull();
      expect(element.querySelector('a[href^="/sign-in"]')).toBeNull();
    });

    it('names the user by the email without a name', async () => {
      const { element } = await render({ me: { id: 'u1', email: 'ada@example.com' } });

      expect(element.querySelector('.invite-page__signed-in')?.textContent?.trim()).toBe(
        'Angemeldet als ada@example.com.',
      );
    });

    it('accepts, says so and opens the event', async () => {
      store.accept.mockResolvedValue(EVENT);
      const { element, navigate } = await render({ me: ME });

      buttonWith(element, 'Einladung annehmen')!.click();
      await settle();

      expect(store.accept).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith('Du planst jetzt Sommerfest mit');
      expect(navigate).toHaveBeenCalledWith(['/events', 'e9']);
    });

    it('stays and says nothing when accepting fails', async () => {
      store.accept.mockResolvedValue(undefined);
      const { element, navigate } = await render({ me: ME });

      buttonWith(element, 'Einladung annehmen')!.click();
      await settle();

      expect(toast.success).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('blocks the button while accepting', async () => {
      const { element } = await render({ me: ME, mutationState: loading() });

      const button = buttonWith(element, 'Einladung annehmen')!;
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect(button.getAttribute('aria-busy')).toBe('true');
    });

    it('says that the team is full on a 409', async () => {
      const { element } = await render({
        me: ME,
        mutationState: failed(new Failure('conflict', 'Team is full')),
      });

      expect(element.querySelector('[role="alert"]')?.textContent).toContain(
        'Das Team ist voll. Frag beim Owner nach.',
      );
      expect(element.textContent).not.toContain('gibt es schon ein Konto');
    });

    it('says that the link went meanwhile on a 404', async () => {
      const { element } = await render({
        me: ME,
        mutationState: failed(new Failure('not-found', 'Gone')),
      });

      expect(element.querySelector('[role="alert"]')?.textContent).toContain(
        'Der Link ist abgelaufen, wurde schon benutzt oder zurückgezogen.',
      );
    });

    it('shows the standard text for other failures', async () => {
      const { element } = await render({
        me: ME,
        mutationState: failed(new Failure('server', 'Boom')),
      });

      expect(element.querySelector('[role="alert"]')?.textContent).toContain(
        'Das hat nicht geklappt',
      );
      expect(element.textContent).not.toContain('Das Team ist voll');
    });

    it('has no accessibility violations', async () => {
      const { element } = await render({ me: ME });

      await expect(element).toBeAccessible();
    });

    it('has no accessibility violations with the failure of a full team', async () => {
      const { element } = await render({
        me: ME,
        mutationState: failed(new Failure('conflict', 'Team is full')),
      });

      await expect(element).toBeAccessible();
    });
  });

  describe('signed out', () => {
    it('links to the sign-in with a way back to the invite', async () => {
      const { element } = await render();

      const link = element.querySelector<HTMLAnchorElement>('a[href^="/sign-in"]')!;
      expect(link.textContent?.trim()).toBe('Anmelden');
      expect(link.getAttribute('href')).toBe('/sign-in?returnUrl=%2Finvite%2Ftok');
    });

    it('encodes the token in the way back', async () => {
      const { element } = await render({ token: 'a b/c' });

      const href = element.querySelector<HTMLAnchorElement>('a[href^="/sign-in"]')!.href;
      const returnUrl = new URL(href).searchParams.get('returnUrl');
      expect(returnUrl).toBe('/invite/a%20b%2Fc');
    });

    it('offers the sign-up form and no accept button', async () => {
      const { element } = await render();

      expect(element.querySelector('form')).not.toBeNull();
      expect(buttonWith(element, 'Konto anlegen und mitplanen')).toBeDefined();
      expect(buttonWith(element, 'Einladung annehmen')).toBeUndefined();
      expect(element.textContent).not.toContain('Angemeldet als');
    });

    it('asks for the email and the password', async () => {
      const { element } = await render();

      await submit(element);

      expect(store.signUp).not.toHaveBeenCalled();
      expect(element.textContent).toContain('Bitte gib deine E-Mail-Adresse ein.');
      expect(element.textContent).toContain('Bitte gib ein Passwort ein.');
    });

    it('refuses an invalid email', async () => {
      const { element } = await render();

      await fill(element, 'not-an-email', 'secret-pass');
      await submit(element);

      expect(store.signUp).not.toHaveBeenCalled();
      expect(element.textContent).toContain('Bitte gib eine gültige E-Mail-Adresse ein.');
    });

    it('refuses a short password', async () => {
      const { element } = await render();

      await fill(element, 'ada@example.com', 'kurz');
      await submit(element);

      expect(store.signUp).not.toHaveBeenCalled();
      expect(element.textContent).toContain('Das Passwort muss mindestens 8 Zeichen lang sein.');
    });

    it('refuses a name that is too long', async () => {
      const { element } = await render();

      await fill(element, 'ada@example.com', 'secret-pass', 'x'.repeat(101));
      await submit(element);

      expect(store.signUp).not.toHaveBeenCalled();
      expect(element.textContent).toContain('Der Name darf höchstens 100 Zeichen lang sein.');
    });

    it('signs up without a name, says so and opens the event', async () => {
      store.signUp.mockResolvedValue(EVENT);
      const { element, navigate } = await render();

      await fill(element, 'ada@example.com', 'secret-pass');
      await submit(element);

      expect(store.signUp).toHaveBeenCalledWith({
        name: '',
        email: 'ada@example.com',
        password: 'secret-pass',
      });
      expect(toast.success).toHaveBeenCalledWith('Du planst jetzt Sommerfest mit');
      expect(navigate).toHaveBeenCalledWith(['/events', 'e9']);
    });

    it('sends the name when there is one', async () => {
      store.signUp.mockResolvedValue(EVENT);
      const { element } = await render();

      await fill(element, 'ada@example.com', 'secret-pass', 'Ada');
      await submit(element);

      expect(store.signUp).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ada' }));
    });

    it('stays when signing up fails', async () => {
      store.signUp.mockResolvedValue(undefined);
      const { element, navigate } = await render();

      await fill(element, 'ada@example.com', 'secret-pass');
      await submit(element);

      expect(toast.success).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('blocks the submit button while signing up', async () => {
      const { element } = await render({ mutationState: loading() });

      const button = buttonWith(element, 'Konto anlegen und mitplanen')!;
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect(button.getAttribute('aria-busy')).toBe('true');
    });

    it('says that the email has an account already on a 409', async () => {
      const { element } = await render({
        mutationState: failed(new Failure('conflict', 'Email taken')),
      });

      expect(element.querySelector('[role="alert"]')?.textContent).toContain(
        'Zu dieser E-Mail-Adresse gibt es schon ein Konto.',
      );
      expect(element.textContent).not.toContain('Das Team ist voll');
    });

    it('has no accessibility violations', async () => {
      const { element } = await render();

      await expect(element).toBeAccessible();
    });

    it('has no accessibility violations with validation errors', async () => {
      const { element } = await render();
      await submit(element);

      await expect(element).toBeAccessible();
    });

    it('has no accessibility violations with the failure of an existing email', async () => {
      const { element } = await render({
        mutationState: failed(new Failure('conflict', 'Email taken')),
      });

      await expect(element).toBeAccessible();
    });
  });
});
