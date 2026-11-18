import { NgTemplateOutlet } from '@angular/common';
import { Component, contentChild, input, TemplateRef } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { HlmCarouselImports } from '@spartan-ng/helm/carousel';
import { UiButton } from '../button/button';
import { UiIcon } from '../icon/icon';

/** What the slide template gets: the item and its position, starting at 0. */
export interface UiCarouselSlideContext<T> {
  $implicit: T;
  index: number;
}

/**
 * Slides side by side, one at a time, e.g. the screenshots of a project: swipe on a touch screen,
 * the arrow buttons below or the arrow keys once a button has the focus. With a single item it
 * shows only that item, without buttons. The template renders one slide and gets the item.
 *
 * @example
 * <app-ui-carousel [items]="project.images" label="Screenshots von Kochwelt">
 *   <ng-template let-image let-index="index">
 *     <img [ngSrc]="image.url" [width]="image.width" [height]="image.height" [alt]="image.alt" />
 *   </ng-template>
 * </app-ui-carousel>
 */
@Component({
  selector: 'app-ui-carousel',
  imports: [HlmCarouselImports, NgTemplateOutlet, TranslatePipe, UiButton, UiIcon],
  styleUrl: './carousel.scss',
  templateUrl: './carousel.html',
})
export class UiCarousel<T> {
  readonly items = input.required<readonly T[]>();
  /** Names the carousel for screen readers, e.g. "Screenshots von Kochwelt". */
  readonly label = input.required<string>();
  /** Name of the button to the previous slide, e.g. "Vorheriges Bild". */
  readonly previousLabel = input<string>();
  /** Name of the button to the next slide, e.g. "Nächstes Bild". */
  readonly nextLabel = input<string>();

  private readonly _slide =
    contentChild.required<TemplateRef<UiCarouselSlideContext<T>>>(TemplateRef);
  // At the last slide "next" goes back to the first, so the buttons never turn disabled and
  // never take the focus away. Embla drops the loop on its own when the slides are too few.
  private readonly _options = { loop: true };
}
