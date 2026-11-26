import { ApplicationRef, signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, idle, loading, success } from '@core/state/async-state';
import { UiDialogService } from '@shared/ui/dialog/dialog.service';
import { RsvpStore } from '../../application/rsvp.store';
import {
  Invitation,
  InvitationEvent,
  InvitationGuest,
  UpcomingInvitation,
} from '../../domain/invitation';
import { RsvpImageDialog } from '../rsvp-image-dialog/rsvp-image-dialog';
import { Rsvp } from './rsvp';
import { rsvpI18n } from './rsvp.i18n';

const EVENT: InvitationEvent = {
  title: 'Sommerfest',
  description: '<p>Wir grillen im Garten</p>',
  locationName: 'Alte Mühle',
  address: 'Mühlweg 1\n12345 Musterstadt',
  allDay: false,
  startsAt: new Date('2027-03-13T18:00:00.000Z'),
  endsAt: new Date('2027-03-14T01:00:00.000Z'),
  timeZone: 'Europe/Berlin',
  rsvpDeadline: new Date('2027-03-01T22:59:00.000Z'),
  images: [],
  hosts: ['Anna'],
};

const GUEST: InvitationGuest = {
  name: 'Ada',
  maxCompanions: 2,
  response: 'pending',
  companions: 0,
  message: null,
  respondedAt: null,
};

const invitation = (
  event: Partial<InvitationEvent> = {},
  guest: Partial<InvitationGuest> = {},
  open = true,
): UpcomingInvitation => ({
  past: false,
  open,
  event: { ...EVENT, ...event },
  guest: { ...GUEST, ...guest },
});

const IMAGES = [
  { id: 'i1', width: 1600, height: 900, position: 0 },
  { id: 'i2', width: 800, height: 600, position: 1 },
  { id: 'i3', width: 600, height: 800, position: 2 },
];

