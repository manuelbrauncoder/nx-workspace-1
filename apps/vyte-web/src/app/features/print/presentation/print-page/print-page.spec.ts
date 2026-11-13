import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AppConfigService } from '@core/config/app-config';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, loading, success } from '@core/state/async-state';
import { UiQrCode } from '@shared/ui/qr-code/qr-code';
import { PrintStore } from '../../application/print.store';
import { Guest, VyteEvent } from '../../domain/print';
import { PrintPage } from './print-page';
import { printPageI18n } from './print-page.i18n';

const SITE = 'https://vyte.example.com';

const EVENT = {
  id: 'e1',
  title: 'Sommerfest',
  photoStand: null,
} as VyteEvent;

const guest = (id: string, name: string, overrides: Partial<Guest> = {}): Guest =>
  ({ id, name, response: 'pending', photoToken: `photo-${id}`, ...overrides }) as Guest;

const GUESTS = [
  guest('g1', 'Cleo Ángel', { response: 'accepted' }),
  guest('g2', 'Ben Müller', { response: 'declined' }),
  guest('g3', 'Ada Lovelace', { response: 'accepted' }),
];

describe('PrintPage', () => {
  const store = { select: vi.fn(), reload: vi.fn() };
  let print: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetAllMocks();
    print = vi.spyOn(document.defaultView!, 'print').mockImplementation(() => undefined);
  });

  afterEach(() => print.mockRestore());

  async function render(
    options: {
      event?: VyteEvent;
      eventState?: AsyncState;
      guests?: Guest[];
      guestsState?: AsyncState;
      kind?: string;
    } = {},
  ) {
    const event = 'event' in options ? options.event : EVENT;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AppConfigService, useValue: { siteUrl: SITE } },
        {
          provide: PrintStore,
          useValue: {
            ...store,
            event: signal(event),
            eventState: signal(options.eventState ?? success()),
            guests: signal(options.guests ?? GUESTS),
            guestsState: signal(options.guestsState ?? success()),
          },
        },
      ],
    });
    await loadI18nScopes(printPageI18n);
    const fixture = TestBed.createComponent(PrintPage);
    fixture.componentRef.setInput('id', 'e1');
    if (options.kind) {
      fixture.componentRef.setInput('kind', options.kind);
    }
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  const choose = async (fixture: Awaited<ReturnType<typeof render>>['fixture'], label: string) => {
    const item = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        '.ui-toggle-group__item',
      ),
    ).find((candidate) => candidate.textContent?.trim() === label);
    expect(item, label).toBeDefined();
    item!.click();
    await fixture.whenStable();
  };
  const sheets = (element: HTMLElement) =>
    Array.from(element.querySelectorAll('.print-page__sheet'));
  const cards = (element: HTMLElement) => Array.from(element.querySelectorAll('.place-card'));
  const summary = (element: HTMLElement) =>
    element.querySelector('.print-page__summary')?.textContent?.replace(/\s+/g, ' ').trim();
  const qrCodes = (fixture: Awaited<ReturnType<typeof render>>['fixture']) =>
    fixture.debugElement
      .queryAll(By.directive(UiQrCode))
      .map((debug) => debug.componentInstance as UiQrCode);

  it('selects the event of the route', async () => {
    await render();

    expect(store.select).toHaveBeenCalledWith('e1');
  });

  it('has a main landmark, the heading, the event title and a way back to the event', async () => {
    const { element } = await render();

    expect(element.querySelector('main#main')).not.toBeNull();
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Drucken');
    expect(element.querySelector('.print-page__event')?.textContent?.trim()).toBe('Sommerfest');
    const back = element.querySelector<HTMLAnchorElement>('.print-page__back')!;
    expect(back.getAttribute('href')).toBe('/events/e1');
    expect(back.textContent).toContain('Zurück zum Event');
  });

  it('shows the failure and offers a retry when the event cannot be loaded', async () => {
    const { element } = await render({
      event: undefined,
      eventState: failed(new Failure('server', 'Boom')),
    });

    expect(element.textContent).toContain('Das Event konnte nicht geladen werden');
    expect(element.querySelector('.place-card')).toBeNull();
    const retry = Array.from(element.querySelectorAll('button')).find((button) =>
      /erneut|nochmal/i.test(button.textContent ?? ''),
    );
    retry?.click();
    expect(store.reload).toHaveBeenCalledTimes(retry ? 1 : 0);
  });

  it('shows no choice and no sheets while loading', async () => {
    const { element } = await render({ event: undefined, eventState: loading() });

    expect(element.querySelector('app-ui-toggle-group')).toBeNull();
    expect(sheets(element)).toEqual([]);
  });

  describe('place cards', () => {
    it('is the default and offers both kinds', async () => {
      const { element } = await render();

      const labels = Array.from(element.querySelectorAll('.ui-toggle-group__item'), (item) =>
        item.textContent?.trim(),
      );
      expect(labels).toEqual(['Tischkarten', 'Karte der Fotostation', 'Alle Gäste', 'Nur Zusagen']);
    });

    it('prints a card for every guest by name, four to a sheet', async () => {
      const { element } = await render();

      expect(cards(element)).toHaveLength(3);
      expect(sheets(element)).toHaveLength(1);
      const names = cards(element).map((card) =>
        card
          .querySelector('.place-card__half:not(.place-card__half--back) .place-card__name')
          ?.textContent?.trim(),
      );
      expect(names).toEqual(['Ada Lovelace', 'Ben Müller', 'Cleo Ángel']);
      expect(summary(element)).toBe('3 Tischkarten auf 1 A4-Blatt, vier pro Blatt.');
    });

    it('starts a new sheet after four cards', async () => {
      const many = Array.from({ length: 9 }, (_, index) => guest(`g${index}`, `Gast ${index}`));
      const { element } = await render({ guests: many });

      expect(sheets(element).map((sheet) => sheet.querySelectorAll('.place-card').length)).toEqual([
        4, 4, 1,
      ]);
      expect(sheets(element)[2]!.getAttribute('aria-label')).toBe('Blatt 3 von 3');
      expect(summary(element)).toBe('9 Tischkarten auf 3 A4-Blättern, vier pro Blatt.');
    });

    it('gives each card a QR code to the photo page of the guest, labelled with the name', async () => {
      const { fixture } = await render();

      const codes = qrCodes(fixture);
      expect(codes.map((code) => code.value())).toEqual([
        `${SITE}/photos/photo-g3`,
        `${SITE}/photos/photo-g2`,
        `${SITE}/photos/photo-g1`,
      ]);
      expect(codes.map((code) => code.label())).toEqual([
        'QR-Code zur Upload-Seite von Ada Lovelace',
        'QR-Code zur Upload-Seite von Ben Müller',
        'QR-Code zur Upload-Seite von Cleo Ángel',
      ]);
    });

    it('limits the cards to guests who accepted', async () => {
      const { fixture, element } = await render();

      await choose(fixture, 'Nur Zusagen');

      expect(
        cards(element).map((card) => card.querySelector('.place-card__name')?.textContent?.trim()),
      ).toEqual(['Ada Lovelace', 'Cleo Ángel']);
      expect(summary(element)).toBe('2 Tischkarten auf 1 A4-Blatt, vier pro Blatt.');
    });

    it('says that nobody accepted yet', async () => {
      const { fixture, element } = await render({ guests: [guest('g1', 'Ada')] });

      await choose(fixture, 'Nur Zusagen');

      expect(summary(element)).toBe('Noch hat niemand zugesagt.');
      expect(cards(element)).toEqual([]);
      expect(element.querySelector('.print-page__print')).toBeNull();
    });

    it('says one card on one sheet in the singular', async () => {
      const { element } = await render({ guests: [GUESTS[0]!] });

      expect(summary(element)).toBe('1 Tischkarte auf 1 A4-Blatt, vier pro Blatt.');
    });

    it('does not call the list empty while the guests load', async () => {
      const { element } = await render({ guests: [], guestsState: loading() });

      expect(summary(element)).toBe('Die Gäste werden geladen …');
    });

    it('shows a failure with a retry when the guests cannot be loaded', async () => {
      const { element } = await render({
        guests: [],
        guestsState: failed(new Failure('server', 'Down')),
      });

      expect(element.textContent).toContain('Die Gäste konnten nicht geladen werden');
      expect(element.textContent).not.toContain('Auf der Gästeliste steht noch niemand.');
      Array.from(element.querySelectorAll('button'))
        .find((button) => button.textContent?.includes('Erneut versuchen'))!
        .click();
      expect(store.reload).toHaveBeenCalled();
    });

    it('says that the guest list is empty', async () => {
      const { element } = await render({ guests: [] });

      expect(summary(element)).toBe('Auf der Gästeliste steht noch niemand.');
      expect(sheets(element)).toEqual([]);
      expect(element.querySelector('.print-page__print')).toBeNull();
    });

    it('opens the print dialog of the browser', async () => {
      const { element } = await render();

      element.querySelector<HTMLButtonElement>('.print-page__print')!.click();

      expect(print).toHaveBeenCalledTimes(1);
    });

    it('has no accessibility violations', async () => {
      const { element } = await render();

      await expect(element).toBeAccessible();
    });

    it('has no accessibility violations without guests', async () => {
      const { element } = await render({ guests: [] });

      await expect(element).toBeAccessible();
    });
  });

  describe('stand card', () => {
    const ON = { ...EVENT, photoStand: { token: 'tok en' } } as VyteEvent;

    it('opens on the stand card with ?kind=stand', async () => {
      const { element } = await render({ event: ON, kind: 'stand' });

      expect(element.querySelector('.stand-card')).not.toBeNull();
      expect(element.querySelector('.place-card')).toBeNull();
    });

    it('keeps one live region when the kind changes, so the new summary is told', async () => {
      const { fixture, element } = await render({ event: ON });
      const region = element.querySelector('.print-page__summary');

      await choose(fixture, 'Karte der Fotostation');

      expect(element.querySelector('.print-page__summary')).toBe(region);
      expect(region?.getAttribute('aria-live')).toBe('polite');
    });

    it('hides the choice of guests', async () => {
      const { fixture, element } = await render({ event: ON });

      await choose(fixture, 'Karte der Fotostation');

      expect(element.textContent).not.toContain('Für wen?');
      expect(element.querySelector('#print-page-which')).toBeNull();
    });

    it('prints one card with the QR code of the photo stand', async () => {
      const { fixture, element } = await render({ event: ON });

      await choose(fixture, 'Karte der Fotostation');

      expect(cards(element)).toEqual([]);
      expect(element.querySelectorAll('.stand-card')).toHaveLength(1);
      expect(qrCodes(fixture).map((code) => code.value())).toEqual([`${SITE}/stand/tok%20en`]);
      expect(element.querySelector('.stand-card__url')?.textContent?.trim()).toBe(
        `${SITE}/stand/tok%20en`,
      );
      expect(element.querySelector('.stand-card__event')?.textContent?.trim()).toBe('Sommerfest');
    });

    it('opens the print dialog of the browser', async () => {
      const { fixture, element } = await render({ event: ON });
      await choose(fixture, 'Karte der Fotostation');

      element.querySelector<HTMLButtonElement>('.print-page__print')!.click();

      expect(print).toHaveBeenCalledTimes(1);
    });

    it('says that the photo stand is off and links to the event', async () => {
      const { fixture, element } = await render();

      await choose(fixture, 'Karte der Fotostation');

      expect(summary(element)).toContain('Die Fotostation ist aus.');
      expect(element.querySelector('.stand-card')).toBeNull();
      expect(element.querySelector('.print-page__print')).toBeNull();
      expect(qrCodes(fixture)).toEqual([]);
      expect(element.querySelector('.print-page__link')?.getAttribute('href')).toBe('/events/e1');
    });

    it('has no accessibility violations', async () => {
      const { fixture, element } = await render({ event: ON });
      await choose(fixture, 'Karte der Fotostation');

      await expect(element).toBeAccessible();
    });

    it('has no accessibility violations while it is off', async () => {
      const { fixture, element } = await render();
      await choose(fixture, 'Karte der Fotostation');

      await expect(element).toBeAccessible();
    });
  });
});
