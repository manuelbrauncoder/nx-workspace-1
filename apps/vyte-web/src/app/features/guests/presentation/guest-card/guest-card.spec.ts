import { TestBed } from '@angular/core/testing';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { Guest } from '../../domain/guest';
import { guestListI18n } from '../guest-list/guest-list.i18n';
import { GuestCard } from './guest-card';

const GUEST: Guest = {
  id: 'g1',
  name: 'Ada Lovelace',
  note: null,
  maxCompanions: 0,
  token: 'token-1',
  photoToken: 'photo-1',
  response: 'pending',
  companions: 0,
  companionsReduced: false,
  message: null,
  answeredBy: null,
  respondedAt: null,
  createdAt: new Date('2026-11-01T09:00:00.000Z'),
  updatedAt: new Date('2026-11-01T09:00:00.000Z'),
};

describe('GuestCard', () => {
  async function render(guest: Partial<Guest> = {}, inputs: Record<string, unknown> = {}) {
    await loadI18nScopes(guestListI18n);
    const fixture = TestBed.createComponent(GuestCard);
    fixture.componentRef.setInput('guest', { ...GUEST, ...guest });
    fixture.componentRef.setInput('timeZone', 'Europe/Berlin');
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const chip = () => element.querySelector('[data-response]')?.textContent?.trim();
    return { fixture, element, chip };
  }

  const button = (element: HTMLElement, label: string) =>
    element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

  it('shows the name as a heading', async () => {
    const { element } = await render();

    expect(element.querySelector('h3')?.textContent?.trim()).toBe('Ada Lovelace');
  });

  it.each([
    [{ response: 'pending' }, 'Keine Antwort'],
    [{ response: 'declined' }, 'Abgesagt'],
    [{ response: 'accepted', companions: 0 }, 'Kommt'],
    [{ response: 'accepted', companions: 1 }, 'Kommt mit 1 Begleitung'],
    [{ response: 'accepted', companions: 3 }, 'Kommt mit 3 Begleitungen'],
  ] as const)('shows the answer %j as "%s"', async (guest, text) => {
    const { chip } = await render(guest);

    expect(chip()).toBe(text);
  });

  it('marks the answer chip with the response', async () => {
    const { element } = await render({ response: 'declined' });

    expect(element.querySelector('[data-response="declined"]')).not.toBeNull();
  });

  it('shows no allowance without companions', async () => {
    const { element } = await render({ maxCompanions: 0 });

    expect(element.querySelector('.guest-card__chips .sr-only')).toBeNull();
  });

  it('shows the allowance as +n and says it in words for screen readers', async () => {
    const { element } = await render({ maxCompanions: 2 });

    expect(element.querySelector('.guest-card__chips [aria-hidden="true"]')?.textContent).toBe(
      '+2',
    );
    expect(element.querySelector('.guest-card__chips .sr-only')?.textContent).toBe(
      'Darf 2 Personen mitbringen',
    );
  });

  it('uses the singular for an allowance of one', async () => {
    const { element } = await render({ maxCompanions: 1 });

    expect(element.querySelector('.guest-card__chips .sr-only')?.textContent).toBe(
      'Darf 1 Person mitbringen',
    );
  });

  it('says when a host entered the answer and when the companions were reduced', async () => {
    const { element } = await render({
      response: 'accepted',
      answeredBy: 'host',
      companionsReduced: true,
    });

    expect(element.textContent).toContain('Vom Host eingetragen');
    expect(element.textContent).toContain('Begleitungen auf das neue Limit gekürzt');
  });

  it('shows neither when it does not apply', async () => {
    const { element } = await render({ answeredBy: 'guest' });

    expect(element.textContent).not.toContain('Vom Host eingetragen');
    expect(element.textContent).not.toContain('gekürzt');
  });

  it('shows the time of the answer in the zone of the event', async () => {
    const { element } = await render({
      response: 'accepted',
      respondedAt: new Date('2026-11-12T08:30:00.000Z'),
    });

    expect(element.textContent).toContain('Geantwortet am 12.11.2026, 09:30');
  });

  it('shows the message of the guest and the note of the hosts', async () => {
    const { element } = await render({ message: 'Ich bringe Kuchen', note: 'Kennt Ben' });

    expect(element.querySelector('blockquote')?.textContent).toBe('Ich bringe Kuchen');
    expect(element.querySelector('.guest-card__note')?.textContent).toBe('Kennt Ben');
    expect(element.textContent).toContain('Nachricht');
    expect(element.textContent).toContain('Notiz');
  });

  it('shows no message and no note when there are none', async () => {
    const { element } = await render();

    expect(element.querySelector('blockquote')).toBeNull();
    expect(element.querySelector('.guest-card__note')).toBeNull();
  });

  it('offers the menu and copying with the name of the guest', async () => {
    const { element } = await render();

    expect(button(element, 'Aktionen für Ada Lovelace')).not.toBeNull();
    expect(button(element, 'Link kopieren: Ada Lovelace')).not.toBeNull();
  });

  it('shows the share button only when the device can share', async () => {
    const without = await render();
    expect(button(without.element, 'Teilen: Link für Ada Lovelace')).toBeNull();

    TestBed.resetTestingModule();
    const withShare = await render({}, { canShare: true });
    expect(button(withShare.element, 'Teilen: Link für Ada Lovelace')).not.toBeNull();
  });

  it('hides the menu and the footer of a readonly card', async () => {
    const { element } = await render({ message: 'Hallo' }, { readonly: true, canShare: true });

    expect(element.querySelector('button')).toBeNull();
    expect(element.querySelector('.guest-card__footer')).toBeNull();
    expect(element.querySelector('h3')).not.toBeNull();
    expect(element.querySelector('blockquote')?.textContent).toBe('Hallo');
  });

  it('emits copy and share', async () => {
    const { fixture, element } = await render({}, { canShare: true });
    const copy = vi.fn();
    const share = vi.fn();
    fixture.componentInstance.copyLink.subscribe(copy);
    fixture.componentInstance.shareLink.subscribe(share);

    button(element, 'Link kopieren: Ada Lovelace')!.click();
    button(element, 'Teilen: Link für Ada Lovelace')!.click();

    expect(copy).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledTimes(1);
  });

  it('emits edit, answer, renew, renew photo and remove from the menu', async () => {
    const { fixture, element } = await render();
    const outputs = {
      edit: vi.fn(),
      answer: vi.fn(),
      renewLink: vi.fn(),
      renewPhotoLink: vi.fn(),
      remove: vi.fn(),
    };
    for (const [name, spy] of Object.entries(outputs)) {
      (
        fixture.componentInstance as unknown as Record<
          string,
          { subscribe: (fn: () => void) => void }
        >
      )[name]!.subscribe(spy);
    }

    const labels = [
      ['Bearbeiten', outputs.edit],
      ['Antwort eintragen', outputs.answer],
      ['Link erneuern', outputs.renewLink],
      ['Foto-Link erneuern', outputs.renewPhotoLink],
      ['Entfernen', outputs.remove],
    ] as const;
    for (const [label, spy] of labels) {
      button(element, 'Aktionen für Ada Lovelace')!.click();
      await fixture.whenStable();
      const item = Array.from(
        document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
      ).find((candidate) => candidate.textContent?.includes(label));
      expect(item, label).toBeDefined();
      item!.click();
      await fixture.whenStable();
      expect(spy, label).toHaveBeenCalledTimes(1);
    }
  });

  it('has no accessibility violations', async () => {
    const { element } = await render(
      {
        response: 'accepted',
        companions: 2,
        maxCompanions: 3,
        answeredBy: 'host',
        companionsReduced: true,
        respondedAt: new Date('2026-11-12T08:30:00.000Z'),
        message: 'Ich bringe Kuchen',
        note: 'Kennt Ben',
      },
      { canShare: true },
    );

    await expect(element).toBeAccessible();
  });

  it('has no accessibility violations when readonly', async () => {
    const { element } = await render({}, { readonly: true });

    await expect(element).toBeAccessible();
  });
});
