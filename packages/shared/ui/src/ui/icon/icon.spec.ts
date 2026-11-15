import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiIcon } from './icon';

@Component({
  imports: [UiIcon],
  template: `
    <p>
      Text
      <app-ui-icon id="inherit" name="plus" />
      <app-ui-icon id="small" name="plus" size="sm" />
      <app-ui-icon id="large" name="user" size="lg" />
      <app-ui-icon id="labelled" name="trash" label="Löschen" />
    </p>
  `,
})
class Host {}

describe('UiIcon', () => {
  async function render(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  const sizeOf = (root: HTMLElement, id: string) =>
    root.querySelector<HTMLElement>(`#${id} ng-icon`)!.style.getPropertyValue('--ng-icon__size');

  it('is as large as the text around it without a size', async () => {
    expect(sizeOf(await render(), 'inherit')).toBe('1em');
  });

  it('takes a fixed size from the size input', async () => {
    const root = await render();

    expect(sizeOf(root, 'small')).toBe('1rem');
    expect(sizeOf(root, 'large')).toBe('1.5rem');
  });

  it('is decorative without a label and an image with one', async () => {
    const root = await render();

    expect(root.querySelector('#inherit')!.getAttribute('aria-hidden')).toBe('true');
    const labelled = root.querySelector('#labelled')!;
    expect(labelled.getAttribute('role')).toBe('img');
    expect(labelled.getAttribute('aria-label')).toBe('Löschen');
    expect(labelled.hasAttribute('aria-hidden')).toBe(false);
  });

  it('has no accessibility violations', async () => {
    await expect(await render()).toBeAccessible();
  });
});
