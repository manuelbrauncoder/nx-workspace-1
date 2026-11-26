import { Component, signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '@core/config/app-config';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, idle } from '@core/state/async-state';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { EventsStore } from '../../application/events.store';
import { VyteEvent } from '../../domain/event';
import { eventSaveTheDateI18n } from '../event-save-the-date/event-save-the-date.i18n';
import { SaveTheDatePanel } from './save-the-date-panel';

const EVENT = {
  id: 'e1',
  title: 'Sommerfest',
  startsAt: new Date('2027-03-14T18:00:00.000Z'),
  timeZone: 'Europe/Berlin',
  past: false,
  saveTheDate: null,
} as VyteEvent;

const ON = { token: 'tok en', note: 'Einladung folgt' };

// The page owns the heading that takes the focus after turning the link off.
@Component({
  selector: 'app-host',
  imports: [SaveTheDatePanel],
  template: `
    <h2 id="event-save-the-date-heading" tabindex="-1">Save the date</h2>
    <app-save-the-date-panel [event]="event()" />
  `,
})
class Host {
  readonly event = signal(EVENT);
}

describe('SaveTheDatePanel', () => {
  const store = {
    setSaveTheDate: vi.fn(),
    removeSaveTheDate: vi.fn(),
    renewSaveTheDateToken: vi.fn(),
  };
  const confirm = vi.fn();
  const toast = { success: vi.fn(), error: vi.fn() };
  const writeText = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  });
  afterEach(() => Reflect.deleteProperty(navigator, 'share'));

  async function render(event: Partial<VyteEvent> = {}, state: AsyncState = idle()) {
    TestBed.configureTestingModule({
      providers: [
        { provide: EventsStore, useValue: { ...store, saveTheDateState: signal(state) } },
        { provide: AppConfigService, useValue: { siteUrl: 'https://vyte.example.com' } },
        { provide: UiConfirmDialogService, useValue: { confirm } },
        { provide: UiToastService, useValue: toast },
      ],
    });
    await loadI18nScopes(eventSaveTheDateI18n);
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.event.set({ ...EVENT, ...event });
    await fixture.whenStable();
    const state$ = TestBed.inject(EventsStore)
      .saveTheDateState as unknown as WritableSignal<AsyncState>;
    return { fixture, element: fixture.nativeElement as HTMLElement, state: state$ };
  }

  const buttonWith = (element: HTMLElement, text: string) =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((candidate) =>
      candidate.textContent?.includes(text),
    );
  const textarea = (element: HTMLElement) => element.querySelector('textarea')!;

  async function type(
    fixture: { whenStable(): Promise<unknown> },
    element: HTMLElement,
    text: string,
  ) {
    const field = textarea(element);
    field.value = text;
    field.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function submit(fixture: { whenStable(): Promise<unknown> }, element: HTMLElement) {
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  }

  describe('while off', () => {
    it('offers a note field and turning it on', async () => {
      const { element } = await render();

      expect(textarea(element)).not.toBeNull();
      expect(buttonWith(element, 'Save the date einschalten')).toBeDefined();
      expect(element.querySelector('code')).toBeNull();
    });

    it('sends the note and then focuses the copy button', async () => {
      const { fixture, element } = await render();
      // Like the store, hand the event with the link to the page when the request is done.
      store.setSaveTheDate.mockImplementation(async () => {
        fixture.componentInstance.event.set({ ...EVENT, saveTheDate: ON });
        return { ...EVENT, saveTheDate: ON };
      });
      await type(fixture, element, 'Einladung folgt');

      await submit(fixture, element);
      expect(store.setSaveTheDate).toHaveBeenCalledWith('e1', 'Einladung folgt');
      expect(toast.success).toHaveBeenCalledWith('Save the date ist an');
      await fixture.whenStable();

      expect(document.activeElement).toBe(element.querySelector('.save-the-date__copy'));
    });

    it('sends an empty note when none is typed', async () => {
      store.setSaveTheDate.mockResolvedValue(undefined);
      const { fixture, element } = await render();

      await submit(fixture, element);

      expect(store.setSaveTheDate).toHaveBeenCalledWith('e1', '');
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('refuses a note over 500 characters and sends nothing', async () => {
      const { fixture, element } = await render();
      await type(fixture, element, 'x'.repeat(501));

      await submit(fixture, element);

      expect(store.setSaveTheDate).not.toHaveBeenCalled();
      expect(element.textContent).toContain('Höchstens 500 Zeichen.');
      expect(document.activeElement).toBe(textarea(element));
    });

    it('accepts a note of exactly 500 characters', async () => {
      store.setSaveTheDate.mockResolvedValue(undefined);
      const { fixture, element } = await render();
      await type(fixture, element, 'x'.repeat(500));

      await submit(fixture, element);

      expect(store.setSaveTheDate).toHaveBeenCalledWith('e1', 'x'.repeat(500));
    });

    it('shows busy only on the enable button while sending', async () => {
      let finish: (value: undefined) => void = () => undefined;
      store.setSaveTheDate.mockReturnValue(new Promise((resolve) => (finish = resolve)));
      const { fixture, element } = await render();

      await submit(fixture, element);

      expect(element.querySelector('button[type="submit"]')?.getAttribute('aria-busy')).toBe(
        'true',
      );
      finish(undefined);
      await vi.waitFor(() => expect(element.querySelector('[aria-busy="true"]')).toBeNull());
    });

    it('has no accessibility violations', async () => {
      const { element } = await render();

      await expect(element).toBeAccessible();
    });
  });

  describe('while on', () => {
    const on = { saveTheDate: ON };

    it('shows the address of the public page', async () => {
      const { element } = await render(on);

      expect(element.querySelector('code')?.textContent?.trim()).toBe(
        'https://vyte.example.com/save-the-date/tok%20en',
      );
      expect(element.textContent).toContain('Eingeschaltet');
      expect(textarea(element).value).toBe('Einladung folgt');
    });

    it('copies the address and confirms with a toast', async () => {
      writeText.mockResolvedValue(undefined);
      const { element } = await render(on);

      buttonWith(element, 'Link kopieren')!.click();
      await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Link kopiert'));

      expect(writeText).toHaveBeenCalledWith('https://vyte.example.com/save-the-date/tok%20en');
    });

    it('reports a copy that fails', async () => {
      writeText.mockRejectedValue(new Error('denied'));
      const { element } = await render(on);

      buttonWith(element, 'Link kopieren')!.click();

      await vi.waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith('Der Link konnte nicht kopiert werden'),
      );
    });

    it('offers sharing only where the device can share', async () => {
      const without = await render(on);
      expect(buttonWith(without.element, 'Teilen')).toBeUndefined();
      TestBed.resetTestingModule();

      const share = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', { value: share, configurable: true });
      const { element } = await render(on);

      buttonWith(element, 'Teilen')!.click();
      await vi.waitFor(() => expect(share).toHaveBeenCalled());
      expect(share).toHaveBeenCalledWith({
        title: 'Sommerfest',
        text: 'Save the date: Sommerfest am 14.03.2027',
        url: 'https://vyte.example.com/save-the-date/tok%20en',
      });
    });

    it('says nothing when the share sheet is closed, but reports other failures', async () => {
      const share = vi
        .fn()
        .mockRejectedValueOnce(new DOMException('closed', 'AbortError'))
        .mockRejectedValueOnce(new Error('broken'));
      Object.defineProperty(navigator, 'share', { value: share, configurable: true });
      const { element } = await render(on);

      buttonWith(element, 'Teilen')!.click();
      await vi.waitFor(() => expect(share).toHaveBeenCalledTimes(1));
      await Promise.resolve();
      expect(toast.error).not.toHaveBeenCalled();

      buttonWith(element, 'Teilen')!.click();
      await vi.waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith('Der Link konnte nicht geteilt werden'),
      );
    });

    it('opens the page in a new tab', async () => {
      const { element } = await render(on);

      const link = element.querySelector('a[target="_blank"]')!;
      expect(link.getAttribute('href')).toBe('https://vyte.example.com/save-the-date/tok%20en');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
      expect(link.textContent).toContain('Ansehen');
    });

    it('saves a changed note', async () => {
      store.setSaveTheDate.mockResolvedValue({ ...EVENT, saveTheDate: ON });
      const { fixture, element } = await render(on);
      await type(fixture, element, 'Neue Notiz');

      buttonWith(element, 'Notiz speichern')!.click();
      await fixture.whenStable();

      expect(store.setSaveTheDate).toHaveBeenCalledWith('e1', 'Neue Notiz');
      expect(toast.success).toHaveBeenCalledWith('Notiz gespeichert');
    });

    it('refuses a note over 500 characters', async () => {
      const { fixture, element } = await render(on);
      await type(fixture, element, 'x'.repeat(501));

      await submit(fixture, element);

      expect(store.setSaveTheDate).not.toHaveBeenCalled();
      expect(element.textContent).toContain('Höchstens 500 Zeichen.');
    });

    it('renews the link only when confirmed', async () => {
      store.renewSaveTheDateToken.mockResolvedValue({ ...EVENT, saveTheDate: ON });
      const { fixture, element } = await render(on);

      confirm.mockResolvedValue(false);
      buttonWith(element, 'Link erneuern')!.click();
      await fixture.whenStable();
      expect(store.renewSaveTheDateToken).not.toHaveBeenCalled();
      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({ heading: 'Neuen Link erstellen?' }),
      );

      confirm.mockResolvedValue(true);
      buttonWith(element, 'Link erneuern')!.click();
      await vi.waitFor(() => expect(store.renewSaveTheDateToken).toHaveBeenCalledWith('e1'));
      await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Neuer Link erstellt'));
    });

    it('turns it off only when confirmed and then focuses the heading', async () => {
      store.removeSaveTheDate.mockResolvedValue({ ...EVENT, saveTheDate: null });
      const { fixture, element } = await render(on);

      confirm.mockResolvedValue(false);
      buttonWith(element, 'Abschalten')!.click();
      await fixture.whenStable();
      expect(store.removeSaveTheDate).not.toHaveBeenCalled();

      confirm.mockResolvedValue(true);
      buttonWith(element, 'Abschalten')!.click();
      await vi.waitFor(() => expect(store.removeSaveTheDate).toHaveBeenCalledWith('e1'));
      await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Save the date ist aus'));
      fixture.componentInstance.event.set({ ...EVENT, saveTheDate: null });
      await fixture.whenStable();

      expect(document.activeElement).toBe(element.querySelector('#event-save-the-date-heading'));
    });

    it('turns it off even while the note field holds too much text', async () => {
      store.removeSaveTheDate.mockResolvedValue({ ...EVENT, saveTheDate: null });
      confirm.mockResolvedValue(true);
      const { fixture, element } = await render(on);
      await type(fixture, element, 'x'.repeat(501));

      buttonWith(element, 'Abschalten')!.click();

      await vi.waitFor(() => expect(store.removeSaveTheDate).toHaveBeenCalledWith('e1'));
    });

    it('marks only the button that started the request as busy', async () => {
      let finish: (value: undefined) => void = () => undefined;
      store.renewSaveTheDateToken.mockReturnValue(new Promise((resolve) => (finish = resolve)));
      confirm.mockResolvedValue(true);
      const { fixture, element } = await render(on);

      buttonWith(element, 'Link erneuern')!.click();
      await vi.waitFor(() => expect(element.querySelector('[aria-busy="true"]')).not.toBeNull());

      const busy = Array.from(element.querySelectorAll('[aria-busy="true"]'));
      expect(busy).toHaveLength(1);
      expect(busy[0].textContent).toContain('Link erneuern');
      finish(undefined);
      await fixture.whenStable();
    });

    it('has no accessibility violations', async () => {
      const { element } = await render(on);

      await expect(element).toBeAccessible();
    });
  });

  describe('after the event', () => {
    it('offers only turning it off while on', async () => {
      const { element } = await render({ past: true, saveTheDate: ON });

      expect(element.querySelector('code')).not.toBeNull();
      expect(buttonWith(element, 'Abschalten')).toBeDefined();
      expect(buttonWith(element, 'Link erneuern')).toBeUndefined();
      expect(buttonWith(element, 'Notiz speichern')).toBeUndefined();
      expect(textarea(element)).toBeNull();
      await expect(element).toBeAccessible();
    });

    it('says it can no longer be turned on while off', async () => {
      const { element } = await render({ past: true });

      expect(element.textContent).toContain(
        'Nach dem Event lässt sich Save the date nicht mehr einschalten.',
      );
      expect(textarea(element)).toBeNull();
      expect(buttonWith(element, 'Save the date einschalten')).toBeUndefined();
      await expect(element).toBeAccessible();
    });
  });

  describe('on failure', () => {
    it('shows the failure alert', async () => {
      const { element } = await render({}, failed(new Failure('server', 'Boom')));

      const alert = element.querySelector('[role="alert"]');
      expect(alert?.textContent).toContain('Save the date konnte nicht geändert werden');
      await expect(element).toBeAccessible();
    });

    it('explains a 409 with its own text', async () => {
      const { element } = await render(
        { past: true, saveTheDate: ON },
        failed(new Failure('conflict', 'Over')),
      );

      expect(element.querySelector('[role="alert"]')?.textContent).toContain(
        'Das Event ist vorbei. Save the date lässt sich nur noch abschalten.',
      );
      await expect(element).toBeAccessible();
    });

    it('shows a failure that arrives later', async () => {
      const { fixture, element, state } = await render();

      state.set(failed(new Failure('network', 'Offline')));
      await fixture.whenStable();

      expect(element.querySelector('[role="alert"]')).not.toBeNull();
    });
  });
});
