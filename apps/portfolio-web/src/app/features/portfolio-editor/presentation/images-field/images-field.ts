import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  viewChild,
} from '@angular/core';
import { FieldTree } from '@angular/forms/signals';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiText } from '@shared/ui/text/text';
import { ImageField } from '../image-field/image-field';
import { ImageForm, toImageForm } from '../image-field/image-form';
import { ListItemActions } from '../list-item-actions/list-item-actions';
import { moveItem } from '../section-form/section-save';

let nextId = 0;

/**
 * Several images in the order they are shown, e.g. the screenshots of a project: each one with
 * upload, library and alt text, moved up or down or removed, and a button for one more. The first
 * one is the cover. Rules on the list itself (at least one) come from the form schema.
 */
@Component({
  selector: 'app-images-field',
  imports: [TranslatePipe, UiButton, UiIcon, UiText, ImageField, ListItemActions],
  styleUrl: './images-field.scss',
  templateUrl: './images-field.html',
})
export class ImagesField {
  readonly field = input.required<FieldTree<ImageForm[]>>();
  readonly label = input.required<string>();
  readonly description = input<string>();
  /** How many images the list may hold. */
  readonly max = input.required<number>();

  private readonly _injector = inject(Injector);
  private readonly _id = `images-field-${nextId++}`;
  private readonly _descriptionId = `${this._id}-description`;
  private readonly _errorId = `${this._id}-error`;
  // The button carries `UiButton`, so the element has to be asked for.
  private readonly _addButton = viewChild.required('addButton', {
    read: ElementRef<HTMLButtonElement>,
  });

  private readonly _count = computed(() => this.field()().value().length);
  /** Errors of the list itself, e.g. "at least one"; each image shows its own. */
  private readonly _errorMessages = computed(() => {
    const state = this.field()();
    return state.touched() ? state.errors().map((error) => error.message ?? '') : [];
  });
  private readonly _describedBy = computed(() => {
    const ids = [
      this.description() ? this._descriptionId : undefined,
      this._errorMessages().length > 0 ? this._errorId : undefined,
    ].filter((id) => id !== undefined);
    return ids.length > 0 ? ids.join(' ') : null;
  });

  private _add(): void {
    this.field()().value.update((images) => [...images, toImageForm(undefined)]);
  }

  private _move(index: number, offset: -1 | 1): void {
    this.field()().value.update((images) => moveItem(images, index, offset));
  }

  /** Nothing is lost before the section is saved, so there is no confirmation. */
  private _remove(index: number): void {
    const state = this.field()();
    state.value.update((images) => images.filter((_image, position) => position !== index));
    state.markAsTouched();
    // The removed image took the focus with it. After the render, because a full list has kept
    // the add button disabled until then.
    afterNextRender(() => this._addButton().nativeElement.focus(), { injector: this._injector });
  }
}
