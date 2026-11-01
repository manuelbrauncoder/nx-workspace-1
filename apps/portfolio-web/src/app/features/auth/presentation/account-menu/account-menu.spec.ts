import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { AuthStore } from '../../application/auth.store';
import { Me } from '../../domain/me';
import { AccountMenu } from './account-menu';

const ME: Me = {
  id: '1',
  email: 'ada@example.com',
  name: 'Ada',
  role: 'user',
  createdAt: new Date('2026-01-12T09:00:00.000Z'),
};

describe('AccountMenu', () => {
  const signOut = vi.fn();
  const toast = { success: vi.fn(), error: vi.fn() };

  beforeEach(() => vi.clearAllMocks());

  async function render(me: Me | undefined) {
    const meSignal = signal(me);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthStore,
          useValue: {
            me: meSignal,
            isAdmin: computed(() => meSignal()?.role === 'admin'),
            signOut,
          },
        },
        { provide: UiToastService, useValue: toast },
      ],
    });
    const fixture = TestBed.createComponent(AccountMenu);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  async function openMenu(me: Me) {
    const rendered = await render(me);
    rendered.element.querySelector<HTMLButtonElement>('button[aria-label="Konto"]')!.click();
    await rendered.fixture.whenStable();
    return { ...rendered, menu: document.querySelector<HTMLElement>('[role="menu"]')! };
  }

  it('links to the sign-in page when nobody is signed in', async () => {
    const { element } = await render(undefined);

    const link = element.querySelector('a');
    expect(link?.textContent?.trim()).toBe('Anmelden');
    expect(link?.getAttribute('href')).toBe('/sign-in');
    expect(element.querySelector('button')).toBeNull();
  });

  it('renders nothing for a signed-out visitor without the sign-in link', async () => {
    const { fixture, element } = await render(undefined);

    fixture.componentRef.setInput('showSignIn', false);
    await fixture.whenStable();

    expect(element.querySelector('a, button')).toBeNull();
  });

  it('shows name and email of the signed-in user in the menu', async () => {
    const { menu } = await openMenu(ME);

    expect(menu.textContent).toContain('Ada');
    expect(menu.textContent).toContain('ada@example.com');
  });

  it('shows the email once for a user without a name', async () => {
    const { menu } = await openMenu({ ...ME, name: undefined });

    expect(menu.textContent?.match(/ada@example\.com/g)).toHaveLength(1);
  });

  it('keeps the admin area from a user without admin rights', async () => {
    const { menu } = await openMenu(ME);

    expect(menu.textContent).not.toContain('Administration');
  });

  it('opens the admin area for an admin', async () => {
    const { fixture, menu } = await openMenu({ ...ME, role: 'admin' });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const items = menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]');
    expect(items[0].textContent).toContain('Administration');

    items[0].click();
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith('/admin');
  });

  it('signs out, confirms it and opens the sign-in page', async () => {
    signOut.mockResolvedValue(true);
    const { fixture, menu } = await openMenu(ME);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    menu.querySelector<HTMLButtonElement>('button[role="menuitem"]')!.click();
    await fixture.whenStable();

    expect(signOut).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith('Du bist abgemeldet');
    expect(navigate).toHaveBeenCalledWith('/sign-in');
  });

  it('reports a failed sign-out and stays on the page', async () => {
    signOut.mockResolvedValue(false);
    const { fixture, menu } = await openMenu(ME);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');

    menu.querySelector<HTMLButtonElement>('button[role="menuitem"]')!.click();
    await fixture.whenStable();

    expect(toast.error).toHaveBeenCalledWith('Abmelden fehlgeschlagen');
    expect(navigate).not.toHaveBeenCalled();
  });
});
