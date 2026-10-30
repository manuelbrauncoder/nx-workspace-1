import { Directive } from '@angular/core';
import {
  HlmCard,
  HlmCardContent,
  HlmCardDescription,
  HlmCardFooter,
  HlmCardHeader,
  HlmCardTitle,
} from '@spartan-ng/helm/card';

/**
 * Card surface. Works on any element, e.g. an `article` or a link. The parts below are optional
 * and go inside in this order: header (with title and description), content, footer.
 * Import all of them through `UiCardImports`.
 *
 * @example
 * <article appUiCard>
 *   <div appUiCardHeader>
 *     <h2 appUiCardTitle>Einkauf</h2>
 *     <p appUiCardDescription>Geändert am 12.01.2026</p>
 *   </div>
 *   <p appUiCardContent>Milch, Brot</p>
 *   <div appUiCardFooter>
 *     <a appUiButton variant="outline" size="sm" routerLink="edit">Bearbeiten</a>
 *   </div>
 * </article>
 */
@Directive({
  selector: '[appUiCard]',
  hostDirectives: [HlmCard],
})
export class UiCard {}

/** Top area of an `appUiCard`, holds the title and the description. */
@Directive({
  selector: '[appUiCardHeader]',
  hostDirectives: [HlmCardHeader],
})
export class UiCardHeader {}

/** Title inside an `appUiCardHeader`. Put it on the heading element that fits the page outline. */
@Directive({
  selector: '[appUiCardTitle]',
  hostDirectives: [HlmCardTitle],
})
export class UiCardTitle {}

/** Muted line below the title inside an `appUiCardHeader`. */
@Directive({
  selector: '[appUiCardDescription]',
  hostDirectives: [HlmCardDescription],
})
export class UiCardDescription {}

/** Main area of an `appUiCard`. */
@Directive({
  selector: '[appUiCardContent]',
  hostDirectives: [HlmCardContent],
})
export class UiCardContent {}

/** Bottom area of an `appUiCard`, usually for actions. */
@Directive({
  selector: '[appUiCardFooter]',
  hostDirectives: [HlmCardFooter],
})
export class UiCardFooter {}

export const UiCardImports = [
  UiCard,
  UiCardHeader,
  UiCardTitle,
  UiCardDescription,
  UiCardContent,
  UiCardFooter,
] as const;
