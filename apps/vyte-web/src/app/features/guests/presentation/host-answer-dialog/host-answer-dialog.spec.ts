import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, idle, loading } from '@core/state/async-state';
import { provideUiDialogTesting } from '@shared/testing/dialog-testing';
import { Guest } from '../../domain/guest';
import { guestListI18n } from '../guest-list/guest-list.i18n';
import { HostAnswerDialog, HostAnswerDialogData } from './host-answer-dialog';

const GUEST: Guest = {
  id: 'g1',
  name: 'Ada Lovelace',
  note: null,
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

describe('HostAnswerDialog', () => {
  const close = vi.fn();
  const save = vi.fn();

  beforeEach(() => vi.resetAllMocks());

  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  async function render(guest: Partial<Guest> = {}, state: AsyncState = idle()) {
    const data: HostAnswerDialogData = {
      save,
      state: signal(state),
      guest: { ...GUEST, ...guest },
    };
    TestBed.configureTestingModule({
      providers: provideUiDialogTesting({ data, close }),
    });
    await loadI18nScopes(guestListI18n);
    const fixture = TestBed.createComponent(HostAnswerDialog);
    await fixture.whenStable();
    return { element: fixture.nativeElement as HTMLElement };
  }

  const radio = (element: HTMLElement, label: string) =>
    Array.from(element.querySelectorAll<HTMLLabelElement>('label.form-radio-group__option')).find(
      (candidate) => candidate.textContent?.includes(label),
    )!;
  const checked = (element: HTMLElement) =>
    element.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.closest('label')
      ?.textContent;
  const stepper = (element: HTMLElement) => element.querySelector('app-form-stepper');

  async function choose(element: HTMLElement, label: string): Promise<void> {
    radio(element, label).click();
    await settle();
  }

  async function submit(element: HTMLElement): Promise<void> {
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
  }

  it('names the guest in the heading', async () => {
    const { element } = await render();

    expect(element.querySelector('h2')?.textContent?.trim()).toBe(
      'Antwort für Ada Lovelace eintragen',
    );
  });

  it('starts without a choice for a guest who has not answered', async () => {
    const { element } = await render();

    expect(checked(element)).toBeUndefined();
    expect(stepper(element)).toBeNull();
  });

  it('starts with the answer so far', async () => {
    const { element } = await render({ response: 'accepted', companions: 2 });

    expect(checked(element)).toContain('Kommt');
    expect(stepper(element)?.querySelector('output')?.textContent).toContain('2');
  });

  it('asks for an answer and does not save without one', async () => {
    const { element } = await render();

    await submit(element);

    expect(save).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Bitte wähle eine Antwort.');
  });

  it('shows the stepper only when accepting', async () => {
    const { element } = await render();

    await choose(element, 'Kommt nicht');
    expect(stepper(element)).toBeNull();

    await choose(element, 'Kommt');
    expect(stepper(element)).not.toBeNull();
    expect(stepper(element)!.textContent).toContain('Bis zu 2.');
  });

  it('shows no stepper for a guest who may not bring anybody', async () => {
    const { element } = await render({ maxCompanions: 0 });

    await choose(element, 'Kommt');

    expect(checked(element)).toContain('Kommt');
    expect(stepper(element)).toBeNull();
  });

  it('saves an acceptance with the companions and closes with the guest', async () => {
    const saved = { ...GUEST, response: 'accepted' };
    save.mockResolvedValue(saved);
    const { element } = await render();

    await choose(element, 'Kommt');
    element.querySelector<HTMLButtonElement>('button[aria-label="Eine Begleitung mehr"]')!.click();
    await settle();
    await submit(element);

    expect(save).toHaveBeenCalledWith({ response: 'accepted', companions: 1 });
    expect(close).toHaveBeenCalledWith(saved);
  });

  it('saves a decline', async () => {
    save.mockResolvedValue({ ...GUEST, response: 'declined' });
    const { element } = await render();

    await choose(element, 'Kommt nicht');
    await submit(element);

    expect(save).toHaveBeenCalledWith({ response: 'declined', companions: 0 });
    expect(close).toHaveBeenCalled();
  });

  it('stays open when saving fails', async () => {
    save.mockResolvedValue(undefined);
    const { element } = await render();

    await choose(element, 'Kommt nicht');
    await submit(element);

    expect(save).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
  });

  it('shows the failure, with its own text for a conflict', async () => {
    const server = await render({}, failed(new Failure('server', 'Down')));
    expect(server.element.querySelector('app-failure-alert')?.textContent).toContain(
      'Die Antwort konnte nicht gespeichert werden',
    );

    TestBed.resetTestingModule();
    const conflict = await render({}, failed(new Failure('conflict', 'Past')));
    expect(conflict.element.querySelector('app-failure-alert')?.textContent).toContain(
      'Das Event ist vorbei oder die Liste ist voll.',
    );
  });

  it('shows a busy submit button while saving', async () => {
    const { element } = await render({}, loading());

    const submitButton = element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(submitButton.getAttribute('aria-busy')).toBe('true');
    expect(submitButton.getAttribute('aria-disabled')).toBe('true');
  });

  it('closes without a result on cancel', async () => {
    const { element } = await render();

    Array.from(element.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Abbrechen')!
      .click();

    expect(close).toHaveBeenCalledWith(undefined);
  });

  it('has no accessibility violations', async () => {
    const { element } = await render({ response: 'accepted', companions: 1 });

    await expect(element).toBeAccessible();
  });

  it('has no accessibility violations with an error and a failure', async () => {
    const { element } = await render({}, failed(new Failure('conflict', 'Past')));
    await submit(element);

    await expect(element).toBeAccessible();
  });
});
