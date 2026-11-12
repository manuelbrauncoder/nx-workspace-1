import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, idle, loading } from '@core/state/async-state';
import { provideUiDialogTesting } from '@shared/testing/dialog-testing';
import { Guest } from '../../domain/guest';
import { guestListI18n } from '../guest-list/guest-list.i18n';
import { GuestFormDialog, GuestFormDialogData } from './guest-form-dialog';

const GUEST: Guest = {
  id: 'g1',
  name: 'Ada Lovelace',
  note: 'Kennt Ben',
  maxCompanions: 2,
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

describe('GuestFormDialog', () => {
  const close = vi.fn();
  const save = vi.fn();

  beforeEach(() => vi.resetAllMocks());

  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  async function render(options: { guest?: Guest; state?: AsyncState } = {}) {
    const state = signal(options.state ?? idle());
    const data: GuestFormDialogData = { save, state, guest: options.guest };
    TestBed.configureTestingModule({
      providers: provideUiDialogTesting({ data, close }),
    });
    await loadI18nScopes(guestListI18n);
    const fixture = TestBed.createComponent(GuestFormDialog);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    return { fixture, element, state };
  }

  async function type(element: HTMLElement, selector: string, value: string): Promise<void> {
    const control = element.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    control.value = value;
    control.dispatchEvent(new Event('input'));
    await settle();
  }

  async function submit(element: HTMLElement): Promise<void> {
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
  }

  const stepper = (element: HTMLElement, label: string) =>
    element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;

  it('adds a guest: empty form, add heading and button', async () => {
    const { element } = await render();

    expect(element.querySelector('h2')?.textContent?.trim()).toBe('Gast hinzufügen');
    expect(element.querySelector<HTMLInputElement>('input')?.value).toBe('');
    expect(element.querySelector('output')?.textContent).toContain('0');
    expect(element.querySelector('button[type="submit"]')?.textContent?.trim()).toBe('Hinzufügen');
  });

  it('edits a guest: prefilled form, edit heading and button', async () => {
    const { element } = await render({ guest: GUEST });

    expect(element.querySelector('h2')?.textContent?.trim()).toBe('Ada Lovelace bearbeiten');
    expect(element.querySelector<HTMLInputElement>('input')?.value).toBe('Ada Lovelace');
    expect(element.querySelector('textarea')?.value).toBe('Kennt Ben');
    expect(element.querySelector('output')?.textContent).toContain('2');
    expect(element.querySelector('button[type="submit"]')?.textContent?.trim()).toBe('Speichern');
  });

  it('asks for a name and does not save without one', async () => {
    const { element } = await render();

    await submit(element);

    expect(save).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Bitte gib einen Namen ein.');
  });

  it('refuses a name of spaces only', async () => {
    const { element } = await render();

    await type(element, 'input', '   ');
    await submit(element);

    expect(save).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Der Name darf nicht nur aus Leerzeichen bestehen.');
  });

  it('refuses a name and a note that are too long', async () => {
    const { element } = await render();

    await type(element, 'input', 'a'.repeat(101));
    await type(element, 'textarea', 'n'.repeat(501));
    await submit(element);

    expect(save).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Höchstens 100 Zeichen.');
    expect(element.textContent).toContain('Höchstens 500 Zeichen.');
  });

  it('saves what was entered and closes with the saved guest', async () => {
    save.mockResolvedValue(GUEST);
    const { element } = await render();

    await type(element, 'input', 'Ada Lovelace');
    await type(element, 'textarea', 'Kennt Ben');
    stepper(element, 'Eine Begleitung mehr').click();
    await settle();
    await submit(element);

    expect(save).toHaveBeenCalledWith({
      name: 'Ada Lovelace',
      note: 'Kennt Ben',
      maxCompanions: 1,
    });
    expect(close).toHaveBeenCalledWith(GUEST);
  });

  it('stays open and shows the failure when saving fails', async () => {
    save.mockResolvedValue(undefined);
    const { element, state } = await render();
    await type(element, 'input', 'Ada');

    await submit(element);
    state.set(failed(new Failure('server', 'Down')));
    await settle();

    expect(close).not.toHaveBeenCalled();
    expect(element.querySelector('app-failure-alert')?.textContent).toContain(
      'Der Gast konnte nicht gespeichert werden',
    );
  });

  it('explains a conflict: full list or past event', async () => {
    const { element } = await render({ state: failed(new Failure('conflict', 'Full')) });

    expect(element.querySelector('app-failure-alert')?.textContent).toContain(
      'Die Liste ist voll oder das Event ist vorbei.',
    );
  });

  it('shows no failure before anything was sent', async () => {
    const { element } = await render();

    expect(element.querySelector('app-failure-alert')).toBeNull();
  });

  it('shows a busy submit button while saving', async () => {
    const { element } = await render({ state: loading() });

    const submitButton = element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(submitButton.getAttribute('aria-busy')).toBe('true');
    expect(submitButton.getAttribute('aria-disabled')).toBe('true');
    expect(submitButton.textContent).toContain('Wird gespeichert');
  });

  it('closes without a result on cancel', async () => {
    const { element } = await render();

    Array.from(element.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Abbrechen')!
      .click();

    expect(close).toHaveBeenCalledWith(undefined);
    expect(save).not.toHaveBeenCalled();
  });

  it('keeps the number of companions between 0 and the maximum', async () => {
    const { element } = await render();

    expect(stepper(element, 'Eine Begleitung weniger').disabled).toBe(true);
    expect(stepper(element, 'Eine Begleitung mehr').disabled).toBe(false);
  });

  it('has no accessibility violations', async () => {
    const { element } = await render({ guest: GUEST });

    await expect(element).toBeAccessible();
  });

  it('has no accessibility violations with errors and a failure', async () => {
    const { element } = await render({ state: failed(new Failure('conflict', 'Full')) });
    await submit(element);

    await expect(element).toBeAccessible();
  });
});
