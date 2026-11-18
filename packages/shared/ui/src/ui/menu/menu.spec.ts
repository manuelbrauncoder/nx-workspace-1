import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiButton } from '../button/button';
import { UiMenuImports } from './menu';

@Component({
  selector: 'app-menu-host',
  imports: [UiButton, UiMenuImports],
  template: `
    <button [appUiMenuTrigger]="menu" appUiButton type="button">Einstellungen</button>
    <ng-template #menu>
      <app-ui-menu>
        <app-ui-menu-group label="Sprache">
          <app-ui-menu-label>Sprache</app-ui-menu-label>
          <button [checked]="true" appUiMenuRadio type="button">Deutsch</button>
          <button [checked]="false" appUiMenuRadio type="button">English</button>
        </app-ui-menu-group>
        <app-ui-menu-separator />
        <app-ui-menu-group label="Farbschema">
          <app-ui-menu-label>Farbschema</app-ui-menu-label>
          <button [checked]="true" appUiMenuRadio type="button">Hell</button>
          <button [checked]="false" appUiMenuRadio type="button">Dunkel</button>
        </app-ui-menu-group>
        <app-ui-menu-group>
          <button appUiMenuItem type="button">Ohne Label</button>
        </app-ui-menu-group>
      </app-ui-menu>
    </ng-template>
  `,
})
class MenuHost {}

describe('UiMenu parts', () => {
  afterEach(() => document.body.replaceChildren());

  async function openMenu() {
    const fixture = TestBed.createComponent(MenuHost);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('button')!.click();
    await fixture.whenStable();
    return document.querySelector<HTMLElement>('[role="menu"]')!;
  }

  it('names each group by its label', async () => {
    const menu = await openMenu();

    const groups = menu.querySelectorAll('app-ui-menu-group');
    expect(groups[0].getAttribute('aria-label')).toBe('Sprache');
    expect(groups[1].getAttribute('aria-label')).toBe('Farbschema');
  });

  it('sets no aria-label on a group without a label', async () => {
    const menu = await openMenu();

    const groups = menu.querySelectorAll('app-ui-menu-group');
    expect(groups[2].hasAttribute('aria-label')).toBe(false);
  });

  it('hides the visible label from screen readers', async () => {
    const menu = await openMenu();

    const labels = menu.querySelectorAll('app-ui-menu-label');
    expect(labels).toHaveLength(2);
    labels.forEach((label) => expect(label.getAttribute('aria-hidden')).toBe('true'));
  });

  it('renders the separator with its role', async () => {
    const menu = await openMenu();

    expect(menu.querySelector('app-ui-menu-separator')?.getAttribute('role')).toBe('separator');
  });

  it('passes the accessibility check while open', async () => {
    const menu = await openMenu();

    await expect(menu).toBeAccessible();
  });
});
