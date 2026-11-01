import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { DartThrow } from '../../domain/game';
import { gamePageI18n } from '../game-page/game-page.i18n';
import { DartKeypad } from './dart-keypad';

@Component({
  imports: [DartKeypad],
  template: `<app-dart-keypad (dartThrown)="darts.push($event)" />`,
})
class Host {
  readonly darts: DartThrow[] = [];
}

describe('DartKeypad', () => {
  async function render() {
    await loadI18nScopes(gamePageI18n);
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const button = (label: string) =>
      [...element.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;
    const click = async (label: string) => {
      button(label).click();
      await fixture.whenStable();
    };
    return { darts: fixture.componentInstance.darts, click };
  }

  it('throws a single by default and the chosen ring once', async () => {
    const { darts, click } = await render();
    await click('20');
    await click('Triple');
    await click('19');
    await click('7');

    expect(darts).toEqual([
      { multiplier: 1, value: 20 },
      { multiplier: 3, value: 19 },
      { multiplier: 1, value: 7 },
    ]);
  });

  it('maps the bull, the double bull and a miss', async () => {
    const { darts, click } = await render();
    await click('Triple');
    await click('Bull 25');
    await click('Bull 50');
    await click('Double');
    await click('Miss');

    expect(darts).toEqual([
      { multiplier: 1, value: 25 },
      { multiplier: 2, value: 25 },
      { multiplier: 1, value: 0 },
    ]);
  });
});
