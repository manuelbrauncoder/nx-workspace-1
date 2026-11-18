import { CdkMenuTrigger } from '@angular/cdk/menu';
import { Directive, effect, inject, input, TemplateRef } from '@angular/core';
import {
  HlmDropdownMenu,
  HlmDropdownMenuGroup,
  HlmDropdownMenuItem,
  HlmDropdownMenuLabel,
  HlmDropdownMenuSeparator,
  HlmDropdownMenuTrigger,
} from '@spartan-ng/helm/dropdown-menu';
import { classes } from '@spartan-ng/helm/utils';
import { UI_MENU_ITEM_CLASSES, UiMenuRadio } from './menu-radio/menu-radio';

export { UiMenuRadio };

/**
 * Opens the menu in the given `<ng-template>` when its button is activated. Import the menu
 * parts through `UiMenuImports`.
 *
 * @example
 * <button [appUiMenuTrigger]="menu" appUiButton variant="outline" type="button" align="end">
 *   Aktionen
 * </button>
 *
 * <ng-template #menu>
 *   <app-ui-menu class="w-40">
 *     <app-ui-menu-group>
 *       <button (triggered)="_edit()" appUiMenuItem type="button">Bearbeiten</button>
 *       <button (triggered)="_remove()" appUiMenuItem variant="destructive" type="button">
 *         Löschen
 *       </button>
 *     </app-ui-menu-group>
 *   </app-ui-menu>
 * </ng-template>
 */
@Directive({
  selector: '[appUiMenuTrigger]',
  hostDirectives: [{ directive: HlmDropdownMenuTrigger, inputs: ['align', 'side'] }],
})
export class UiMenuTrigger {
  readonly menu = input.required<TemplateRef<unknown>>({ alias: 'appUiMenuTrigger' });

  constructor() {
    // Helm exposes the template under its own input name, so it is handed to the CDK trigger here.
    const trigger = inject(CdkMenuTrigger, { self: true });
    effect(() => {
      trigger.menuTemplateRef = this.menu();
    });
  }
}

/**
 * Menu panel. Lives inside the `<ng-template>` of an `appUiMenuTrigger`. `label` names it for
 * screen readers, e.g. after the trigger ("Einstellungen").
 */
@Directive({
  selector: 'app-ui-menu',
  hostDirectives: [HlmDropdownMenu],
  host: { '[attr.aria-label]': 'label() ?? null' },
})
export class UiMenu {
  readonly label = input<string>();
}

/**
 * Groups related items of an `app-ui-menu`. Required around `appUiMenuRadio` items. `label`
 * names the group for screen readers, e.g. a set of radio items.
 *
 * @example
 * <app-ui-menu-group label="Sprache">
 *   <app-ui-menu-label>Sprache</app-ui-menu-label>
 *   <button [checked]="true" appUiMenuRadio type="button">Deutsch</button>
 * </app-ui-menu-group>
 */
@Directive({
  selector: 'app-ui-menu-group',
  hostDirectives: [HlmDropdownMenuGroup],
  host: { '[attr.aria-label]': 'label() ?? null' },
})
export class UiMenuGroup {
  readonly label = input<string>();
}

/**
 * Small heading above the items of a group. Only for the eye: screen readers get the name from
 * the `label` of the `app-ui-menu-group`, so it is not read twice.
 *
 * @example
 * <app-ui-menu-label>Farbschema</app-ui-menu-label>
 */
@Directive({
  selector: 'app-ui-menu-label',
  hostDirectives: [HlmDropdownMenuLabel],
  host: { 'aria-hidden': 'true' },
})
export class UiMenuLabel {}

/**
 * Thin line between two groups of an `app-ui-menu`.
 *
 * @example
 * <app-ui-menu-separator />
 */
@Directive({
  selector: 'app-ui-menu-separator',
  hostDirectives: [HlmDropdownMenuSeparator],
  host: { role: 'separator' },
})
export class UiMenuSeparator {}

/**
 * Action inside an `app-ui-menu`. Listen to `(triggered)` instead of `(click)`, so keyboard
 * activation is covered as well.
 *
 * @example
 * <button (triggered)="_edit()" appUiMenuItem type="button">Bearbeiten</button>
 */
@Directive({
  selector: 'button[appUiMenuItem]',
  hostDirectives: [{ directive: HlmDropdownMenuItem, inputs: ['disabled', 'variant'] }],
})
export class UiMenuItem {
  constructor() {
    classes(() => UI_MENU_ITEM_CLASSES);
  }
}

export const UiMenuImports = [
  UiMenuTrigger,
  UiMenu,
  UiMenuGroup,
  UiMenuLabel,
  UiMenuSeparator,
  UiMenuItem,
  UiMenuRadio,
] as const;
