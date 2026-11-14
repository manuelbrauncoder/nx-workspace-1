import { TestBed } from '@angular/core/testing';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AccountInvite } from '../../domain/admin';
import { userListI18n } from '../user-list/user-list.i18n';
import { AccountInviteItem } from './account-invite-item';

const INVITE: AccountInvite = {
  id: 'i1',
  name: 'Grace',
  token: 'tok-1',
  expiresAt: new Date('2026-11-19T09:00:00.000Z'),
  createdAt: new Date('2026-11-12T09:00:00.000Z'),
};
const URL = 'https://vyte.example.com/welcome/tok-1';

describe('AccountInviteItem', () => {
  async function render() {
    await loadI18nScopes(userListI18n);
    const fixture = TestBed.createComponent(AccountInviteItem);
    fixture.componentRef.setInput('invite', INVITE);
    fixture.componentRef.setInput('url', URL);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('shows the name, the expiry and the address', async () => {
    const { element } = await render();

    expect(element.querySelector('h3')?.textContent?.trim()).toBe('Grace');
    expect(element.querySelector('.invite-row__meta')?.textContent).toContain('19.11.2026, 10:00');
    expect(element.querySelector('code')?.textContent?.trim()).toBe(URL);
  });

  it('marks the inner row with the id of the invite', async () => {
    const { element } = await render();

    expect(element.querySelector('div.invite-row')?.getAttribute('data-invite')).toBe('i1');
  });

  it('emits copyLink and revoke from named buttons', async () => {
    const { fixture, element } = await render();
    const copy = vi.fn();
    const revoke = vi.fn();
    fixture.componentInstance.copyLink.subscribe(copy);
    fixture.componentInstance.revoke.subscribe(revoke);

    element
      .querySelector<HTMLButtonElement>('button[aria-label="Kopieren: Link für Grace"]')!
      .click();
    element
      .querySelector<HTMLButtonElement>('button[aria-label="Widerrufen: Link für Grace"]')!
      .click();

    expect(copy).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations', async () => {
    const { element } = await render();

    await expect(element).toBeAccessible();
  });
});
