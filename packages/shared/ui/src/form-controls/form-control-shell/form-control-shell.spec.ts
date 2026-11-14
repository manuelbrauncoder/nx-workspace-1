import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FormCheckbox } from '../form-checkbox/form-checkbox';
import { FormDate } from '../form-date/form-date';
import { FormSelect } from '../form-select/form-select';
import { FormSwitch } from '../form-switch/form-switch';
import { FormText } from '../form-text/form-text';
import { FormTextarea } from '../form-textarea/form-textarea';

/**
 * The shell stylesheet as plain CSS for jsdom, which gets no component styles in specs. `:host` and
 * `::ng-deep` become a plain descendant selector, as Angular's emulated encapsulation does it.
 */
function shellStyles(): string {
  return readFileSync(join(import.meta.dirname, 'form-control-shell.scss'), 'utf8')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/:host\s+::ng-deep/g, 'app-form-control-shell')
    .replaceAll(':host', 'app-form-control-shell');
}

describe('FormControlShell', () => {
  let style: HTMLStyleElement;

  beforeEach(() => {
    style = document.createElement('style');
    style.textContent = shellStyles();
    document.head.append(style);
    // jsdom has no ResizeObserver, the select trigger measures itself with one.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      },
    );
  });

  afterEach(() => {
    style.remove();
    vi.unstubAllGlobals();
  });

  const errors = [{ kind: 'required', message: 'Bitte ausfüllen.' }];

  const controls: [string, Type<unknown>, Record<string, unknown>][] = [
    ['FormText', FormText, {}],
    ['FormTextarea', FormTextarea, {}],
    ['FormSelect', FormSelect, { options: [{ value: 'a', label: 'A' }] }],
    ['FormDate', FormDate, {}],
    ['FormCheckbox', FormCheckbox, {}],
    ['FormSwitch', FormSwitch, {}],
  ];

  // Spartan styles a focused invalid control like an unfocused one, the outline of the shell is the
  // only sign of focus there.
  it.each(controls)('outlines the focused control of an invalid %s', async (_, type, inputs) => {
    const fixture = TestBed.createComponent(type);
    fixture.componentRef.setInput('label', 'Feld');
    for (const [name, value] of Object.entries({ ...inputs, errors, touched: true })) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const control = element.querySelector<HTMLElement>(
      `#${element.querySelector('label')!.htmlFor}`,
    )!;

    expect(element.querySelector('[data-matches-spartan-invalid="true"]')).not.toBeNull();
    // jsdom keeps the shorthand as written and does not split it into `outline-style` and so on.
    expect(getComputedStyle(control).getPropertyValue('outline')).toBe('');

    control.focus();

    expect(document.activeElement).toBe(control);
    const focused = getComputedStyle(control);
    expect(focused.getPropertyValue('outline')).toBe('2px solid var(--ring)');
    expect(focused.outlineOffset).toBe('2px');
  });
});
