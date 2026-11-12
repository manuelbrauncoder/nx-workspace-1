import { NgTemplateOutlet } from '@angular/common';
import { Component, input } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { TranslationKey } from '@core/i18n/translation-key';
import { HlmBreadcrumbImports } from '@spartan-ng/helm/breadcrumb';

/**
 * One step of the trail: a translation key for fixed labels, or `label` for a text that comes
 * from data, such as the title of an event.
 */
export type UiBreadcrumbItem = {
  /** Absolute route path. The last item is the current page and is never a link. */
  path?: string;
} & ({ labelKey: TranslationKey; label?: undefined } | { label: string; labelKey?: undefined });

/**
 * Where the current page sits, as a trail of links from the top level down to it. The last item
 * is the current page, marked with `aria-current="page"`.
 *
 * @example
 * <!-- _breadcrumb: UiBreadcrumbItem[] = [
 *   { labelKey: 'admin.areas.hub', path: '/admin' },
 *   { labelKey: 'admin.areas.users' },
 * ] -->
 * <!-- or with a text from data: { label: event.title } -->
 * <app-ui-breadcrumb [items]="_breadcrumb" />
 */
@Component({
  selector: 'app-ui-breadcrumb',
  imports: [NgTemplateOutlet, HlmBreadcrumbImports, TranslatePipe],
  styleUrl: './breadcrumb.scss',
  templateUrl: './breadcrumb.html',
})
export class UiBreadcrumb {
  readonly items = input.required<UiBreadcrumbItem[]>();
  /** Accessible name of the navigation, defaults to `common.breadcrumb`. */
  readonly label = input<string>();
}
