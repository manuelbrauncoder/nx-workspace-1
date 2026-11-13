import { Component, computed, input } from '@angular/core';
import { create, type QRCodeErrorCorrectionLevel } from 'qrcode';

/** How much of the code may be covered or dirty and still read. `M` is about 15 %. */
export type UiQrCodeErrorCorrection = 'L' | 'M' | 'Q' | 'H';

/** Light modules around the code, which scanners need to find it. */
const QUIET_ZONE = 4;

/**
 * A QR code as an SVG, sharp in print and the same on the server and in the browser. It is as
 * large as its container and drawn black on white in every theme, as scanners need it.
 *
 * @example
 * <app-ui-qr-code value="https://vyte.example/stand/abc" label="QR-Code der Upload-Seite" />
 */
@Component({
  selector: 'app-ui-qr-code',
  styleUrl: './qr-code.scss',
  templateUrl: './qr-code.html',
})
export class UiQrCode {
  /** The text the code holds, usually an address. */
  readonly value = input.required<string>();
  /** Name of the image for assistive tech, e.g. what the code leads to. */
  readonly label = input.required<string>();
  readonly errorCorrection = input<UiQrCodeErrorCorrection>('M');

  /** The dark modules as one path, each a 1 × 1 square, shifted by the quiet zone. */
  private readonly _code = computed(() => {
    const { modules } = create(this.value(), {
      errorCorrectionLevel: this.errorCorrection() as QRCodeErrorCorrectionLevel,
    });
    const size = modules.size;
    const parts: string[] = [];
    for (let row = 0; row < size; row++) {
      for (let column = 0; column < size; column++) {
        if (modules.get(row, column)) {
          parts.push(`M${column + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`);
        }
      }
    }
    return {
      path: parts.join(''),
      viewBox: `0 0 ${size + 2 * QUIET_ZONE} ${size + 2 * QUIET_ZONE}`,
    };
  });
}
