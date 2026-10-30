import { Component, computed, input } from '@angular/core';
import { ColorToken } from '../color-tokens';

@Component({
  selector: 'app-color-swatch',
  styleUrl: './color-swatch.scss',
  templateUrl: './color-swatch.html',
})
export class ColorSwatch {
  readonly token = input.required<ColorToken>();
  /** Resolved value of the token in the active theme. */
  readonly value = input<string>();

  private readonly _background = computed(() => `var(--${this.token().name})`);
  private readonly _foreground = computed(() => {
    const foreground = this.token().foreground;
    return foreground ? `var(--${foreground})` : null;
  });
}
