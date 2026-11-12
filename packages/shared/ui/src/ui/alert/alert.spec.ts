import { TestBed } from '@angular/core/testing';
import { UiAlert } from './alert';

describe('UiAlert', () => {
  async function render(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(UiAlert);
    fixture.componentRef.setInput('heading', 'Speichern fehlgeschlagen');
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('is announced and names itself through a heading of level 2', async () => {
    const element = await render();

    const heading = element.querySelector('[role="heading"]');
    expect(element.querySelector('[role="alert"]')).not.toBeNull();
    expect(heading?.textContent?.trim()).toBe('Speichern fehlgeschlagen');
    expect(heading?.getAttribute('aria-level')).toBe('2');
  });

  it('takes the level of the section it sits in', async () => {
    const element = await render({ headingLevel: 4 });

    expect(element.querySelector('[role="heading"]')?.getAttribute('aria-level')).toBe('4');
  });

  it('has no accessibility violations', async () => {
    await expect(await render()).toBeAccessible();
  });
});
