import { TestBed } from '@angular/core/testing';
import { FormRichText } from './form-rich-text';

describe('FormRichText', () => {
  beforeEach(() => {
    // jsdom has no layout, the editor measures the cursor to scroll it into view.
    const rect = { top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0 } as DOMRect;
    Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
    Range.prototype.getBoundingClientRect = () => rect;
  });

  async function render(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(FormRichText);
    fixture.componentRef.setInput('label', 'Inhalt');
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const button = (label: string) =>
      element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
    return {
      fixture,
      element,
      button,
      editor: element.querySelector<HTMLElement>('[role="textbox"]')!,
    };
  }

  it('names the editor by the label', async () => {
    const { element, editor } = await render({ required: true });

    expect(editor.getAttribute('aria-labelledby')).toBe(element.querySelector('label')!.id);
    expect(editor.getAttribute('aria-required')).toBe('true');
    expect(editor.isContentEditable || editor.getAttribute('contenteditable')).toBeTruthy();
  });

  it('shows errors only once touched', async () => {
    const errors = [{ kind: 'required', message: 'Bitte gib einen Inhalt ein.' }];
    const { fixture, element, editor } = await render({ errors });
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(editor.getAttribute('aria-invalid')).toBeNull();

    fixture.componentRef.setInput('touched', true);
    await fixture.whenStable();

    const alert = element.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain('Bitte gib einen Inhalt ein.');
    expect(editor.getAttribute('aria-invalid')).toBe('true');
    expect(editor.getAttribute('aria-describedby')).toBe(alert.id);
  });

  it('shows a value set from outside', async () => {
    const { fixture, editor } = await render({ value: '<p>Milch</p>' });
    expect(editor.querySelector('p')?.textContent).toBe('Milch');

    fixture.componentRef.setInput('value', '<h2>Brot</h2>');
    await fixture.whenStable();

    expect(editor.querySelector('h2')?.textContent).toBe('Brot');
  });

  it('writes a formatting change into the value', async () => {
    const { fixture, button } = await render({ value: '<p>Milch</p>' });

    button('Überschrift').click();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe('<h2>Milch</h2>');
    expect(button('Überschrift').getAttribute('aria-pressed')).toBe('true');
    expect(button('Rückgängig').disabled).toBe(false);
  });

  it('reports an editor without text as an empty value', async () => {
    const { fixture, button } = await render({ value: '<p>Milch</p>' });
    button('Überschrift').click();

    fixture.componentRef.setInput('value', '');
    await fixture.whenStable();
    button('Überschrift').click();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe('');
  });

  it('drops everything outside the allowed formats without running it', async () => {
    const run = vi.fn();
    vi.stubGlobal('injected', run);
    const { fixture, editor, button } = await render({
      value:
        '<p class="fixed" onclick="injected()">Milch</p><img src="x" onerror="injected()">' +
        '<script>injected()</script><p><a href="javascript:injected()">Brot</a></p>',
    });

    expect(editor.querySelector('img, script, a, [onclick], .fixed')).toBeNull();

    button('Überschrift').click();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe('<p>Milch</p><h2>Brot</h2>');
    expect(run).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('keeps links within the site only in the profile page', async () => {
    const value = '<p><a href="/privacy">Datenschutz</a></p>';
    const text = await render({ value });
    expect(text.editor.querySelector('a')).toBeNull();

    const page = await render({ value, profile: 'page' });
    page.button('Überschrift').click();
    await page.fixture.whenStable();

    expect(page.fixture.componentInstance.value()).toBe(
      '<h2><a href="/privacy">Datenschutz</a></h2>',
    );
  });

  it('emits touch only when focus leaves the whole control', async () => {
    const { fixture, editor, button } = await render();
    const touched = vi.fn();
    fixture.componentInstance.touch.subscribe(touched);

    editor.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: button('Fett') }),
    );
    expect(touched).not.toHaveBeenCalled();

    editor.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    expect(touched).toHaveBeenCalledOnce();
  });

  it('locks the editor and the toolbar while disabled', async () => {
    const { editor, button } = await render({ disabled: true });

    expect(editor.getAttribute('contenteditable')).toBe('false');
    expect(editor.getAttribute('aria-disabled')).toBe('true');
    expect(button('Fett').disabled).toBe(true);
  });

  it('marks the language of the text on the editor, not on the label or toolbar', async () => {
    const { element, editor } = await render({ contentLang: 'en' });

    expect(editor.getAttribute('lang')).toBe('en');
    expect(element.querySelector('[lang]')).toBe(editor);
    await expect(element).toBeAccessible();
  });

  it('leaves the language to the page by default', async () => {
    const { editor } = await render();

    expect(editor.hasAttribute('lang')).toBe(false);
  });
});
