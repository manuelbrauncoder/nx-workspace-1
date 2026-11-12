import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, idle, loading } from '@core/state/async-state';
import { provideUiDialogTesting } from '@shared/testing/dialog-testing';
import { guestListI18n } from '../guest-list/guest-list.i18n';
import { GuestsBulkDialog, GuestsBulkDialogData } from './guests-bulk-dialog';

describe('GuestsBulkDialog', () => {
  const close = vi.fn();
  const save = vi.fn();

  beforeEach(() => vi.resetAllMocks());

  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  async function render(state: AsyncState = idle()) {
    const data: GuestsBulkDialogData = { save, state: signal(state) };
    TestBed.configureTestingModule({
      providers: provideUiDialogTesting({ data, close }),
    });
    await loadI18nScopes(guestListI18n);
    const fixture = TestBed.createComponent(GuestsBulkDialog);
    await fixture.whenStable();
    return { element: fixture.nativeElement as HTMLElement };
  }

  async function paste(element: HTMLElement, text: string): Promise<void> {
    const textarea = element.querySelector('textarea')!;
    textarea.value = text;
    textarea.dispatchEvent(new Event('input'));
    await settle();
  }

  async function submit(element: HTMLElement): Promise<void> {
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
  }

  const count = (element: HTMLElement) =>
    element.querySelector('.guests-bulk-dialog__count')?.textContent?.trim();

  it('describes the format and starts with no names', async () => {
    const { element } = await render();

    expect(element.querySelector('h2')?.textContent?.trim()).toBe('Liste einfügen');
    expect(element.textContent).toContain('Ein Name pro Zeile, höchstens 100.');
    expect(count(element)).toBe('Erkannt: 0 von höchstens 100 Namen');
  });

  it('counts the names while typing, skipping empty lines', async () => {
    const { element } = await render();

    await paste(element, 'Ada\n\n  Grace  \n \nAlan');

    expect(count(element)).toBe('Erkannt: 3 von höchstens 100 Namen');
    expect(element.querySelector('.guests-bulk-dialog__count')?.getAttribute('aria-live')).toBe(
      'polite',
    );
  });

  it('asks for at least one name', async () => {
    const { element } = await render();

    await paste(element, ' \n ');
    await submit(element);

    expect(save).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Bitte füge mindestens einen Namen ein.');
  });

  it('refuses more names than allowed', async () => {
    const { element } = await render();

    await paste(element, Array.from({ length: 101 }, (_, index) => `Gast ${index}`).join('\n'));
    await submit(element);

    expect(save).not.toHaveBeenCalled();
    expect(count(element)).toBe('Erkannt: 101 von höchstens 100 Namen');
    expect(element.textContent).toContain('Höchstens 100 Namen auf einmal.');
  });

  it('names a name that is too long, shortened', async () => {
    const { element } = await render();

    await paste(element, `Ada\n${'x'.repeat(101)}`);
    await submit(element);

    expect(save).not.toHaveBeenCalled();
    expect(element.textContent).toContain(
      `„${'x'.repeat(20)}…“ ist zu lang, höchstens 100 Zeichen.`,
    );
  });

  it('saves the names and the allowance and closes with the new guests', async () => {
    const added = [{ id: 'g1' }, { id: 'g2' }];
    save.mockResolvedValue(added);
    const { element } = await render();

    await paste(element, 'Ada\nGrace');
    element.querySelector<HTMLButtonElement>('button[aria-label="Eine Begleitung mehr"]')!.click();
    await settle();
    await submit(element);

    expect(save).toHaveBeenCalledWith({ names: ['Ada', 'Grace'], maxCompanions: 1 });
    expect(close).toHaveBeenCalledWith(added);
  });

  it('stays open when saving fails', async () => {
    save.mockResolvedValue(undefined);
    const { element } = await render();

    await paste(element, 'Ada');
    await submit(element);

    expect(save).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
  });

  it('shows the failure of the save, with its own text for a conflict', async () => {
    const server = await render(failed(new Failure('server', 'Down')));
    expect(server.element.querySelector('app-failure-alert')?.textContent).toContain(
      'Die Gäste konnten nicht hinzugefügt werden',
    );

    TestBed.resetTestingModule();
    const conflict = await render(failed(new Failure('conflict', 'Full')));
    expect(conflict.element.querySelector('app-failure-alert')?.textContent).toContain(
      'Die Liste ist voll oder das Event ist vorbei.',
    );
  });

  it('shows a busy submit button while saving', async () => {
    const { element } = await render(loading());

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
    const { element } = await render();

    await expect(element).toBeAccessible();
  });

  it('has no accessibility violations with an error and a failure', async () => {
    const { element } = await render(failed(new Failure('conflict', 'Full')));
    await submit(element);

    await expect(element).toBeAccessible();
  });
});
