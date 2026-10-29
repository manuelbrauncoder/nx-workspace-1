import { _IdGenerator } from '@angular/cdk/a11y';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiAttachment } from '../../ui/attachment/attachment';
import { UiIcon } from '../../ui/icon/icon';
import { FormControlErrors, visibleErrorMessages } from '../form-control-shell/form-control-errors';
import { FormControlShell } from '../form-control-shell/form-control-shell';

interface SelectedFile {
  file: File;
  /** Object URL of an image, for the preview. */
  previewUrl: string | undefined;
  size: string;
}

const BYTES_PER_MEGABYTE = 1024 * 1024;

const isSameFile = (a: File, b: File) =>
  a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

/**
 * Drop zone for files in Signal Forms:
 * `<app-form-files [formField]="form.images" label="Bilder" [maxFiles]="5" />`.
 *
 * Files are dropped onto the zone or chosen through the file dialog, by click or keyboard. The
 * value is the list of chosen files, sending them is up to the form. A file of the wrong type,
 * one that is too large and files beyond `maxFiles` are left out with a message.
 */
@Component({
  selector: 'app-form-files',
  imports: [TranslatePipe, FormControlShell, UiAttachment, UiIcon],
  styleUrl: './form-files.scss',
  templateUrl: './form-files.html',
})
export class FormFiles implements FormValueControl<File[]> {
  readonly value = model<File[]>([]);

  readonly label = input.required<string>();
  readonly description = input<string>();
  /** How many files the control holds at most. */
  readonly maxFiles = input(10);
  /** Allowed MIME types, e.g. `['image/png', 'image/jpeg']`. Empty allows every type. */
  readonly accept = input<readonly string[]>([]);
  /** Largest allowed file in bytes. */
  readonly maxFileSize = input<number>();

  // Bound by the `FormField` directive.
  readonly errors = input<FormControlErrors>([]);
  readonly touched = input(false);
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly required = input(false);
  readonly name = input('');
  readonly touch = output<void>();

  private readonly _i18n = inject(I18nService);
  private readonly _id = inject(_IdGenerator).getId('form-files-');
  private readonly _errorMessages = computed(() =>
    visibleErrorMessages(this.errors(), this.touched()),
  );

  private readonly _dragging = signal(false);
  /** Why files of the most recent drop or selection were left out. */
  private readonly _rejections = signal<string[]>([]);
  private readonly _full = computed(() => this.value().length >= this.maxFiles());
  private readonly _locked = computed(() => this.disabled() || this.readonly() || this._full());

  private readonly _previewUrls = new Map<File, string>();
  private readonly _selected = signal<SelectedFile[]>([]);

  constructor() {
    // Follows the value instead of the user's actions, so a form reset drops the previews too.
    effect(() => {
      const files = this.value();
      for (const [file, url] of this._previewUrls) {
        if (!files.includes(file)) {
          URL.revokeObjectURL(url);
          this._previewUrls.delete(file);
        }
      }
      this._selected.set(
        files.map((file) => ({
          file,
          previewUrl: this._previewUrl(file),
          size: this._formatSize(file.size),
        })),
      );
    });
    inject(DestroyRef).onDestroy(() => {
      for (const url of this._previewUrls.values()) {
        URL.revokeObjectURL(url);
      }
    });
  }

  private _previewUrl(file: File): string | undefined {
    if (!file.type.startsWith('image/')) {
      return undefined;
    }
    let url = this._previewUrls.get(file);
    if (!url) {
      url = URL.createObjectURL(file);
      this._previewUrls.set(file, url);
    }
    return url;
  }

  private _formatSize(bytes: number): string {
    return new Intl.NumberFormat(this._i18n.locale(), {
      style: 'unit',
      unit: bytes < BYTES_PER_MEGABYTE ? 'kilobyte' : 'megabyte',
      maximumFractionDigits: 1,
    }).format(bytes / (bytes < BYTES_PER_MEGABYTE ? 1024 : BYTES_PER_MEGABYTE));
  }

  private _onDragOver(event: DragEvent): void {
    // Without this the browser does not fire `drop`, it opens the file instead.
    event.preventDefault();
    this._dragging.set(!this._locked());
  }

  private _onDrop(event: DragEvent): void {
    event.preventDefault();
    this._dragging.set(false);
    this._add([...(event.dataTransfer?.files ?? [])]);
    this.touch.emit();
  }

  private _onSelect(control: HTMLInputElement): void {
    this._add([...(control.files ?? [])]);
    // Otherwise choosing the same file again after removing it would not fire `change`.
    control.value = '';
  }

  private _add(files: File[]): void {
    if (this._locked() || files.length === 0) {
      return;
    }
    const accept = this.accept();
    const maxFileSize = this.maxFileSize();
    const rejections: string[] = [];
    const accepted: File[] = [];

    for (const file of files) {
      const known = [...this.value(), ...accepted].some((existing) => isSameFile(existing, file));
      if (known) {
        continue;
      }
      if (accept.length > 0 && !accept.includes(file.type)) {
        rejections.push(this._i18n.translate('form.files.rejectedType', { name: file.name }));
      } else if (maxFileSize !== undefined && file.size > maxFileSize) {
        rejections.push(
          this._i18n.translate('form.files.rejectedSize', {
            name: file.name,
            max: this._formatSize(maxFileSize),
          }),
        );
      } else {
        accepted.push(file);
      }
    }

    const free = this.maxFiles() - this.value().length;
    if (accepted.length > free) {
      rejections.push(
        this._i18n.translate('form.files.rejectedCount', {
          max: this.maxFiles(),
          count: accepted.length - free,
        }),
      );
    }
    this._rejections.set(rejections);
    if (accepted.length > 0 && free > 0) {
      this.value.update((existing) => [...existing, ...accepted.slice(0, free)]);
    }
  }

  private _remove(file: File): void {
    this._rejections.set([]);
    this.value.update((existing) => existing.filter((candidate) => candidate !== file));
  }
}
