import { Component, input } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { TranslationKey } from '@core/i18n/translation-key';
import { HlmBreadcrumbImports } from '@spartan-ng/helm/breadcrumb';

export interface UiBreadcrumbItem {
  labelKey: TranslationKey;
  /** Absolute route path. The last item is the current page and is never a link. */
  path?: string;
}

/**
 * Where the current page sits, as a trail of links from the top level down to it. The last item
 * is the current page, marked with `aria-current="page"`.
 *
 * @example
 * <!-- _breadcrumb: UiBreadcrumbItem[] = [
 *   { labelKey: 'admin.areas.hub', path: '/admin' },
 *   { labelKey: 'admin.areas.users' },
 * ] -->
 * <app-ui-breadcrumb [items]="_breadcrumb" />
 */
@Component({
  selector: 'app-ui-breadcrumb',
  imports: [HlmBreadcrumbImports, TranslatePipe],
  styleUrl: './breadcrumb.scss',
  templateUrl: './breadcrumb.html',
})
export class UiBreadcrumb {
  readonly items = input.required<UiBreadcrumbItem[]>();
  /** Accessible name of the navigation, defaults to `common.breadcrumb`. */
  readonly label = input<string>();
}