describe('Rsvp', () => {
  const select = vi.fn();
  const reload = vi.fn();
  const resetAnswer = vi.fn();
  const answer = vi.fn();
  const open = vi.fn();
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(() => vi.resetAllMocks());

  async function render(
    current: Invitation | undefined,
    options: { state?: AsyncState; answerState?: AsyncState } = {},
  ) {
    const invitationSignal = signal<Invitation | undefined>(current);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: RsvpStore,
          useValue: {
            select,
            reload,
            resetAnswer,
            answer,
            invitation: invitationSignal,
            invitationState: signal(options.state ?? (current ? success() : loading())),
            answerState: signal(options.answerState ?? idle()),
            imageUrl: (id: string) => `https://api.example.com/rsvp/tok/images/${id}`,
            calendarUrl: () => 'https://api.example.com/rsvp/tok/calendar',
          },
        },
        { provide: UiDialogService, useValue: { open } },
      ],
    });
    await loadI18nScopes(rsvpI18n);
    const fixture = TestBed.createComponent(Rsvp);
    fixture.componentRef.setInput('token', 'tok');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const store = TestBed.inject(RsvpStore) as unknown as {
      invitation: WritableSignal<Invitation | undefined>;
      answerState: WritableSignal<AsyncState>;
    };
    return { fixture, element, store };
  }

  const heading = (element: HTMLElement) => element.querySelector('h1')?.textContent?.trim();
  const buttonWith = (element: HTMLElement, text: string) =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((candidate) =>
      candidate.textContent?.includes(text),
    );
  const radio = (element: HTMLElement, label: string) =>
    Array.from(element.querySelectorAll<HTMLLabelElement>('label.form-radio-group__option')).find(
      (candidate) => candidate.textContent?.includes(label),
    )!;
  const checked = (element: HTMLElement) =>
    element.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.closest('label')
      ?.textContent;

  async function choose(element: HTMLElement, label: string): Promise<void> {
    radio(element, label).click();
    await settle();
  }

  async function type(element: HTMLElement, value: string): Promise<void> {
    const textarea = element.querySelector('textarea')!;
    textarea.value = value;
    textarea.dispatchEvent(new Event('input'));
    await settle();
  }

  async function submit(element: HTMLElement): Promise<void> {
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
  }

  it('selects the token of the route', async () => {
    await render(undefined);

    expect(select).toHaveBeenCalledWith('tok');
  });

  describe('invitation without an answer', () => {
    it('greets the guest and names the event and the host', async () => {
      const { element } = await render(invitation());

      expect(element.querySelector('.rsvp__greeting')?.textContent?.trim()).toBe('Hey Ada!');
      expect(heading(element)).toBe('Sommerfest');
      expect(element.querySelector('.rsvp__intro .rsvp__lead')?.textContent?.trim()).toBe(
        'Anna will mit dir feiern.',
      );
    });

    it('uses the plural wording and a joined list for several hosts', async () => {
      const { element } = await render(invitation({ hosts: ['Anna', 'Ben', 'Jonas'] }));

      expect(element.querySelector('.rsvp__intro .rsvp__lead')?.textContent?.trim()).toBe(
        'Anna, Ben und Jonas wollen mit dir feiern.',
      );
      expect(element.querySelector('label')?.textContent).toBeDefined();
      expect(element.textContent).toContain('Nachricht an Anna, Ben und Jonas (optional)');
    });

    it('says nothing about hosts when there are none', async () => {
      const { element } = await render(invitation({ hosts: [] }));

      expect(element.querySelector('.rsvp__intro .rsvp__lead')).toBeNull();
      expect(element.textContent).toContain('Nachricht an die Gastgeber (optional)');
    });

    it('shows date and the time range of an evening across midnight as one date', async () => {
      const { element } = await render(invitation());

      const chips = Array.from(element.querySelectorAll('.rsvp__chip'), (chip) =>
        chip.textContent?.trim(),
      );
      expect(chips).toEqual(['Sa., 13. März 2027', '19:00 bis 02:00 Uhr', 'Alte Mühle']);
      expect(element.querySelector('time')?.getAttribute('datetime')).toBe(
        '2027-03-13T18:00:00.000Z',
      );
    });

    it('shows two dates for an all-day event over several days and no time', async () => {
      const { element } = await render(
        invitation({
          allDay: true,
          startsAt: new Date('2027-03-12T23:00:00.000Z'),
          endsAt: new Date('2027-03-14T23:00:00.000Z'),
          locationName: null,
        }),
      );

      const chips = Array.from(element.querySelectorAll('.rsvp__chip'), (chip) =>
        chip.textContent?.trim(),
      );
      expect(chips).toEqual(['Sa., 13. März 2027 bis Mo., 15. März 2027']);
    });

    it('shows only the start time without an end', async () => {
      const { element } = await render(invitation({ endsAt: null }));

      expect(element.textContent).toContain('ab 19:00 Uhr');
    });

    it('shows the address with a map and a calendar link', async () => {
      const { element } = await render(invitation());

      expect(element.querySelector('.rsvp__address')?.textContent?.trim()).toContain('Mühlweg 1');
      const map = element.querySelector('a[target="_blank"]')!;
      expect(map.getAttribute('href')).toBe(
        'https://www.openstreetmap.org/search?query=M%C3%BChlweg%201%0A12345%20Musterstadt',
      );
      expect(map.getAttribute('rel')).toBe('noopener noreferrer');
      expect(element.querySelector('a[download]')?.getAttribute('href')).toBe(
        'https://api.example.com/rsvp/tok/calendar',
      );
    });

    it('offers no map without an address', async () => {
      const { element } = await render(invitation({ address: null }));

      expect(element.querySelector('a[target="_blank"]')).toBeNull();
      expect(element.querySelector('.rsvp__address')).toBeNull();
    });

    it('renders the description', async () => {
      const { element } = await render(invitation());

      expect(element.querySelector('app-ui-rich-text')?.textContent).toContain(
        'Wir grillen im Garten',
      );
    });

    it('shows the form with the deadline', async () => {
      const { element } = await render(invitation());

      expect(element.querySelector('form h2')?.textContent?.trim()).toBe('Bist du dabei?');
      expect(element.querySelector('form')?.textContent).toContain('Sag bis Mo., 1. März 2027');
      expect(checked(element)).toBeUndefined();
      expect(element.querySelector('button[type="submit"]')?.textContent?.trim()).toBe(
        'Antwort senden',
      );
      expect(buttonWith(element, 'Abbrechen')).toBeUndefined();
    });

    it('shows the cover as a decorative image and the rest as a gallery', async () => {
      const { element } = await render(invitation({ images: IMAGES }));

      const cover = element.querySelector('.rsvp__cover img')!;
      expect(cover.getAttribute('alt')).toBe('');
      expect(cover.getAttribute('src')).toBe('https://api.example.com/rsvp/tok/images/i1');
      const items = element.querySelectorAll('.rsvp__gallery-item');
      expect(items).toHaveLength(2);
      expect(items[0]?.getAttribute('aria-label')).toBe('Bild 2 von 3 groß ansehen');
      expect(items[1]?.getAttribute('aria-label')).toBe('Bild 3 von 3 groß ansehen');
    });

    it('has no cover and no gallery without images', async () => {
      const { element } = await render(invitation());

      expect(element.querySelector('.rsvp__cover')).toBeNull();
      expect(element.querySelector('.rsvp__gallery')).toBeNull();
    });

    it('has no gallery for a single image', async () => {
      const { element } = await render(invitation({ images: [IMAGES[0]!] }));

      expect(element.querySelector('.rsvp__cover')).not.toBeNull();
      expect(element.querySelector('.rsvp__gallery')).toBeNull();
    });

    it('opens an image of the gallery in the dialog', async () => {
      const { element } = await render(invitation({ images: IMAGES }));

      element.querySelectorAll<HTMLButtonElement>('.rsvp__gallery-item')[1]!.click();

      expect(open).toHaveBeenCalledWith(RsvpImageDialog, {
        data: {
          src: 'https://api.example.com/rsvp/tok/images/i3',
          width: 600,
          height: 800,
          number: 3,
          total: 3,
        },
      });
    });
  });

  describe('answering', () => {
    it('asks to choose before sending', async () => {
      const { element } = await render(invitation());

      await submit(element);

      expect(answer).not.toHaveBeenCalled();
      expect(element.textContent).toContain('Bitte wähle, ob du kommst.');
    });

    it('shows the stepper only when accepting a guest who may bring someone', async () => {
      const { element } = await render(invitation());
      expect(element.querySelector('app-form-stepper')).toBeNull();

      await choose(element, 'Bin dabei');
      expect(element.querySelector('app-form-stepper')?.textContent).toContain('bis zu 2 Personen');

      await choose(element, 'Klappt nicht');
      expect(element.querySelector('app-form-stepper')).toBeNull();
    });

    it('uses the singular for an allowance of one', async () => {
      const { element } = await render(invitation({}, { maxCompanions: 1 }));

      await choose(element, 'Bin dabei');

      expect(element.querySelector('app-form-stepper')?.textContent).toContain('bis zu 1 Person');
      expect(element.querySelector('app-form-stepper')?.textContent).not.toContain('Personen');
    });

    it('shows no stepper for a guest who may not bring anybody', async () => {
      const { element } = await render(invitation({}, { maxCompanions: 0 }));

      await choose(element, 'Bin dabei');

      expect(checked(element)).toContain('Bin dabei');
      expect(element.querySelector('app-form-stepper')).toBeNull();
    });

    it('sends the answer with the companions and the message', async () => {
      answer.mockResolvedValue(undefined);
      const { element } = await render(invitation());

      await choose(element, 'Bin dabei');
      element.querySelector<HTMLButtonElement>('button[aria-label="Eine Person mehr"]')!.click();
      await settle();
      await type(element, 'Ich bringe Kuchen');
      await submit(element);

      expect(answer).toHaveBeenCalledWith({
        response: 'accepted',
        companions: 1,
        message: 'Ich bringe Kuchen',
      });
    });

    it('sends a decline without companions', async () => {
      answer.mockResolvedValue(undefined);
      const { element } = await render(invitation());

      await choose(element, 'Klappt nicht');
      await submit(element);

      expect(answer).toHaveBeenCalledWith({ response: 'declined', companions: 0, message: '' });
    });

    it('refuses a message that is too long', async () => {
      const { element } = await render(invitation());

      await choose(element, 'Klappt nicht');
      await type(element, 'x'.repeat(501));
      await submit(element);

      expect(answer).not.toHaveBeenCalled();
      expect(element.textContent).toContain('Höchstens 500 Zeichen.');
    });

    it('shows the thanks and focuses its heading after sending', async () => {
      const { element, store } = await render(invitation());
      answer.mockImplementation(async () => {
        store.invitation.set(invitation({}, { response: 'accepted', companions: 1 }));
        return store.invitation();
      });

      await choose(element, 'Bin dabei');
      await submit(element);
      await settle();

      expect(heading(element)).toBe('Danke, Ada!');
      expect(element.querySelector('form')).toBeNull();
      expect(document.activeElement).toBe(element.querySelector('h1'));
    });

    it('stays on the form and shows the failure when sending fails', async () => {
      answer.mockResolvedValue(undefined);
      const { element, store } = await render(invitation());

      await choose(element, 'Klappt nicht');
      await submit(element);
      store.answerState.set(failed(new Failure('server', 'Down')));
      await settle();

      expect(element.querySelector('form')).not.toBeNull();
      expect(element.querySelector('app-failure-alert')?.textContent).toContain(
        'Deine Antwort konnte nicht gesendet werden',
      );
    });

    it('explains a conflict: the deadline passed meanwhile', async () => {
      const { element } = await render(invitation(), {
        answerState: failed(new Failure('conflict', 'Closed')),
      });

      expect(element.querySelector('app-failure-alert')?.textContent).toContain(
        'Die Frist ist inzwischen abgelaufen, Antworten ist nicht mehr möglich.',
      );
    });

    it('shows a busy submit button while sending', async () => {
      const { element } = await render(invitation(), { answerState: loading() });

      const button = element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
      expect(button.getAttribute('aria-busy')).toBe('true');
      expect(button.getAttribute('aria-disabled')).toBe('true');
    });
  });

  describe('answered', () => {
    const accepted = (event: Partial<InvitationEvent> = {}, open = true) =>
      invitation(
        event,
        {
          response: 'accepted',
          companions: 1,
          message: 'Ich bringe Kuchen',
          respondedAt: new Date('2027-02-01T10:00:00.000Z'),
        },
        open,
      );

    it('thanks the guest by name and names the host', async () => {
      const { element } = await render(accepted());

      expect(heading(element)).toBe('Danke, Ada!');
      expect(element.querySelector('.rsvp__intro .rsvp__lead')?.textContent?.trim()).toBe(
        'Anna hat deine Antwort bekommen.',
      );
      expect(element.querySelector('form')).toBeNull();
    });

    it('uses the plural wording for several hosts and a plain one for none', async () => {
      const several = await render(accepted({ hosts: ['Anna', 'Jonas'] }));
      expect(several.element.querySelector('.rsvp__intro .rsvp__lead')?.textContent?.trim()).toBe(
        'Anna und Jonas haben deine Antwort bekommen.',
      );

      TestBed.resetTestingModule();
      const none = await render(accepted({ hosts: [] }));
      expect(none.element.querySelector('.rsvp__intro .rsvp__lead')?.textContent?.trim()).toBe(
        'Deine Antwort ist angekommen.',
      );
    });

    it('shows the answer with the companions and the message', async () => {
      const { element } = await render(accepted());

      const answerCard = element.querySelector('.rsvp__answer')!;
      expect(answerCard.textContent).toContain('Bin dabei');
      expect(answerCard.textContent).toContain('Du bringst 1 Person mit.');
      expect(answerCard.querySelector('blockquote')?.textContent).toBe('Ich bringe Kuchen');
    });

    it('words the companions for none and for several', async () => {
      const alone = await render(invitation({}, { response: 'accepted', companions: 0 }));
      expect(alone.element.querySelector('.rsvp__answer')?.textContent).toContain(
        'Du kommst allein.',
      );

      TestBed.resetTestingModule();
      const several = await render(invitation({}, { response: 'accepted', companions: 2 }));
      expect(several.element.querySelector('.rsvp__answer')?.textContent).toContain(
        'Du bringst 2 Personen mit.',
      );
    });

    it('shows a decline kindly and without a message block', async () => {
      const { element } = await render(invitation({}, { response: 'declined' }));

      const answerCard = element.querySelector('.rsvp__answer')!;
      expect(answerCard.textContent).toContain('Klappt nicht');
      expect(answerCard.textContent).toContain('Schade, vielleicht beim nächsten Mal.');
      expect(answerCard.querySelector('blockquote')).toBeNull();
    });

    it('offers changing while open, until the deadline', async () => {
      const { element } = await render(accepted());

      expect(buttonWith(element, 'Antwort ändern')).toBeDefined();
      expect(element.querySelector('.rsvp__change')?.textContent).toContain(
        'Ändern geht bis Mo., 1. März 2027.',
      );
      expect(element.textContent).toContain('Diesen Link brauchst du wieder');
    });

    it('changes until the start when there is no deadline', async () => {
      const { element } = await render(accepted({ rsvpDeadline: null }));

      expect(element.querySelector('.rsvp__change')?.textContent).toContain(
        'Ändern geht bis Sa., 13. März 2027.',
      );
    });

    it('shows the time and place below the answer', async () => {
      const { element } = await render(accepted());

      expect(element.querySelector('#rsvp-when-heading')?.textContent?.trim()).toBe('Wann und wo');
      expect(element.textContent).toContain('Sa., 13. März 2027');
      expect(element.textContent).toContain('Alte Mühle');
    });

    it('prefills the form with the answer so far and focuses the form heading', async () => {
      const { element, fixture } = await render(accepted());

      buttonWith(element, 'Antwort ändern')!.click();
      await fixture.whenStable();

      expect(resetAnswer).toHaveBeenCalled();
      expect(element.querySelector('form')).not.toBeNull();
      expect(heading(element)).toBe('Sommerfest');
      expect(checked(element)).toContain('Bin dabei');
      expect(element.querySelector('app-form-stepper output')?.textContent).toContain('1');
      expect(element.querySelector('textarea')?.value).toBe('Ich bringe Kuchen');
      expect(document.activeElement).toBe(element.querySelector('form h2'));
      expect(buttonWith(element, 'Abbrechen')).toBeDefined();
    });

    it('returns to the thanks and its heading on cancel', async () => {
      const { element, fixture } = await render(accepted());
      buttonWith(element, 'Antwort ändern')!.click();
      await fixture.whenStable();

      buttonWith(element, 'Abbrechen')!.click();
      await fixture.whenStable();

      expect(heading(element)).toBe('Danke, Ada!');
      expect(element.querySelector('form')).toBeNull();
      expect(document.activeElement).toBe(element.querySelector('h1'));
    });

    it('sends the changed answer', async () => {
      answer.mockResolvedValue(undefined);
      const { element, fixture } = await render(accepted());
      buttonWith(element, 'Antwort ändern')!.click();
      await fixture.whenStable();

      await choose(element, 'Klappt nicht');
      await submit(element);

      expect(answer).toHaveBeenCalledWith({
        response: 'declined',
        companions: 1,
        message: 'Ich bringe Kuchen',
      });
    });
  });

  describe('answers closed', () => {
    it('says that answering is no longer possible without an answer, and shows no form', async () => {
      const { element } = await render(invitation({}, {}, false));

      expect(heading(element)).toBe('Sommerfest');
      expect(element.querySelector('form')).toBeNull();
      expect(element.querySelector('#rsvp-closed-heading')?.textContent?.trim()).toBe(
        'Antworten ist nicht mehr möglich',
      );
      expect(element.textContent).toContain(
        'Die Frist ist abgelaufen. Melde dich direkt bei den Gastgebern.',
      );
    });

    it('keeps the answer and offers no change', async () => {
      const { element } = await render(
        invitation({}, { response: 'accepted', companions: 0 }, false),
      );

      expect(heading(element)).toBe('Danke, Ada!');
      expect(element.textContent).toContain(
        'Die Frist ist abgelaufen, deine Antwort bleibt so stehen.',
      );
      expect(buttonWith(element, 'Antwort ändern')).toBeUndefined();
      expect(element.textContent).not.toContain('Diesen Link brauchst du wieder');
      expect(element.querySelector('form')).toBeNull();
    });
  });

  describe('past event', () => {
    const past: Invitation = { past: true, event: { title: 'Sommerfest' } };

    it('shows only the title and that the event is over', async () => {
      const { element } = await render(past);

      expect(element.querySelector('.rsvp__kicker')?.textContent?.trim()).toBe('Sommerfest');
      expect(heading(element)).toBe('Das Event ist vorbei');
      expect(element.textContent).toContain('Diese Einladung ist nicht mehr aktiv.');
      expect(element.querySelector('form')).toBeNull();
      expect(element.querySelector('.rsvp__chips')).toBeNull();
      expect(element.querySelector('a[download]')).toBeNull();
    });
  });

  describe('loading and failures', () => {
    it('shows the plain heading while loading', async () => {
      const { element } = await render(undefined);

      expect(heading(element)).toBe('Einladung');
      expect(element.querySelector('form')).toBeNull();
    });

    it('says the invitation was not found, without a retry', async () => {
      const { element } = await render(undefined, {
        state: failed(new Failure('not-found', 'Unknown token')),
      });

      expect(heading(element)).toBe('Einladung nicht gefunden');
      expect(element.textContent).toContain('Der Link ist nicht mehr gültig');
      expect(buttonWith(element, 'Erneut versuchen')).toBeUndefined();
    });

    it('marks the intro as alone only when the invitation was not found', async () => {
      const notFound = await render(undefined, {
        state: failed(new Failure('not-found', 'Unknown token')),
      });
      expect(notFound.element.querySelector('.rsvp__intro--alone')).not.toBeNull();
      TestBed.resetTestingModule();

      const serverFailure = await render(undefined, {
        state: failed(new Failure('server', 'Down')),
      });
      expect(serverFailure.element.querySelector('.rsvp__intro')).not.toBeNull();
      expect(serverFailure.element.querySelector('.rsvp__intro--alone')).toBeNull();
    });

    it('offers a retry for another failure that reloads', async () => {
      const { element } = await render(undefined, {
        state: failed(new Failure('server', 'Down')),
      });

      expect(heading(element)).toBe('Einladung');
      expect(element.textContent).toContain('Die Einladung konnte nicht geladen werden');
      buttonWith(element, 'Erneut versuchen')!.click();
      expect(reload).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('has no violations for an invitation with images', async () => {
      const { element } = await render(invitation({ images: IMAGES }));

      await expect(element).toBeAccessible();
    });

    it('has no violations for the form with errors, stepper and failure', async () => {
      const { element } = await render(invitation(), {
        answerState: failed(new Failure('conflict', 'Closed')),
      });
      await choose(element, 'Bin dabei');
      await submit(element);

      await expect(element).toBeAccessible();
    });

    it('has no violations for the thanks', async () => {
      const { element } = await render(
        invitation({}, { response: 'accepted', companions: 1, message: 'Gern' }),
      );

      await expect(element).toBeAccessible();
    });

    it('has no violations for answers closed', async () => {
      const { element } = await render(invitation({}, {}, false));

      await expect(element).toBeAccessible();
    });

    it('has no violations for a past event', async () => {
      const { element } = await render({ past: true, event: { title: 'Sommerfest' } });

      await expect(element).toBeAccessible();
    });

    it('has no violations for not found', async () => {
      const { element } = await render(undefined, {
        state: failed(new Failure('not-found', 'Unknown token')),
      });

      await expect(element).toBeAccessible();
    });
  });
});
