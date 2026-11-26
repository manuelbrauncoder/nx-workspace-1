import { Component, signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppConfigService } from '@core/config/app-config';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, idle } from '@core/state/async-state';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { EventsStore } from '../../application/events.store';
import { VyteEvent } from '../../domain/event';
import { eventPhotoStandI18n } from '../event-photo-stand/event-photo-stand.i18n';
import { PhotoStandPanel } from './photo-stand-panel';

const EVENT = {
  id: 'e1',
  title: 'Sommerfest',
  startsAt: new Date('2027-03-14T18:00:00.000Z'),
  timeZone: 'Europe/Berlin',
  past: false,
  photoStand: null,
} as VyteEvent;

const ON = { token: 'tok en' };
const ADDRESS = 'https://vyte.example.com/stand/tok%20en';

// The page owns the heading that takes the focus after turning the stand off.
@Component({
  selector: 'app-host',
  imports: [PhotoStandPanel],
  template: `
    <h2 id="event-photo-stand-heading" tabindex="-1">Fotostation</h2>
    <app-photo-stand-panel [event]="event()" />
  `,
})
class Host {
  readonly event = signal(EVENT);
}

describe('PhotoStandPanel', () => {
  const store = {
    enablePhotoStand: vi.fn(),
    disablePhotoStand: vi.fn(),
    renewPhotoStandToken: vi.fn(),
  };
  const confirm = vi.fn();
  const toast = { success: vi.fn(), error: vi.fn() };
  const writeText = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  });

  async function render(event: Partial<VyteEvent> = {}, state: AsyncState = idle()) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: EventsStore, useValue: { ...store, photoStandState: signal(state) } },
        { provide: AppConfigService, useValue: { siteUrl: 'https://vyte.example.com' } },
        { provide: UiConfirmDialogService, useValue: { confirm } },
        { provide: UiToastService, useValue: toast },
      ],
    });
    await loadI18nScopes(eventPhotoStandI18n);
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.event.set({ ...EVENT, ...event });
    await fixture.whenStable();
    const state$ = TestBed.inject(EventsStore)
      .photoStandState as unknown as WritableSignal<AsyncState>;
    return { fixture, element: fixture.nativeElement as HTMLElement, state: state$ };
  }

  const buttonWith = (element: HTMLElement, text: string) =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((candidate) =>
      candidate.textContent?.includes(text),
    );

  describe('while off', () => {
    it('offers turning it on and shows no address', async () => {
      const { element } = await render();

      expect(buttonWith(element, 'Fotostation einschalten')).toBeDefined();
      expect(element.querySelector('code')).toBeNull();
    });

    it('turns it on and then focuses the copy button', async () => {
      const { fixture, element } = await render();
      store.enablePhotoStand.mockImplementation(async () => {
        fixture.componentInstance.event.set({ ...EVENT, photoStand: ON });
        return { ...EVENT, photoStand: ON };
      });

      buttonWith(element, 'Fotostation einschalten')!.click();
      await vi.waitFor(() => expect(store.enablePhotoStand).toHaveBeenCalledWith('e1'));
      await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Fotostation ist an'));
      await fixture.whenStable();

      expect(document.activeElement).toBe(element.querySelector('.photo-stand__copy'));
    });

    it('stays quiet when turning it on fails', async () => {
      store.enablePhotoStand.mockResolvedValue(undefined);
      const { fixture, element } = await render();

      buttonWith(element, 'Fotostation einschalten')!.click();
      await fixture.whenStable();

      expect(toast.success).not.toHaveBeenCalled();
    });

    it('shows busy on the enable button while sending', async () => {
      let finish: (value: undefined) => void = () => undefined;
      store.enablePhotoStand.mockReturnValue(new Promise((resolve) => (finish = resolve)));
      const { element } = await render();

      buttonWith(element, 'Fotostation einschalten')!.click();
      await vi.waitFor(() =>
        expect(element.querySelector('button[aria-busy="true"]')).not.toBeNull(),
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
    const on = { photoStand: ON };

    it('shows the address of the upload page', async () => {
      const { element } = await render(on);

      expect(element.querySelector('code')?.textContent?.trim()).toBe(ADDRESS);
      expect(element.textContent).toContain('Eingeschaltet');
      expect(buttonWith(element, 'Fotostation einschalten')).toBeUndefined();
    });

    it('links to the stand card on the print page and no longer explains printing', async () => {
      const { element } = await render(on);

      const link = Array.from(element.querySelectorAll('a')).find((candidate) =>
        candidate.textContent?.includes('Karte drucken'),
      );
      expect(link?.getAttribute('href')).toBe('/events/e1/print?kind=stand');
      expect(element.textContent).not.toContain('druckst du');
    });

    it('copies the address and confirms with a toast', async () => {
      writeText.mockResolvedValue(undefined);
      const { element } = await render(on);

      buttonWith(element, 'Link kopieren')!.click();
      await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Link kopiert'));

      expect(writeText).toHaveBeenCalledWith(ADDRESS);
    });

    it('reports a copy that fails', async () => {
      writeText.mockRejectedValue(new Error('denied'));
      const { element } = await render(on);

      buttonWith(element, 'Link kopieren')!.click();

      await vi.waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith('Der Link konnte nicht kopiert werden'),
      );
    });

    it('opens the page in a new tab', async () => {
      const { element } = await render(on);

      const link = element.querySelector('a[target="_blank"]')!;
      expect(link.getAttribute('href')).toBe(ADDRESS);
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
      expect(link.textContent).toContain('Ansehen');
    });

    it('renews the link only when confirmed', async () => {
      store.renewPhotoStandToken.mockResolvedValue({ ...EVENT, photoStand: ON });
      const { fixture, element } = await render(on);

      confirm.mockResolvedValue(false);
      buttonWith(element, 'Link erneuern')!.click();
      await fixture.whenStable();
      expect(store.renewPhotoStandToken).not.toHaveBeenCalled();
      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({ heading: 'Neuen Link für die Fotostation?' }),
      );

      confirm.mockResolvedValue(true);
      buttonWith(element, 'Link erneuern')!.click();
      await vi.waitFor(() => expect(store.renewPhotoStandToken).toHaveBeenCalledWith('e1'));
      await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Neuer Link erstellt'));
    });

    it('turns it off only when confirmed and then focuses the heading', async () => {
      store.disablePhotoStand.mockResolvedValue({ ...EVENT, photoStand: null });
      const { fixture, element } = await render(on);

      confirm.mockResolvedValue(false);
      buttonWith(element, 'Abschalten')!.click();
      await fixture.whenStable();
      expect(store.disablePhotoStand).not.toHaveBeenCalled();
      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({ heading: 'Fotostation abschalten?', variant: 'destructive' }),
      );

      confirm.mockResolvedValue(true);
      buttonWith(element, 'Abschalten')!.click();
      await vi.waitFor(() => expect(store.disablePhotoStand).toHaveBeenCalledWith('e1'));
      await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Fotostation ist aus'));
      fixture.componentInstance.event.set({ ...EVENT, photoStand: null });
      await fixture.whenStable();

      expect(document.activeElement).toBe(element.querySelector('#event-photo-stand-heading'));
    });

    it('marks only the button that started the request as busy', async () => {
      let finish: (value: undefined) => void = () => undefined;
      store.renewPhotoStandToken.mockReturnValue(new Promise((resolve) => (finish = resolve)));
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
    it('keeps the address and the buttons while on', async () => {
      const { element } = await render({ past: true, photoStand: ON });

      expect(element.querySelector('code')?.textContent?.trim()).toBe(ADDRESS);
      expect(buttonWith(element, 'Abschalten')).toBeDefined();
      await expect(element).toBeAccessible();
    });

    it('says it can no longer be turned on while off', async () => {
      const { element } = await render({ past: true });

      expect(element.textContent).toContain(
        'Nach dem Event lässt sich die Fotostation nicht mehr einschalten.',
      );
      expect(element.querySelector('button')).toBeNull();
      await expect(element).toBeAccessible();
    });
  });

  describe('on failure', () => {
    it('shows the failure alert', async () => {
      const { element } = await render({}, failed(new Failure('server', 'Boom')));

      expect(element.querySelector('[role="alert"]')?.textContent).toContain(
        'Die Fotostation konnte nicht geändert werden',
      );
      await expect(element).toBeAccessible();
    });

    it('explains a 409 with its own text', async () => {
      const { element } = await render(
        { past: true, photoStand: ON },
        failed(new Failure('conflict', 'Over')),
      );

      expect(element.querySelector('[role="alert"]')?.textContent).toContain(
        'Das Event ist vorbei oder der Upload ist beendet. Die Fotostation lässt sich nur noch abschalten.',
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
