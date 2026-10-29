import { CdkMenuTrigger } from '@angular/cdk/menu';
import { Directive, effect, inject, input, TemplateRef } from '@angular/core';
import {
  HlmDropdownMenu,
  HlmDropdownMenuGroup,
  HlmDropdownMenuItem,
  HlmDropdownMenuTrigger,
} from '@spartan-ng/helm/dropdown-menu';
import { UiMenuRadio } from './menu-radio/menu-radio';

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

/** Menu panel. Lives inside the `<ng-template>` of an `appUiMenuTrigger`. */
@Directive({
  selector: 'app-ui-menu',
  hostDirectives: [HlmDropdownMenu],
})
export class UiMenu {}

/** Groups related items of an `app-ui-menu`. Required around `appUiMenuRadio` items. */
@Directive({
  selector: 'app-ui-menu-group',
  hostDirectives: [HlmDropdownMenuGroup],
})
export class UiMenuGroup {}

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
export class UiMenuItem {}

export const UiMenuImports = [UiMenuTrigger, UiMenu, UiMenuGroup, UiMenuItem, UiMenuRadio] as const;
