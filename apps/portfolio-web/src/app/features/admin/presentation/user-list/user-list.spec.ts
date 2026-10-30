import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, idle, success } from '@core/state/async-state';
import { AuthStore } from '@features/auth/public-api';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { AdminStore } from '../../application/admin.store';
import { User } from '../../domain/admin';
import { UserList } from './user-list';
import { userListI18n } from './user-list.i18n';

const USERS: User[] = [
  {
    id: '1',
    email: 'me@example.com',
    name: 'Manuel',
    role: 'admin',
    createdAt: new Date('2026-01-12T09:00:00.000Z'),
  },
  {
    id: '2',
    email: 'ada@example.com',
    name: undefined,
    role: 'user',
    createdAt: new Date('2026-02-03T09:00:00.000Z'),
  },
];

describe('UserList', () => {
  const store = {
    users: signal(USERS),
    usersState: signal(success()),
    userMutationState: signal<AsyncState>(idle()),
    reloadUsers: vi.fn(),
    resetMutations: vi.fn(),
    setRole: vi.fn(),
    revokeSessions: vi.fn(),
    deleteUser: vi.fn(),
  };
  const toast = { success: vi.fn(), error: vi.fn() };
  const confirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    store.userMutationState.set(idle());
  });

  async function render() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AdminStore, useValue: store },
        { provide: AuthStore, useValue: { me: signal({ ...USERS[0] }) } },
        { provide: UiToastService, useValue: toast },
        { provide: UiConfirmDialogService, useValue: { confirm } },
      ],
    });
    await loadI18nScopes(userListI18n);
    const fixture = TestBed.createComponent(UserList);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  /** Opens the actions menu of a user and picks the item with this text. */
  async function choose(element: HTMLElement, name: string, item: string): Promise<void> {
    element.querySelector<HTMLButtonElement>(`button[aria-label="Aktionen für ${name}"]`)!.click();
    await settle();
    const items = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[role="menu"] button[role="menuitem"]'),
    );
    items.find((button) => button.textContent?.includes(item))!.click();
    await settle();
  }

  it('shows every user, the email for a user without a name, and the role', async () => {
    const element = await render();

    const names = Array.from(element.querySelectorAll('app-user-card h2'), (heading) =>
      heading.textContent?.trim(),
    );

    expect(names).toEqual(['Manuel', 'ada@example.com']);
    expect(element.querySelectorAll('.user-card__role--admin')).toHaveLength(1);
  });

  it('marks the own account and offers no actions for it', async () => {
    const element = await render();

    const own = element.querySelectorAll('app-user-card')[0];

    expect(own.textContent).toContain('Das bist du');
    expect(own.querySelector('button')).toBeNull();
  });

  it('grants admin rights and confirms it', async () => {
    store.setRole.mockResolvedValue({ ...USERS[1], role: 'admin' });
    const element = await render();

    await choose(element, 'ada@example.com', 'Admin-Rechte geben');

    expect(store.setRole).toHaveBeenCalledWith('2', 'admin');
    expect(toast.success).toHaveBeenCalledWith(
      'ada@example.com hat jetzt Admin-Rechte. Das gilt ab der nächsten Anfrage.',
    );
  });

  it('deletes a user only after confirmation', async () => {
    confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    store.deleteUser.mockResolvedValue(true);
    const element = await render();

    await choose(element, 'ada@example.com', 'Konto löschen');
    expect(store.deleteUser).not.toHaveBeenCalled();

    await choose(element, 'ada@example.com', 'Konto löschen');
    expect(store.deleteUser).toHaveBeenCalledWith('2');
    expect(document.activeElement?.textContent?.trim()).toBe('Benutzer');
  });

  it('explains a refused change of the own account', async () => {
    store.userMutationState.set(failed(new Failure('conflict', 'Own account')));
    const element = await render();

    expect(element.querySelector('app-failure-alert')?.textContent).toContain(
      'Das eigene Konto lässt sich hier nicht ändern oder löschen.',
    );
  });
});
