import { TestBed } from '@angular/core/testing';
import { create } from 'qrcode';
import { UiQrCode } from './qr-code';

describe('UiQrCode', () => {
  const VALUE = 'https://vyte.example/stand/abc';

  async function render(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(UiQrCode);
    fixture.componentRef.setInput('value', VALUE);
    fixture.componentRef.setInput('label', 'QR-Code der Upload-Seite');
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    return { fixture, svg: element.querySelector('svg')!, path: element.querySelector('path')! };
  }

  it('is an image named by its label', async () => {
    const { svg } = await render();

    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('QR-Code der Upload-Seite');
  });

  it('draws every dark module of the code, inside a quiet zone of four modules', async () => {
    const { svg, path } = await render();
    const { modules } = create(VALUE, { errorCorrectionLevel: 'M' });
    const dark = Array.from(modules.data).filter(Boolean).length;

    expect(svg.getAttribute('viewBox')).toBe(`0 0 ${modules.size + 8} ${modules.size + 8}`);
    expect(path.getAttribute('d')!.match(/M/g)).toHaveLength(dark);
    // The top left finder pattern starts at the quiet zone.
    expect(path.getAttribute('d')).toMatch(/^M4 4h1v1h-1z/);
  });

  it('grows with a higher error correction', async () => {
    const low = await render({ errorCorrection: 'L' });
    const lowSize = low.svg.getAttribute('viewBox');
    const high = await render({ errorCorrection: 'H' });

    expect(high.svg.getAttribute('viewBox')).not.toBe(lowSize);
  });

  it('follows a new value', async () => {
    const { fixture, path } = await render();
    const before = path.getAttribute('d');

    fixture.componentRef.setInput('value', 'https://vyte.example/photos/xyz');
    await fixture.whenStable();

    expect(path.getAttribute('d')).not.toBe(before);
  });

  it('has no accessibility violations', async () => {
    const { fixture } = await render();

    await expect(fixture.nativeElement).toBeAccessible();
  });
});
