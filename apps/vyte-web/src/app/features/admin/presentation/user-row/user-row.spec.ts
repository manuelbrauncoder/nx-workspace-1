import { TestBed } from '@angular/core/testing';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { User } from '../../domain/admin';
import { userListI18n } from '../user-list/user-list.i18n';
import { UserRow } from './user-row';

const USER: User = {
  id: 'u2',
  email: 'ada@example.com',
  name: 'Ada Lovelace',
  role: 'user',
  createdAt: new Date('2026-11-01T09:00:00.000Z'),
};

describe('UserRow', () => {
  async function render(user: Partial<User> = {}, inputs: Record<string, unknown> = {}) {
    await loadI18nScopes(userListI18n);
    const fixture = TestBed.createComponent(UserRow);
    fixture.componentRef.setInput('user', { ...USER, ...user });
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  const badges = (element: HTMLElement) =>
    Array.from(element.querySelectorAll('[data-slot="badge"]'), (b) => b.textContent?.trim());
  const trigger = () =>
    document.querySelector<HTMLButtonElement>('button[aria-label^="Aktionen für"]');
  const items = () => Array.from(document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));

  it('shows the name as a heading, the email and since when', async () => {
    const { element } = await render();

    expect(element.querySelector('h3')?.textContent?.trim()).toBe('Ada Lovelace');
    expect(element.querySelector('.user-row__email')?.textContent?.trim()).toBe('ada@example.com');
    expect(element.querySelector('.user-row__meta')?.textContent).toContain('01.11.2026');
  });

  it('shows the email once, as the heading, without a name', async () => {
    const { element } = await render({ name: undefined });

    expect(element.querySelector('h3')?.textContent?.trim()).toBe('ada@example.com');
    expect(element.querySelector('.user-row__email')).toBeNull();
    expect(element.textContent?.match(/ada@example\.com/g)).toHaveLength(1);
  });

  it('shows a secondary Admin badge with the shield for an admin', async () => {
    const { element } = await render({ role: 'admin' });

    expect(badges(element)).toEqual(['Admin']);
    expect(element.querySelector('[data-slot="badge"]')!.classList.contains('bg-secondary')).toBe(
      true,
    );
    expect(element.querySelector('[data-slot="badge"] app-ui-icon')).not.toBeNull();
  });

  it('shows no role badge and no badge row for a normal account', async () => {
    const { element } = await render();

    expect(badges(element)).toEqual([]);
    expect(element.querySelector('.user-row__badges')).toBeNull();
    expect(element.textContent).not.toContain('Gastgeber');
  });

  it('shows only "Das bist du" for the signed-in normal account', async () => {
    const { element } = await render({}, { isMe: true });

    expect(badges(element)).toEqual(['Das bist du']);
  });

  it('marks the signed-in admin with "Das bist du" and hides the menu', async () => {
    const { element } = await render({ role: 'admin' }, { isMe: true });

    expect(badges(element)).toHaveLength(2);
    expect(badges(element)[1]).toBe('Das bist du');
    expect(element.querySelector('button')).toBeNull();
  });

  it('offers a menu named after the user for other accounts, named after the email without a name', async () => {
    const named = await render();
    expect(
      named.element.querySelector('button[aria-label="Aktionen für Ada Lovelace"]'),
    ).not.toBeNull();
    expect(badges(named.element)).toHaveLength(0);
    TestBed.resetTestingModule();

    const unnamed = await render({ name: undefined });
    expect(
      unnamed.element.querySelector('button[aria-label="Aktionen für ada@example.com"]'),
    ).not.toBeNull();
  });

  it('words the role item after the role', async () => {
    const user = await render();
    trigger()!.click();
    await user.fixture.whenStable();
    const userLabels = items().map((item) => item.textContent?.trim());
    expect(userLabels).toHaveLength(3);
    TestBed.resetTestingModule();
    document.body.querySelectorAll('.cdk-overlay-container *').forEach((n) => n.remove());

    const admin = await render({ role: 'admin' });
    trigger()!.click();
    await admin.fixture.whenStable();
    expect(items().map((item) => item.textContent?.trim())[0]).not.toBe(userLabels[0]);
  });

  it('emits toggleRole, revokeSessions and remove from the menu', async () => {
    const { fixture } = await render();
    const spies = { toggleRole: vi.fn(), revokeSessions: vi.fn(), remove: vi.fn() };
    fixture.componentInstance.toggleRole.subscribe(spies.toggleRole);
    fixture.componentInstance.revokeSessions.subscribe(spies.revokeSessions);
    fixture.componentInstance.remove.subscribe(spies.remove);

    for (const [index, spy] of [spies.toggleRole, spies.revokeSessions, spies.remove].entries()) {
      trigger()!.click();
      await fixture.whenStable();
      expect(items()).toHaveLength(3);
      items()[index].click();
      await fixture.whenStable();
      expect(spy).toHaveBeenCalledTimes(1);
    }
  });

  it('has no accessibility violations', async () => {
    const { element } = await render({ role: 'admin' }, {});
    await expect(element).toBeAccessible();
  });

  it('has no accessibility violations for the own account without a name', async () => {
    const { element } = await render({ name: undefined }, { isMe: true });
    await expect(element).toBeAccessible();
  });
});
