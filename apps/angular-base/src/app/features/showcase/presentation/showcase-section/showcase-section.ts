import { Component, input } from '@angular/core';

/** Titled block used by all showcase pages. */
@Component({
  selector: 'app-showcase-section',
  styleUrl: './showcase-section.scss',
  templateUrl: './showcase-section.html',
})
export class ShowcaseSection {
  readonly heading = input.required<string>();
  readonly description = input<string>();
}
