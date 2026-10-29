import {
  afterRenderEffect,
  Component,
  Directive,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { HlmDialogFooter, HlmDialogImports } from '@spartan-ng/helm/dialog';

/**
 * Layout of a dialog opened through `UiDialogService`: heading, optional description, the
 * projected content and an optional `appUiDialogFooter` for the actions. Heading and
 * description are wired up as the accessible name and description of the dialog.
 *
 * @example
 * <app-ui-dialog heading="Notiz umbenennen" description="Der neue Titel gilt sofort.">
 *   <app-form-text [formField]="renameForm.title" label="Titel" />
 *   <div appUiDialogFooter>
 *     <button (click)="_dialogRef.close()" appUiButton variant="outline" type="button">
 *       Abbrechen
 *     </button>
 *     <button (click)="_save()" appUiButton type="button">Speichern</button>
 *   </div>
 * </app-ui-dialog>
 */
@Component({
  selector: 'app-ui-dialog',
  imports: [HlmDialogImports],
  styleUrl: './dialog.scss',
  templateUrl: './dialog.html',
})
export class UiDialog {
  readonly heading = input.required<string>();
  readonly description = input<string>();

  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly _descriptionElement = viewChild<ElementRef<HTMLElement>>('descriptionElement');

  constructor() {
    // Spartan would link the description by changing the dialog config after the container was
    // checked (NG0100). The dialog services switch that off, the attribute is set here instead.
    afterRenderEffect(() => {
      const container = this._host.nativeElement.closest('cdk-dialog-container');
      const id = this._descriptionElement()?.nativeElement.id;
      if (id) {
        container?.setAttribute('aria-describedby', id);
      } else {
        container?.removeAttribute('aria-describedby');
      }
    });
  }
}

/** Action row at the bottom of an `app-ui-dialog`. The primary action goes last. */
@Directive({
  selector: '[appUiDialogFooter]',
  hostDirectives: [HlmDialogFooter],
})
export class UiDialogFooter {}
