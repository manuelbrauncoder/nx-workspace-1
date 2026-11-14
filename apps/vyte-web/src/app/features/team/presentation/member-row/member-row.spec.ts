import { TestBed } from '@angular/core/testing';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { Member } from '../../domain/team';
import { teamPageI18n } from '../team-page/team-page.i18n';
import { MemberRow } from './member-row';

const MEMBER: Member = {
  userId: 'u2',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  role: 'editor',
  joinedAt: new Date('2026-11-01T09:00:00.000Z'),
};

describe('MemberRow', () => {
  async function render(member: Partial<Member> = {}, inputs: Record<string, unknown> = {}) {
    await loadI18nScopes(teamPageI18n);
    const fixture = TestBed.createComponent(MemberRow);
    fixture.componentRef.setInput('member', { ...MEMBER, ...member });
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    return { fixture, element };
  }

  const trigger = () =>
    document.querySelector<HTMLButtonElement>('button[aria-label^="Aktionen für"]');
  const chips = (element: HTMLElement) =>
    Array.from(element.querySelectorAll('[appUiBadge], [data-slot="badge"]'), (chip) =>
      chip.textContent?.trim(),
    );

  it('shows the name as a heading and the email below it', async () => {
    const { element } = await render();

    expect(element.querySelector('h3')?.textContent?.trim()).toBe('Ada Lovelace');
    expect(element.querySelector('.member-row__email')?.textContent?.trim()).toBe(
      'ada@example.com',
    );
  });

  it('shows the email once, as the heading, when there is no name', async () => {
    const { element } = await render({ name: null });

    expect(element.querySelector('h3')?.textContent?.trim()).toBe('ada@example.com');
    expect(element.querySelector('.member-row__email')).toBeNull();
    expect(element.textContent?.match(/ada@example\.com/g)).toHaveLength(1);
  });

  it('shows an editor as Mitplaner without the owner mark', async () => {
    const { element } = await render();

    expect(chips(element)).toEqual(['Mitplaner']);
    expect(element.querySelector('[data-slot="badge"].bg-secondary')).toBeNull();
    expect(element.querySelector('app-ui-icon')?.getAttribute('name') ?? 'user').toBe('user');
  });

  it('shows the owner as Gastgeber with the owner mark', async () => {
    const { element } = await render({ role: 'owner' });

    expect(chips(element)).toEqual(['Gastgeber']);
    expect(element.querySelector('[data-slot="badge"].bg-secondary')).not.toBeNull();
  });

  it('marks the signed-in user with "Du"', async () => {
    const { element } = await render({}, { isMe: true });

    expect(chips(element)).toEqual(['Mitplaner', 'Du']);
  });

  it('shows since when the member is part of the team', async () => {
    const { element } = await render();

    expect(element.querySelector('.member-row__meta')?.textContent).toContain(
      'Dabei seit 01.11.2026',
    );
  });

  it('has no menu unless the member is manageable', async () => {
    const { element } = await render();

    expect(element.querySelector('button')).toBeNull();
  });

  it('offers a menu named after the member when manageable', async () => {
    const { element } = await render({}, { manageable: true });

    expect(element.querySelector('button[aria-label="Aktionen für Ada Lovelace"]')).not.toBeNull();
  });

  it('names the menu after the email when there is no name', async () => {
    const { element } = await render({ name: null }, { manageable: true });

    expect(
      element.querySelector('button[aria-label="Aktionen für ada@example.com"]'),
    ).not.toBeNull();
  });

  it('emits handOver and remove from the menu', async () => {
    const { fixture } = await render({}, { manageable: true });
    const handOver = vi.fn();
    const remove = vi.fn();
    fixture.componentInstance.handOver.subscribe(handOver);
    fixture.componentInstance.remove.subscribe(remove);

    for (const [label, spy] of [
      ['Event übergeben', handOver],
      ['Entfernen', remove],
    ] as const) {
      trigger()!.click();
      await fixture.whenStable();
      const item = Array.from(
        document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
      ).find((candidate) => candidate.textContent?.includes(label));
      expect(item, label).toBeDefined();
      item!.click();
      await fixture.whenStable();
      expect(spy, label).toHaveBeenCalledTimes(1);
    }
    expect(handOver).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations', async () => {
    const { element } = await render({}, { manageable: true, isMe: true });

    await expect(element).toBeAccessible();
  });

  it('has no accessibility violations for an owner without a name', async () => {
    const { element } = await render({ role: 'owner', name: null });

    await expect(element).toBeAccessible();
  });
});
