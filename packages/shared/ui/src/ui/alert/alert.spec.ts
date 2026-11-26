import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiAlert, UiAlertAction } from './alert';

@Component({
  imports: [UiAlert, UiAlertAction],
  template: `
    <app-ui-alert heading="Speichern fehlgeschlagen">
      Der Server ist nicht erreichbar.
      @if (withAction()) {
        <button appUiAlertAction type="button">Erneut versuchen</button>
      }
    </app-ui-alert>
  `,
})
class Host {
  readonly withAction = input(true);
}

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

  describe('action', () => {
    async function renderHost(withAction: boolean) {
      const fixture = TestBed.createComponent(Host);
      fixture.componentRef.setInput('withAction', withAction);
      await fixture.whenStable();
      return fixture.nativeElement as HTMLElement;
    }

    it('places the projected button in the action slot after the description', async () => {
      const element = await renderHost(true);

      const button = element.querySelector('button')!;
      const slot = element.querySelector('.ui-alert__action')!;
      const description = element.querySelector('[data-slot="alert-description"]');
      expect(slot.contains(button)).toBe(true);
      expect(description?.contains(button)).toBe(false);
      expect(description?.compareDocumentPosition(slot)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(description?.textContent).toContain('Der Server ist nicht erreichbar.');
    });

    it('does not position the action absolutely like the helm action', async () => {
      const element = await renderHost(true);

      const slot = element.querySelector('.ui-alert__action')!;
      expect(slot.classList.contains('absolute')).toBe(false);
      expect(element.querySelector('button')?.closest('.absolute')).toBeNull();
    });

    it('leaves the action slot empty without an action', async () => {
      const element = await renderHost(false);

      const slot = element.querySelector('.ui-alert__action')!;
      expect(slot.children).toHaveLength(0);
      expect(slot.textContent?.trim()).toBe('');
    });

    it('has no accessibility violations with an action', async () => {
      await expect(await renderHost(true)).toBeAccessible();
    });
  });
});
