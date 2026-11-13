import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiListImports } from './list';

@Component({
  imports: [UiListImports],
  template: `
    <ul appUiList aria-label="Gäste">
      <li appUiListItem>Ada</li>
      <li appUiListItem>Grace</li>
    </ul>
    <ol appUiList aria-label="Schritte">
      <li appUiListItem>Eins</li>
    </ol>
  `,
})
class Host {}

describe('UiList', () => {
  async function render(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('styles ul and ol as a list and keeps the native elements', async () => {
    const element = await render();

    const lists = element.querySelectorAll('ul.ui-list, ol.ui-list');

    expect(lists).toHaveLength(2);
    expect(element.querySelectorAll('ul > li, ol > li')).toHaveLength(3);
  });

  it('marks every row', async () => {
    const element = await render();

    const items = element.querySelectorAll('li');

    expect(items).toHaveLength(3);
    items.forEach((item) => expect(item.classList.contains('ui-list__item')).toBe(true));
    expect(items[0].textContent?.trim()).toBe('Ada');
  });

  it('has no accessibility violations', async () => {
    await expect(await render()).toBeAccessible();
  });
});
