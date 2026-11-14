import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '@core/config/app-config';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, idle, success } from '@core/state/async-state';
import { AuthStore } from '@features/auth/public-api';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { AdminStore } from '../../application/admin.store';
import { AccountInvite, User } from '../../domain/admin';
import { UserList } from './user-list';
import { userListI18n } from './user-list.i18n';

const ADMIN: User = {
  id: 'u1',
  email: 'admin@example.com',
  name: 'Admin',
  role: 'admin',
  createdAt: new Date('2026-11-01T09:00:00.000Z'),
};
const HOST: User = { ...ADMIN, id: 'u2', email: 'ada@example.com', name: 'Ada', role: 'user' };
const INVITE: AccountInvite = {
  id: 'i1',
  name: 'Grace',
  token: 'tok-1',
  expiresAt: new Date('2026-11-19T09:00:00.000Z'),
  createdAt: new Date('2026-11-12T09:00:00.000Z'),
};

describe('UserList', () => {
  const createInvite = vi.fn();
  const revokeInvite = vi.fn();
  const confirm = vi.fn();
  const toast = { success: vi.fn(), error: vi.fn() };
  const invites = signal<AccountInvite[]>([]);

  beforeEach(() => vi.resetAllMocks());

  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  async function render(
    options: { invites?: AccountInvite[]; createState?: AsyncState; userFailure?: Failure } = {},
  ) {
    invites.set(options.invites ?? [INVITE]);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AdminStore,
          useValue: {
            resetMutations: vi.fn(),
            createInvite,
            revokeInvite,
            invites,
            invitesState: signal(success()),
            users: signal([ADMIN, HOST]),
            usersState: signal(success()),
            createState: signal(options.createState ?? idle()),
            inviteMutationState: signal(idle()),
            userMutationState: signal(options.userFailure ? failed(options.userFailure) : idle()),
          },
        },
        { provide: AuthStore, useValue: { me: signal(ADMIN) } },
        { provide: AppConfigService, useValue: { siteUrl: 'https://vyte.example.com' } },
        { provide: UiConfirmDialogService, useValue: { confirm } },
        { provide: UiToastService, useValue: toast },
      ],
    });
    await loadI18nScopes(userListI18n);
    const fixture = TestBed.createComponent(UserList);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  async function submit(element: HTMLElement, name: string): Promise<void> {
    const input = element.querySelector<HTMLInputElement>('form input')!;
    input.value = name;
    input.dispatchEvent(new Event('input'));
    // Rendered after typing, as in a browser. Otherwise the reset to '' would look unchanged.
    await settle();
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
  }

  it('creates a link with the trimmed name and focuses it to copy it', async () => {
    const created = { ...INVITE, id: 'i2', name: 'Linus', token: 'tok-2' };
    createInvite.mockImplementation(async () => {
      invites.update((existing) => [created, ...existing]);
      return created;
    });
    const { element, fixture } = await render();

    await submit(element, ' Linus ');
    // Creating is async, the reset and the focus follow with the next render.
    await fixture.whenStable();

    expect(createInvite).toHaveBeenCalledWith('Linus');
    expect(toast.success).toHaveBeenCalledWith('Link für Linus erstellt');
    expect(element.querySelector<HTMLInputElement>('form input')?.value).toBe('');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Link kopieren für Linus');
  });

  it('creates no link without a name', async () => {
    const { element } = await render();

    await submit(element, '');

    expect(createInvite).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Bitte gib einen Namen ein.');
  });

  it('shows the address of an open link and copies it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { element } = await render();

    expect(element.textContent).toContain('https://vyte.example.com/welcome/tok-1');
    element
      .querySelector<HTMLButtonElement>('button[aria-label="Link kopieren für Grace"]')!
      .click();
    await settle();

    expect(writeText).toHaveBeenCalledWith('https://vyte.example.com/welcome/tok-1');
    expect(toast.success).toHaveBeenCalledWith('Link kopiert');
  });

  it('revokes a link only after confirmation', async () => {
    confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    revokeInvite.mockResolvedValue(true);
    const { element } = await render();
    const button = () =>
      element.querySelector<HTMLButtonElement>('button[aria-label="Link zurückziehen für Grace"]')!;

    button().click();
    await settle();
    expect(revokeInvite).not.toHaveBeenCalled();

    button().click();
    await settle();
    expect(revokeInvite).toHaveBeenCalledWith('i1');
    expect(toast.success).toHaveBeenCalledWith('Link für Grace zurückgezogen');
  });

  it('says when there are no open links', async () => {
    const { element } = await render({ invites: [] });

    expect(element.textContent).toContain('Keine offenen Links.');
  });

  it('offers no actions for the own account', async () => {
    const { element } = await render();

    expect(element.querySelector('button[aria-label="Aktionen für Admin"]')).toBeNull();
    expect(element.querySelector('button[aria-label="Aktionen für Ada"]')).not.toBeNull();
    expect(element.textContent).toContain('Das bist du');
  });

  it('lists users and open links as rows of calm lists, the create form in its panel', async () => {
    const { element } = await render();

    expect(element.querySelectorAll('ul[appUiList] > li[appUiListItem] app-user-row')).toHaveLength(
      2,
    );
    expect(
      element.querySelectorAll('ul[appUiList] > li[appUiListItem] app-account-invite-item'),
    ).toHaveLength(1);
    expect(element.querySelector('.user-list__panel form')).not.toBeNull();
  });

  it('explains a refused change of the own account', async () => {
    const { element } = await render({ userFailure: new Failure('conflict', 'Own account') });

    expect(element.textContent).toContain('Das eigene Konto lässt sich hier nicht ändern');
  });

  it('has no accessibility violations', async () => {
    const { element } = await render();

    await expect(element).toBeAccessible();
  });

  it('has no accessibility violations with a failure and without open links', async () => {
    const { element } = await render({
      invites: [],
      createState: failed(new Failure('server', 'Down')),
      userFailure: new Failure('conflict', 'Own account'),
    });

    await expect(element).toBeAccessible();
  });
});
