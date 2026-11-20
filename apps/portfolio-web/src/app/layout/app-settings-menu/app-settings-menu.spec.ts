import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { I18nService } from '@core/i18n/i18n.service';
import { ThemeService } from '@core/theme/theme.service';
import { AuthStore } from '@features/auth/public-api';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { AppSettingsMenu } from './app-settings-menu';

interface TestMe {
  email: string;
  name?: string;
  role: 'user' | 'admin';
}

const USER: TestMe = { email: 'ada@example.com', name: 'Ada', role: 'user' };

describe('AppSettingsMenu', () => {
  const signOut = vi.fn();
  const toast = { success: vi.fn(), error: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.replaceChildren();
  });

  afterEach(() => vi.unstubAllGlobals());

  /** Pretends a screen below `md`, where the links move into the menu. */
  function stubPhoneWidth(): void {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query.includes('max-width'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  }

  async function openMenu(me: TestMe | undefined) {
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
    const fixture = TestBed.createComponent(AppSettingsMenu);
    await fixture.whenStable();
    const trigger = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    trigger.click();
    await fixture.whenStable();
    return { fixture, trigger, menu: document.querySelector<HTMLElement>('[role="menu"]')! };
  }

  const itemTexts = (menu: HTMLElement) =>
    Array.from(menu.querySelectorAll('[role^="menuitem"]')).map((item) => item.textContent?.trim());

  it('labels the settings button', async () => {
    const { trigger } = await openMenu(undefined);

    expect(trigger.getAttribute('aria-label')).toBe('Einstellungen');
  });

  it('leaves the links to the header on a wide screen', async () => {
    const { menu } = await openMenu(undefined);

    expect(menu.querySelector('[role="group"][aria-label="Hauptnavigation"]')).toBeNull();
  });

  it('puts the links to the sections first on a phone and opens a section', async () => {
    stubPhoneWidth();
    const { fixture, menu } = await openMenu(undefined);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const groups = Array.from(menu.querySelectorAll('app-ui-menu-group'));
    expect(groups.map((group) => group.getAttribute('aria-label'))).toEqual([
      'Hauptnavigation',
      'Sprache',
      'Farbschema',
    ]);
    expect(itemTexts(menu).slice(0, 4)).toEqual(['Über mich', 'Projekte', 'Skills', 'Kontakt']);

    menu.querySelector<HTMLElement>('[role="menuitem"]')!.click();
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/'], { fragment: 'about' });
  });

  it('passes the accessibility check with the links on a phone', async () => {
    stubPhoneWidth();
    const { menu } = await openMenu(USER);

    await expect(menu).toBeAccessible();
  });

  it('offers only language and theme when signed out', async () => {
    const { menu } = await openMenu(undefined);

    const groups = Array.from(menu.querySelectorAll('app-ui-menu-group'));
    expect(groups.map((group) => group.getAttribute('aria-label'))).toEqual([
      'Sprache',
      'Farbschema',
    ]);
    expect(itemTexts(menu)).toEqual(['Deutsch', 'English', 'Hell', 'Dunkel', 'System']);
    expect(menu.textContent).not.toContain('Abmelden');
    expect(menu.textContent).not.toContain('ada@');
  });

  it('shows the identity and the sign-out item for a user', async () => {
    const { menu } = await openMenu(USER);

    expect(menu.textContent).toContain('Ada');
    expect(menu.textContent).toContain('ada@example.com');
    expect(itemTexts(menu)).toContain('Abmelden');
    expect(menu.textContent).not.toContain('Administration');
  });

  it('shows the email once for a user without a name', async () => {
    const { menu } = await openMenu({ ...USER, name: undefined });

    expect(menu.textContent?.match(/ada@example\.com/g)).toHaveLength(1);
  });

  it('adds the admin item for an admin and opens /admin', async () => {
    const { fixture, menu } = await openMenu({ ...USER, role: 'admin' });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const admin = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]')).find((item) =>
      item.textContent?.includes('Administration'),
    )!;

    admin.click();
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith('/admin');
  });

  it('signs out and opens the sign-in page', async () => {
    signOut.mockResolvedValue(true);
    const { fixture, menu } = await openMenu(USER);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const item = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]')).find((i) =>
      i.textContent?.includes('Abmelden'),
    )!;

    item.click();
    await fixture.whenStable();

    expect(toast.success).toHaveBeenCalledWith('Du bist abgemeldet');
    expect(navigate).toHaveBeenCalledWith('/sign-in');
  });

  it('sets the language and follows it', async () => {
    const { menu } = await openMenu(undefined);
    const setLanguage = vi.spyOn(TestBed.inject(I18nService), 'setLanguage').mockResolvedValue();
    const radios = menu.querySelectorAll<HTMLElement>('[role="menuitemradio"]');
    expect(radios[0].getAttribute('aria-checked')).toBe('true');
    expect(radios[1].getAttribute('aria-checked')).toBe('false');

    radios[1].click();

    expect(setLanguage).toHaveBeenCalledWith('en');
  });

  it('sets the theme and follows it', async () => {
    const { fixture, menu } = await openMenu(undefined);
    const theme = TestBed.inject(ThemeService);
    theme.mode.set('light');
    await fixture.whenStable();
    const setMode = vi.spyOn(theme, 'setMode');
    const radios = () =>
      Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitemradio"]')).slice(2);
    expect(radios().map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);

    radios()[1].click();
    await fixture.whenStable();

    expect(setMode).toHaveBeenCalledWith('dark');
    expect(theme.mode()).toBe('dark');
  });

  it('passes the accessibility check while open', async () => {
    const { menu } = await openMenu({ ...USER, role: 'admin' });

    await expect(menu).toBeAccessible();
  });

  it('passes the accessibility check while open and signed out', async () => {
    const { menu } = await openMenu(undefined);

    await expect(menu).toBeAccessible();
  });

  it('names the menu and points the account group to who is signed in', async () => {
    const { menu } = await openMenu(USER);

    expect(menu.getAttribute('aria-label')).toBe('Einstellungen');
    const account = menu.querySelector('[role="group"][aria-label="Konto"]')!;
    const identity = document.getElementById(account.getAttribute('aria-describedby')!);
    expect(identity?.textContent).toContain(USER.email);
  });

  it('draws a solid focus ring on every item, radios included', async () => {
    const { menu } = await openMenu(USER);

    const items = Array.from(menu.querySelectorAll('[role="menuitem"], [role="menuitemradio"]'));
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.className).toContain('focus-visible:outline-ring');
    }
  });
});
