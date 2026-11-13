import { TestBed } from '@angular/core/testing';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { Guest } from '../../domain/guest';
import { guestListI18n } from '../guest-list/guest-list.i18n';
import { GuestRow } from './guest-row';

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

describe('GuestRow', () => {
  async function render(guest: Partial<Guest> = {}, inputs: Record<string, unknown> = {}) {
    await loadI18nScopes(guestListI18n);
    const fixture = TestBed.createComponent(GuestRow);
    fixture.componentRef.setInput('guest', { ...GUEST, ...guest });
    fixture.componentRef.setInput('timeZone', 'Europe/Berlin');
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const status = () => element.querySelector('[data-response]')?.textContent?.trim();
    return { fixture, element, status };
  }

  const button = (element: HTMLElement, label: string) =>
    element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  const allowance = (element: HTMLElement) => element.querySelector('.guest-row__allowance')!;

  it('shows the name as a heading and marks the host element with the guest', async () => {
    const { element } = await render();

    expect(element.querySelector('h3')?.textContent?.trim()).toBe('Ada Lovelace');
    expect(element.getAttribute('data-guest')).toBe('g1');
  });

  it.each([
    [{ response: 'pending' }, 'Keine Antwort'],
    [{ response: 'declined' }, 'Abgesagt'],
    [{ response: 'accepted', companions: 0 }, 'Kommt'],
    [{ response: 'accepted', companions: 1 }, 'Kommt mit 1 Begleitung'],
    [{ response: 'accepted', companions: 2 }, 'Kommt mit 2 Begleitungen'],
    [{ response: 'accepted', companions: 3 }, 'Kommt mit 3 Begleitungen'],
  ] as const)('shows the answer %j as "%s"', async (guest, text) => {
    const { status } = await render(guest);

    expect(status()).toBe(text);
  });

  it.each(['pending', 'declined', 'accepted'] as const)(
    'marks the status with the response %s',
    async (response) => {
      const { element } = await render({ response });

      expect(element.querySelector(`[data-response="${response}"]`)).not.toBeNull();
    },
  );

  it('says "Ohne Begleitung" visibly when no companion is allowed', async () => {
    const { element } = await render({ maxCompanions: 0 });

    expect(allowance(element).textContent?.trim()).toBe('Ohne Begleitung');
    expect(allowance(element).querySelector('.sr-only')).toBeNull();
    expect(allowance(element).querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('shows "bis +1" and says it in words for screen readers', async () => {
    const { element } = await render({ maxCompanions: 1 });

    expect(allowance(element).querySelector('[aria-hidden="true"]')?.textContent?.trim()).toBe(
      'bis +1',
    );
    expect(allowance(element).querySelector('.sr-only')?.textContent).toBe(
      'Darf 1 Person mitbringen',
    );
  });

  it('shows "bis +n" and uses the plural for more', async () => {
    const { element } = await render({ maxCompanions: 3 });

    expect(allowance(element).querySelector('[aria-hidden="true"]')?.textContent?.trim()).toBe(
      'bis +3',
    );
    expect(allowance(element).querySelector('.sr-only')?.textContent).toBe(
      'Darf 3 Personen mitbringen',
    );
  });

  it('shows no details for a guest without an answer, message and note', async () => {
    const { element } = await render();

    expect(element.querySelector('.guest-row__details')).toBeNull();
  });

  it('shows the details for each reason alone', async () => {
    for (const guest of [
      { respondedAt: new Date('2026-11-12T08:30:00.000Z') },
      { answeredBy: 'host' as const },
      { companionsReduced: true },
      { message: 'Hallo' },
      { note: 'Kennt Ben' },
    ]) {
      TestBed.resetTestingModule();
      const { element } = await render(guest);

      expect(element.querySelector('.guest-row__details'), JSON.stringify(guest)).not.toBeNull();
    }
  });

  it('shows no details for an answer by the guest', async () => {
    const { element } = await render({ answeredBy: 'guest' });

    expect(element.querySelector('.guest-row__details')).toBeNull();
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
    const { element } = await render({ answeredBy: 'guest', message: 'Hallo' });

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

  it('shows the message and the note with labels for screen readers', async () => {
    const { element } = await render({ message: 'Ich bringe Kuchen', note: 'Kennt Ben' });

    const texts = Array.from(element.querySelectorAll('.guest-row__text'));
    expect(texts).toHaveLength(2);
    expect(texts[0]!.querySelector('.sr-only')?.textContent).toBe('Nachricht:');
    expect(texts[0]!.querySelector('.guest-row__message')?.textContent).toBe('Ich bringe Kuchen');
    expect(texts[1]!.querySelector('.sr-only')?.textContent).toBe('Notiz:');
    expect(texts[1]!.textContent).toContain('Kennt Ben');
  });

  it('shows no message and no note when there are none', async () => {
    const { element } = await render({ respondedAt: new Date('2026-11-12T08:30:00.000Z') });

    expect(element.querySelector('.guest-row__text')).toBeNull();
    expect(element.textContent).not.toContain('Nachricht:');
    expect(element.textContent).not.toContain('Notiz:');
  });

  it('offers the menu and copying with the name of the guest', async () => {
    const { element } = await render();

    expect(button(element, 'Aktionen für Ada Lovelace')).not.toBeNull();
    expect(button(element, 'Link kopieren: Ada Lovelace')).not.toBeNull();
    expect(element.querySelector('.guest-row__copy')).toBe(
      button(element, 'Link kopieren: Ada Lovelace'),
    );
  });

  it('shows the share button only when the device can share', async () => {
    const without = await render();
    without.element
      .querySelector<HTMLButtonElement>('button[aria-label="Aktionen für Ada Lovelace"]')!
      .click();
    await without.fixture.whenStable();
    const labels = () =>
      Array.from(document.querySelectorAll('[role="menuitem"]'), (item) => item.textContent);
    expect(labels().some((text) => text?.includes('Teilen'))).toBe(false);
    expect(labels().some((text) => text?.includes('Bearbeiten'))).toBe(true);
  });

  it('offers sharing in the menu when the device can share', async () => {
    const { fixture, element } = await render({}, { canShare: true });
    const share = vi.fn();
    fixture.componentInstance.shareLink.subscribe(share);

    button(element, 'Aktionen für Ada Lovelace')!.click();
    await fixture.whenStable();
    const item = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
      (candidate) => candidate.textContent?.includes('Teilen'),
    );
    expect(item).toBeDefined();
    item!.click();
    await fixture.whenStable();

    expect(share).toHaveBeenCalledTimes(1);
  });

  it('hides the actions of a readonly row but keeps the content', async () => {
    const { element } = await render({ message: 'Hallo' }, { readonly: true, canShare: true });

    expect(element.querySelector('button')).toBeNull();
    expect(element.querySelector('.guest-row__actions')).toBeNull();
    expect(element.querySelector('h3')).not.toBeNull();
    expect(element.querySelector('.guest-row__message')?.textContent).toBe('Hallo');
  });

  it('emits copyLink', async () => {
    const { fixture, element } = await render();
    const copy = vi.fn();
    fixture.componentInstance.copyLink.subscribe(copy);

    button(element, 'Link kopieren: Ada Lovelace')!.click();

    expect(copy).toHaveBeenCalledTimes(1);
  });

  it('emits edit, answer, renew, renew photo and remove from the menu', async () => {
    const { fixture, element } = await render();
    const component = fixture.componentInstance;
    const outputs = [
      ['Bearbeiten', component.edit],
      ['Antwort eintragen', component.answer],
      ['Link erneuern', component.renewLink],
      ['Foto-Link erneuern', component.renewPhotoLink],
      ['Entfernen', component.remove],
    ] as const;

    for (const [label, output] of outputs) {
      const spy = vi.fn();
      output.subscribe(spy);
      button(element, 'Aktionen für Ada Lovelace')!.click();
      await fixture.whenStable();
      const item = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
        (candidate) => candidate.textContent?.trim() === label,
      );
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

  it('has no accessibility violations when readonly or without allowance', async () => {
    const { element } = await render({}, { readonly: true });

    await expect(element).toBeAccessible();
  });
});
