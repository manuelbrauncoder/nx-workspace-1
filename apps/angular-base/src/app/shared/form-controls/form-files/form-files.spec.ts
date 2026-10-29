import { TestBed } from '@angular/core/testing';
import { FormFiles } from './form-files';

const file = (name: string, type = 'image/png', size = 4) =>
  new File(['x'.repeat(size)], name, { type, lastModified: 1 });

describe('FormFiles', () => {
  beforeEach(() => {
    // jsdom has no object URLs.
    URL.createObjectURL = vi.fn((blob: Blob) => `blob:${(blob as File).name}`);
    URL.revokeObjectURL = vi.fn();
  });

  async function render(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(FormFiles);
    fixture.componentRef.setInput('label', 'Bilder');
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const input = element.querySelector<HTMLInputElement>('input[type="file"]')!;

    async function choose(...files: File[]): Promise<void> {
      Object.defineProperty(input, 'files', { value: files, configurable: true });
      input.dispatchEvent(new Event('change'));
      await fixture.whenStable();
    }

    async function drop(...files: File[]): Promise<void> {
      const event = new Event('drop', { cancelable: true });
      Object.defineProperty(event, 'dataTransfer', { value: { files } });
      element.querySelector('.form-files__zone')!.dispatchEvent(event);
      await fixture.whenStable();
    }

    const names = () => fixture.componentInstance.value().map((chosen) => chosen.name);
    const status = () => element.querySelector('[role="status"]')!.textContent!.trim();
    return { fixture, element, input, choose, drop, names, status };
  }

  it('links the label to the file input and passes the allowed types on', async () => {
    const { element, input } = await render({ accept: ['image/png', 'image/jpeg'] });

    expect(element.querySelector('label')!.getAttribute('for')).toBe(input.id);
    expect(input.getAttribute('accept')).toBe('image/png,image/jpeg');
    expect(input.multiple).toBe(true);
  });

  it('takes chosen and dropped files and lists them with a preview', async () => {
    const { element, choose, drop, names } = await render();

    await choose(file('a.png'));
    await drop(file('b.png'));

    expect(names()).toEqual(['a.png', 'b.png']);
    const tiles = element.querySelectorAll('app-ui-attachment');
    expect(tiles).toHaveLength(2);
    expect(tiles[0].querySelector('img')?.getAttribute('src')).toBe('blob:a.png');
    expect(element.textContent).toContain('2 von 10 ausgewählt');
  });

  it('emits touch after a drop', async () => {
    const { fixture, drop } = await render();
    const touched = vi.fn();
    fixture.componentInstance.touch.subscribe(touched);

    await drop(file('a.png'));

    expect(touched).toHaveBeenCalledOnce();
  });

  it('leaves out files of the wrong type and files that are too large', async () => {
    const { choose, names, status } = await render({ accept: ['image/png'], maxFileSize: 10 });

    await choose(file('a.pdf', 'application/pdf'), file('big.png', 'image/png', 11), file('c.png'));

    expect(names()).toEqual(['c.png']);
    expect(status()).toContain('a.pdf: Dieser Dateityp ist nicht erlaubt.');
    expect(status()).toContain('big.png: Die Datei ist größer als');
  });

  it('stops at maxFiles and locks the zone', async () => {
    const { input, choose, names, status } = await render({ maxFiles: 2 });

    await choose(file('a.png'), file('b.png'), file('c.png'));

    expect(names()).toEqual(['a.png', 'b.png']);
    expect(status()).toContain('Es sind höchstens 2 Dateien möglich, 1 wurden nicht übernommen.');
    expect(input.disabled).toBe(true);
  });

  it('ignores a file that is already chosen', async () => {
    const { choose, names, status } = await render();

    await choose(file('a.png'));
    await choose(file('a.png'));

    expect(names()).toEqual(['a.png']);
    expect(status()).toBe('');
  });

  it('removes a file and releases its preview', async () => {
    const { element, fixture, choose, names } = await render();
    await choose(file('a.png'), file('b.png'));

    element.querySelector<HTMLButtonElement>('button[aria-label="Entfernen: a.png"]')!.click();
    await fixture.whenStable();

    expect(names()).toEqual(['b.png']);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:a.png');
  });

  it('takes nothing while disabled', async () => {
    const { input, drop, names } = await render({ disabled: true });

    await drop(file('a.png'));

    expect(input.disabled).toBe(true);
    expect(names()).toEqual([]);
  });

  it('shows the errors of a touched control', async () => {
    const { element, input } = await render({
      errors: [{ kind: 'required', message: 'Bitte wähle ein Bild.' }],
      touched: true,
    });

    const alert = element.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain('Bitte wähle ein Bild.');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(alert.id);
  });
});
