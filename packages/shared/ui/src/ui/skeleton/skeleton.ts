import { Directive } from '@angular/core';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';

/**
 * Pulsing placeholder for content that is still loading. Give it its size through classes and
 * hide the group of skeletons from assistive technology.
 *
 * @example
 * <div aria-hidden="true">
 *   <div class="h-8 w-1/3" appUiSkeleton></div>
 *   <div class="h-24" appUiSkeleton></div>
 * </div>
 */
@Directive({
  selector: '[appUiSkeleton]',
  hostDirectives: [HlmSkeleton],
})
export class UiSkeleton {}
