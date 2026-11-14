import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AppConfigService } from '@core/config/app-config';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, idle, loading, success } from '@core/state/async-state';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { TeamStore } from '../../application/team.store';
import { EditorInvite, Member, VyteEvent } from '../../domain/team';
import { TeamPage } from './team-page';
import { teamPageI18n } from './team-page.i18n';

const EVENT = { id: 'e1', title: 'Sommerfest', past: false } as VyteEvent;

const member = (userId: string, role: Member['role'], name: string | null): Member => ({
  userId,
  name,
  email: `${userId}@example.com`,
  role,
  joinedAt: new Date('2026-11-01T09:00:00.000Z'),
});

const MEMBERS = [
  member('u1', 'owner', 'Olga Owner'),
  member('u2', 'editor', 'Ada Lovelace'),
  member('u3', 'editor', null),
];

const invite = (id: string): EditorInvite => ({
  id,
  token: `token-${id}`,
  createdAt: new Date('2026-11-01T09:00:00.000Z'),
  expiresAt: new Date('2026-11-08T09:00:00.000Z'),
});

describe('TeamPage', () => {
  const store = {
    select: vi.fn(),
    reload: vi.fn(),
    reloadInvites: vi.fn(),
    createInvite: vi.fn(),
    revokeInvite: vi.fn(),
    removeMember: vi.fn(),
    handOver: vi.fn(),
    leave: vi.fn(),
  };
  const confirm = vi.fn();
  const toast = { success: vi.fn(), error: vi.fn() };
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(() => vi.resetAllMocks());
  afterEach(() => Reflect.deleteProperty(navigator, 'share'));

  interface Options {
    /** The signed-in user. */
    userId?: string;
    event?: VyteEvent;
    eventState?: AsyncState;
    members?: Member[];
    membersState?: AsyncState;
    invites?: EditorInvite[];
    invitesState?: AsyncState;
    memberMutationState?: AsyncState;
    inviteMutationState?: AsyncState;
  }

  async function render(options: Options = {}) {
    const members = signal(options.members ?? MEMBERS);
    const invites = signal(options.invites ?? [invite('i1'), invite('i2')]);
    const me = computed(options.userId ?? 'u1', members);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: TeamStore,
          useValue: {
            ...store,
            event: signal('event' in options ? options.event : EVENT),
            eventState: signal(options.eventState ?? success()),
            members,
            membersState: signal(options.membersState ?? success()),
            invites,
            invitesState: signal(options.invitesState ?? success()),
            me,
            isOwner: () => me()?.role === 'owner',
            memberMutationState: signal(options.memberMutationState ?? idle()),
            inviteMutationState: signal(options.inviteMutationState ?? idle()),
          },
        },
        { provide: AppConfigService, useValue: { siteUrl: 'https://vyte.example.com' } },
        { provide: UiConfirmDialogService, useValue: { confirm } },
        { provide: UiToastService, useValue: toast },
      ],
    });
    await loadI18nScopes(teamPageI18n);
    const fixture = TestBed.createComponent(TeamPage);
    fixture.componentRef.setInput('id', 'e1');
    await fixture.whenStable();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    return { fixture, element: fixture.nativeElement as HTMLElement, members, invites, navigate };
  }

  // Reads the user among the members the way the store does, so the page follows a handover.
  function computed(userId: string, members: () => Member[]) {
    return () => members().find((m) => m.userId === userId);
  }

  const headings = (element: HTMLElement) =>
    Array.from(element.querySelectorAll('h2'), (h) => h.textContent?.trim());
  const buttonWith = (element: HTMLElement, text: string) =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((candidate) =>
      candidate.textContent?.includes(text),
    );
  const rowOf = (element: HTMLElement, name: string) =>
    Array.from(element.querySelectorAll<HTMLElement>('app-member-row')).find((card) =>
      card.querySelector('h3')?.textContent?.includes(name),
    )!;
  const menus = (element: HTMLElement) =>
    element.querySelectorAll('app-member-row button[aria-label^="Aktionen für"]');

  async function pick(element: HTMLElement, name: string, item: string): Promise<void> {
    rowOf(element, name)
      .querySelector<HTMLButtonElement>(`button[aria-label="Aktionen für ${name}"]`)!
      .click();
    await settle();
    Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]'))
      .find((candidate) => candidate.textContent?.includes(item))!
      .click();
    await settle();
  }

  it('selects the event of the route', async () => {
    await render();

    expect(store.select).toHaveBeenCalledWith('e1');
  });

  it('has no heading, breadcrumb or event lead of its own, the frame of the event brings them', async () => {
    const { element } = await render();

    expect(element.querySelector('h1')).toBeNull();
    expect(element.querySelector('nav[aria-label="Navigationspfad"]')).toBeNull();
    expect(element.querySelector('.team-page__event')).toBeNull();
  });

  it('has no heading of its own while loading', async () => {
    const { element } = await render({ event: undefined, eventState: loading(), members: [] });

    expect(element.querySelector('h1')).toBeNull();
    expect(element.querySelector('nav')).toBeNull();
    expect(element.querySelector('app-member-row')).toBeNull();
  });

  it('shows the failure and retries', async () => {
    const { element } = await render({
      event: undefined,
      eventState: failed(new Failure('server', 'Boom')),
      members: [],
    });

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Das Team konnte nicht geladen werden',
    );
    buttonWith(element, 'Erneut versuchen')!.click();

    expect(store.reload).toHaveBeenCalledTimes(1);
  });

  it('shows the failure of the members only in their section', async () => {
    const { element } = await render({
      members: [],
      membersState: failed(new Failure('server', 'Boom')),
      userId: 'nobody',
    });

    expect(element.textContent).toContain('Die Mitglieder konnten nicht geladen werden');
    expect(element.querySelector('app-member-row')).toBeNull();
  });

  describe('as owner', () => {
    it('lists every member with the signed-in user marked', async () => {
      const { element } = await render();

      const cards = Array.from(element.querySelectorAll('app-member-row'));
      expect(cards.map((card) => card.querySelector('h3')?.textContent?.trim())).toEqual([
        'Olga Owner',
        'Ada Lovelace',
        'u3@example.com',
      ]);
      expect(rowOf(element, 'Olga Owner').textContent).toContain('Du');
      expect(rowOf(element, 'Ada Lovelace').textContent).not.toContain('Du');
    });

    it('offers the menu on editors only', async () => {
      const { element } = await render();

      expect(menus(element)).toHaveLength(2);
      expect(
        rowOf(element, 'Olga Owner').querySelector('button[aria-label^="Aktionen für"]'),
      ).toBeNull();
    });

    it('has no leave section', async () => {
      const { element } = await render();

      expect(headings(element)).toEqual(['Mitglieder', 'Einladungslinks']);
      expect(buttonWith(element, 'Event verlassen')).toBeUndefined();
    });

    it('lists members and invites as rows of calm lists', async () => {
      const { element } = await render();

      expect(
        element.querySelectorAll('ul[appUiList] > li[appUiListItem] app-member-row'),
      ).toHaveLength(3);
      expect(
        element.querySelectorAll('ul[appUiList] > li[appUiListItem] app-editor-invite-item'),
      ).toHaveLength(2);
    });

    it('lists the invite links with their address', async () => {
      const { element } = await render();

      const items = element.querySelectorAll('app-editor-invite-item');
      expect(items).toHaveLength(2);
      expect(items[0]?.querySelector('code')?.textContent?.trim()).toBe(
        'https://vyte.example.com/invite/token-i1',
      );
    });

    it('says when there are no open links', async () => {
      const { element } = await render({ invites: [] });

      expect(element.textContent).toContain('Keine offenen Links.');
      expect(element.querySelector('app-editor-invite-item')).toBeNull();
    });

    it('shows the failure of the links only in their section, and retries', async () => {
      const { element } = await render({
        invites: [],
        invitesState: failed(new Failure('server', 'Boom')),
      });

      expect(element.textContent).toContain('Die Links konnten nicht geladen werden');
      expect(element.querySelector('app-member-row')).not.toBeNull();
      buttonWith(element, 'Erneut versuchen')!.click();
      expect(store.reloadInvites).toHaveBeenCalledTimes(1);
    });

    it('creates a link, says so and moves the focus to its copy button', async () => {
      const { element, invites } = await render();
      store.createInvite.mockImplementation(async () => {
        const created = invite('i3');
        invites.update((existing) => [created, ...existing]);
        return created;
      });

      buttonWith(element, 'Einladungslink erstellen')!.click();
      await settle();
      await settle();

      expect(store.createInvite).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith('Einladungslink erstellt');
      const active = document.activeElement as HTMLElement;
      expect(active.textContent).toContain('Link kopieren');
      expect(active.closest('[data-invite]')?.getAttribute('data-invite')).toBe('i3');
    });

    it('says nothing and keeps the focus when creating a link fails', async () => {
      const { element } = await render();
      store.createInvite.mockResolvedValue(undefined);

      buttonWith(element, 'Einladungslink erstellen')!.click();
      await settle();

      expect(toast.success).not.toHaveBeenCalled();
    });

    it('blocks the create button while its link is being made, not while one is revoked', async () => {
      let finish: (value: undefined) => void = () => undefined;
      store.createInvite.mockReturnValue(new Promise((resolve) => (finish = resolve)));
      const { element } = await render({ inviteMutationState: loading() });

      const button = buttonWith(element, 'Einladungslink erstellen')!;
      expect(button.hasAttribute('aria-busy')).toBe(false);

      button.click();
      await settle();
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect(button.getAttribute('aria-busy')).toBe('true');
      expect(element.textContent).toContain('Link wird erstellt');

      finish(undefined);
      // The page continues after the promise, one tick later.
      await Promise.resolve();
      await settle();
      expect(button.hasAttribute('aria-busy')).toBe(false);
    });

    it('explains a 409 of the links: ten are open already', async () => {
      const { element } = await render({
        inviteMutationState: failed(new Failure('conflict', 'Too many')),
      });

      expect(element.textContent).toContain('Es sind schon 10 Links offen.');
      expect(element.textContent).not.toContain('Die Änderung am Team hat nicht geklappt');
    });

    it('explains a 409 of the members: the event is over or the person is the owner', async () => {
      const { element } = await render({
        memberMutationState: failed(new Failure('conflict', 'Over')),
      });

      expect(element.textContent).toContain('Das Event ist vorbei oder die Person ist Gastgeber.');
    });

    it('shows the generic text for other failures of a change', async () => {
      const { element } = await render({
        memberMutationState: failed(new Failure('network', 'Offline')),
        inviteMutationState: failed(new Failure('server', 'Boom')),
      });

      expect(element.textContent).toContain('Die Änderung am Team hat nicht geklappt');
      expect(element.textContent).toContain('Der Link konnte nicht erstellt oder zurückgezogen');
      expect(element.textContent).not.toContain('Das Event ist vorbei oder');
      expect(element.textContent).not.toContain('Es sind schon 10 Links offen.');
    });

    describe('copying and sharing', () => {
      const copyButton = (element: HTMLElement) =>
        element.querySelector<HTMLButtonElement>(
          '[data-invite="i2"] button[aria-label^="Link kopieren"]',
        )!;

      it('copies the address and says so', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
        const { element } = await render();

        copyButton(element).click();
        await settle();

        expect(writeText).toHaveBeenCalledWith('https://vyte.example.com/invite/token-i2');
        expect(toast.success).toHaveBeenCalledWith('Link kopiert');
      });

      it('reports an address that could not be copied', async () => {
        const writeText = vi.fn().mockRejectedValue(new Error('Denied'));
        Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
        const { element } = await render();

        copyButton(element).click();
        await settle();

        expect(toast.error).toHaveBeenCalledWith('Der Link konnte nicht kopiert werden');
        expect(toast.success).not.toHaveBeenCalled();
      });

      it('offers no sharing where the device cannot share', async () => {
        const { element } = await render();

        expect(element.querySelector('button[aria-label^="Teilen"]')).toBeNull();
      });

      it('shares the title and the address where the device can', async () => {
        const share = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'share', { value: share, configurable: true });
        const { element } = await render();

        element
          .querySelector<HTMLButtonElement>('[data-invite="i1"] button[aria-label^="Teilen"]')!
          .click();
        await settle();

        expect(share).toHaveBeenCalledWith({
          title: 'Sommerfest',
          text: 'Plan mit mir: Sommerfest',
          url: 'https://vyte.example.com/invite/token-i1',
        });
        expect(toast.error).not.toHaveBeenCalled();
      });

      it('does not complain when the share sheet is closed, but when sharing fails', async () => {
        const share = vi
          .fn()
          .mockRejectedValueOnce(new DOMException('Closed', 'AbortError'))
          .mockRejectedValueOnce(new Error('Broken'));
        Object.defineProperty(navigator, 'share', { value: share, configurable: true });
        const { element } = await render();
        const button = element.querySelector<HTMLButtonElement>(
          '[data-invite="i1"] button[aria-label^="Teilen"]',
        )!;

        button.click();
        await settle();
        expect(toast.error).not.toHaveBeenCalled();

        button.click();
        await settle();
        expect(toast.error).toHaveBeenCalledWith('Der Link konnte nicht geteilt werden');
      });
    });

    describe('revoking', () => {
      const revokeButton = (element: HTMLElement) =>
        element.querySelector<HTMLButtonElement>(
          '[data-invite="i2"] button[aria-label^="Link zurückziehen"]',
        )!;

      it('revokes a link only after confirmation and focuses the heading of the links', async () => {
        confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
        store.revokeInvite.mockResolvedValue(true);
        const { element } = await render();

        revokeButton(element).click();
        await settle();
        expect(store.revokeInvite).not.toHaveBeenCalled();
        expect(toast.success).not.toHaveBeenCalled();

        revokeButton(element).click();
        await settle();
        expect(confirm).toHaveBeenLastCalledWith(
          expect.objectContaining({ heading: 'Link zurückziehen?', variant: 'destructive' }),
        );
        expect(store.revokeInvite).toHaveBeenCalledWith('i2');
        expect(toast.success).toHaveBeenCalledWith('Link zurückgezogen');
        expect(document.activeElement?.id).toBe('team-page-invites');
      });

      it('says nothing when revoking fails', async () => {
        confirm.mockResolvedValue(true);
        store.revokeInvite.mockResolvedValue(false);
        const { element } = await render();

        revokeButton(element).click();
        await settle();

        expect(toast.success).not.toHaveBeenCalled();
        expect(document.activeElement?.id).not.toBe('team-page-invites');
      });
    });

    describe('managing editors', () => {
      it('removes an editor only after confirmation and focuses the heading of the members', async () => {
        confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
        store.removeMember.mockResolvedValue(true);
        const { element } = await render();

        await pick(element, 'Ada Lovelace', 'Entfernen');
        expect(store.removeMember).not.toHaveBeenCalled();

        await pick(element, 'Ada Lovelace', 'Entfernen');
        expect(confirm).toHaveBeenLastCalledWith(
          expect.objectContaining({ heading: 'Ada Lovelace entfernen?', variant: 'destructive' }),
        );
        expect(store.removeMember).toHaveBeenCalledWith('u2');
        expect(toast.success).toHaveBeenCalledWith('Ada Lovelace entfernt');
        expect(document.activeElement?.id).toBe('team-page-members');
      });

      it('names an editor without a name by the email', async () => {
        confirm.mockResolvedValue(false);
        const { element } = await render();

        await pick(element, 'u3@example.com', 'Entfernen');

        expect(confirm).toHaveBeenCalledWith(
          expect.objectContaining({ heading: 'u3@example.com entfernen?' }),
        );
      });

      it('says nothing when removing fails', async () => {
        confirm.mockResolvedValue(true);
        store.removeMember.mockResolvedValue(false);
        const { element } = await render();

        await pick(element, 'Ada Lovelace', 'Entfernen');

        expect(toast.success).not.toHaveBeenCalled();
      });

      it('hands the event over only after confirmation and focuses the heading of the members', async () => {
        confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
        store.handOver.mockResolvedValue([]);
        const { element } = await render();

        await pick(element, 'Ada Lovelace', 'Event übergeben');
        expect(store.handOver).not.toHaveBeenCalled();

        await pick(element, 'Ada Lovelace', 'Event übergeben');
        expect(confirm).toHaveBeenLastCalledWith(
          expect.objectContaining({ heading: 'Event an Ada Lovelace übergeben?' }),
        );
        expect(store.handOver).toHaveBeenCalledWith('u2');
        expect(toast.success).toHaveBeenCalledWith('Ada Lovelace ist jetzt Gastgeber');
        expect(document.activeElement?.id).toBe('team-page-members');
      });

      it('says nothing when the handover fails', async () => {
        confirm.mockResolvedValue(true);
        store.handOver.mockResolvedValue(undefined);
        const { element } = await render();

        await pick(element, 'Ada Lovelace', 'Event übergeben');

        expect(toast.success).not.toHaveBeenCalled();
      });
    });

    it('loses the invites and the menus once a handover made them an editor', async () => {
      const { element, members, fixture } = await render();

      members.set([
        member('u1', 'editor', 'Olga Owner'),
        member('u2', 'owner', 'Ada Lovelace'),
        member('u3', 'editor', null),
      ]);
      await fixture.whenStable();

      expect(headings(element)).toEqual(['Mitglieder', 'Event verlassen']);
      expect(menus(element)).toHaveLength(0);
    });
  });

  describe('as editor', () => {
    const options = { userId: 'u2' };

    it('has no invites section and no menus', async () => {
      const { element } = await render(options);

      expect(headings(element)).toEqual(['Mitglieder', 'Event verlassen']);
      expect(element.querySelector('app-editor-invite-item')).toBeNull();
      expect(buttonWith(element, 'Einladungslink erstellen')).toBeUndefined();
      expect(menus(element)).toHaveLength(0);
    });

    it('marks the signed-in editor', async () => {
      const { element } = await render(options);

      expect(rowOf(element, 'Ada Lovelace').textContent).toContain('Du');
      expect(rowOf(element, 'Olga Owner').textContent).not.toContain('Du');
    });

    it('leaves only after confirmation, then says so and opens the events', async () => {
      confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      store.leave.mockResolvedValue(true);
      const { element, navigate } = await render(options);

      buttonWith(element, 'Event verlassen')!.click();
      await settle();
      expect(store.leave).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();

      buttonWith(element, 'Event verlassen')!.click();
      await settle();
      expect(confirm).toHaveBeenLastCalledWith(
        expect.objectContaining({ heading: 'Sommerfest verlassen?', variant: 'destructive' }),
      );
      expect(store.leave).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith('Du hast Sommerfest verlassen');
      expect(navigate).toHaveBeenCalledWith(['/events']);
    });

    it('stays and says nothing when leaving fails', async () => {
      confirm.mockResolvedValue(true);
      store.leave.mockResolvedValue(false);
      const { element, navigate } = await render(options);

      buttonWith(element, 'Event verlassen')!.click();
      await settle();

      expect(toast.success).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('shows a refused leave in the leave section, without the text of the owner', async () => {
      const { element } = await render({
        ...options,
        memberMutationState: failed(new Failure('conflict', 'Owner')),
      });

      const alerts = element.querySelectorAll('app-failure-alert');
      expect(alerts).toHaveLength(1);
      expect(alerts[0]!.closest('section')?.getAttribute('aria-labelledby')).toBe(
        'team-page-leave',
      );
      expect(alerts[0]!.textContent).toContain('Das Event konnte nicht verlassen werden');
      expect(element.textContent).not.toContain('die Person ist Gastgeber');
    });
  });

  describe('of a past event', () => {
    const past = { ...EVENT, past: true } as VyteEvent;

    it('says that the team cannot change, offers no invites and no menus to the owner', async () => {
      const { element } = await render({ event: past });

      expect(element.querySelector('app-ui-alert')?.textContent).toContain('Das Event ist vorbei');
      expect(headings(element)).toEqual(['Mitglieder']);
      expect(buttonWith(element, 'Einladungslink erstellen')).toBeUndefined();
      expect(menus(element)).toHaveLength(0);
    });

    it('still lets an editor leave', async () => {
      const { element } = await render({ event: past, userId: 'u2' });

      expect(element.querySelector('app-ui-alert')).not.toBeNull();
      expect(headings(element)).toEqual(['Mitglieder', 'Event verlassen']);
      expect(buttonWith(element, 'Event verlassen')).toBeDefined();
    });

    it('does not show the alert for an upcoming event', async () => {
      const { element } = await render();

      expect(element.querySelector('app-ui-alert')).toBeNull();
    });
  });

  it('has no accessibility violations as owner', async () => {
    const { element } = await render();

    await expect(element).toBeAccessible();
  });

  it('has no accessibility violations as editor', async () => {
    const { element } = await render({ userId: 'u2' });

    await expect(element).toBeAccessible();
  });

  it('has no accessibility violations with failures', async () => {
    const { element } = await render({
      memberMutationState: failed(new Failure('conflict', 'Over')),
      inviteMutationState: failed(new Failure('conflict', 'Too many')),
    });

    await expect(element).toBeAccessible();
  });

  it('has no accessibility violations for a past event', async () => {
    const { element } = await render({ event: { ...EVENT, past: true } as VyteEvent });

    await expect(element).toBeAccessible();
  });
});
