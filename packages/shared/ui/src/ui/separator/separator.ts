import { Directive } from '@angular/core';
import { BrnSeparator } from '@spartan-ng/brain/separator';
import { hlmSeparatorClass } from '@spartan-ng/helm/separator';
import { classes } from '@spartan-ng/helm/utils';

/**
 * A thin line between two parts of a page, e.g. between the description and the images of an
 * event, or between items side by side with `orientation="vertical"`. Decorative: screen readers
 * skip it, the headings carry the structure. Spacing comes from the page, not from the line.
 * Built from the brain directive and the classes of the helm separator, because the helm
 * directive does not pass `orientation` on to a host.
 *
 * @example
 * <div appUiSeparator></div>
 * <span appUiSeparator orientation="vertical"></span>
 */
@Directive({
  selector: '[appUiSeparator]',
  hostDirectives: [{ directive: BrnSeparator, inputs: ['orientation'] }],
  host: { 'data-slot': 'separator' },
})
export class UiSeparator {
  constructor() {
    classes(() => hlmSeparatorClass);
  }
}
