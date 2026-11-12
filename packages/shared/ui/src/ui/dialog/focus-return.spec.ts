import { focusReturnTarget } from './focus-return';

describe('focusReturnTarget', () => {
  afterEach(() => document.body.replaceChildren());

  it('keeps the default for an element outside of a menu', () => {
    document.body.innerHTML = '<button id="plain">Löschen</button>';
    document.querySelector<HTMLButtonElement>('#plain')!.focus();

    expect(focusReturnTarget(document)).toBe(true);
  });

  it('returns to the trigger of the menu an item belongs to', () => {
    document.body.innerHTML = `
      <button id="trigger" aria-controls="menu-1">Aktionen</button>
      <div id="menu-1" role="menu"><button id="item" role="menuitem">Löschen</button></div>`;
    document.querySelector<HTMLButtonElement>('#item')!.focus();

    expect(focusReturnTarget(document)).toBe(document.querySelector('#trigger'));
  });
});
