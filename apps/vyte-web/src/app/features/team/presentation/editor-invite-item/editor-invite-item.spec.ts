import { TestBed } from '@angular/core/testing';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { EditorInvite } from '../../domain/team';
import { teamPageI18n } from '../team-page/team-page.i18n';
import { EditorInviteItem } from './editor-invite-item';

const INVITE: EditorInvite = {
  id: 'i1',
  token: 'token-1',
  createdAt: new Date('2026-11-01T09:00:00.000Z'),
  expiresAt: new Date('2026-11-08T09:00:00.000Z'),
};
const URL = 'https://vyte.example.com/invite/token-1';

describe('EditorInviteItem', () => {
  async function render(inputs: Record<string, unknown> = {}) {
    await loadI18nScopes(teamPageI18n);
    const fixture = TestBed.createComponent(EditorInviteItem);
    fixture.componentRef.setInput('invite', INVITE);
    fixture.componentRef.setInput('url', URL);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    return { fixture, element };
  }

  const button = (element: HTMLElement, label: string) =>
    element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

  it('says when the link was made and until when it works', async () => {
    const { element } = await render();

    expect(element.querySelector('h3')?.textContent?.trim()).toBe('Link vom 01.11.2026, 10:00');
    expect(element.textContent).toContain('Gültig bis 08.11.2026, 10:00');
  });

  it('shows the address in a code element', async () => {
    const { element } = await render();

    expect(element.querySelector('code')?.textContent?.trim()).toBe(URL);
    expect(element.querySelector('.sr-only')?.textContent).toContain('Adresse des Links');
  });

  it('marks the item with the id of the invite', async () => {
    const { element } = await render();

    expect(element.getAttribute('data-invite')).toBe('i1');
  });

  it('names copy and revoke after the time the link was made', async () => {
    const { element } = await render();

    expect(button(element, 'Link kopieren, erstellt am 01.11.2026, 10:00')?.textContent).toContain(
      'Link kopieren',
    );
    expect(
      button(element, 'Link zurückziehen, erstellt am 01.11.2026, 10:00')?.textContent,
    ).toContain('Link zurückziehen');
  });

  it('offers sharing only when the device can share', async () => {
    const without = await render();
    expect(button(without.element, 'Teilen: Link vom 01.11.2026, 10:00')).toBeNull();

    TestBed.resetTestingModule();
    const withShare = await render({ canShare: true });
    expect(button(withShare.element, 'Teilen: Link vom 01.11.2026, 10:00')).not.toBeNull();
  });

  it('emits copyLink, shareLink and revoke', async () => {
    const { fixture, element } = await render({ canShare: true });
    const copy = vi.fn();
    const share = vi.fn();
    const revoke = vi.fn();
    fixture.componentInstance.copyLink.subscribe(copy);
    fixture.componentInstance.shareLink.subscribe(share);
    fixture.componentInstance.revoke.subscribe(revoke);

    button(element, 'Link kopieren, erstellt am 01.11.2026, 10:00')!.click();
    button(element, 'Teilen: Link vom 01.11.2026, 10:00')!.click();
    button(element, 'Link zurückziehen, erstellt am 01.11.2026, 10:00')!.click();

    expect(copy).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations', async () => {
    const { element } = await render({ canShare: true });

    await expect(element).toBeAccessible();
  });
});
