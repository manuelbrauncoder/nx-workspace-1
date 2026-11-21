import { _IdGenerator } from '@angular/cdk/a11y';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { RichTextProfile } from '@contracts/rich-text';
import { AppLanguage } from '@core/i18n/languages';
import { UiDialogService } from '../../ui/dialog/dialog.service';
import { FormControlErrors, visibleErrorMessages } from '../form-control-shell/form-control-errors';
import { FormControlShell } from '../form-control-shell/form-control-shell';
import { INITIAL_TOOLBAR_STATE, RichTextCommand, RichTextEditor } from './rich-text-editor';
import {
  RichTextLinkDialog,
  RichTextLinkDialogData,
} from './rich-text-link-dialog/rich-text-link-dialog';
import { RichTextToolbar } from './rich-text-toolbar/rich-text-toolbar';

/**
 * Formatted text for Signal Forms:
 * `<app-form-rich-text [formField]="form.content" label="Inhalt" />`.
 *
 * The value is an HTML string limited to bold, italic, two heading levels, lists, quotes and
 * links, and `''` while the editor is empty. Show a stored value with `app-ui-rich-text` and the
 * same `profile`.
 */
@Component({
  selector: 'app-form-rich-text',
  imports: [FormControlShell, RichTextToolbar],
  styleUrl: './form-rich-text.scss',
  templateUrl: './form-rich-text.html',
})
export class FormRichText implements FormValueControl<string> {
  readonly value = model('');

  readonly label = input.required<string>();
  readonly description = input<string>();
  /**
   * Ids of descriptions outside the control that also explain it, e.g. the description of the
   * group the field is part of. Screen readers often skip a group's description on focus.
   */
  readonly descriptionIds = input<readonly string[]>([]);
  /** `page` for a page of this site: links may also point within the site or to a phone. */
  readonly profile = input<RichTextProfile>('text');
  /**
   * Language of the text typed in, when it differs from the page, e.g. the English version of a
   * text. Sets `lang` on the editable area only, the label stays in the page language.
   */
  readonly contentLang = input<AppLanguage>();

  // Bound by the `FormField` directive.
  readonly errors = input<FormControlErrors>([]);
  readonly touched = input(false);
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly required = input(false);
  readonly touch = output<void>();

  private readonly _id = inject(_IdGenerator).getId('form-rich-text-');
  private readonly _errorMessages = computed(() =>
    visibleErrorMessages(this.errors(), this.touched()),
  );
  private readonly _toolbarState = signal(INITIAL_TOOLBAR_STATE);

  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly _dialog = inject(UiDialogService);
  private readonly _content = viewChild.required<ElementRef<HTMLElement>>('content');

  /** Exists in the browser only, the server renders the empty frame. */
  private readonly _editor = signal<RichTextEditor | undefined>(undefined);
  private readonly _locked = computed(() => !this._editor() || this.disabled() || this.readonly());
  private _linkDialogOpen = false;

  constructor() {
    afterNextRender(() => {
      this._editor.set(
        new RichTextEditor(this._content().nativeElement, {
          html: untracked(this.value),
          profile: untracked(this.profile),
          onChange: (html) => this.value.set(html),
          onState: (state) => this._toolbarState.set(state),
        }),
      );
    });
    inject(DestroyRef).onDestroy(() => this._editor()?.destroy());

    // A value coming from the form replaces the content. What the editor reported itself is
    // already there, replacing it would move the cursor while typing.
    effect(() => {
      const editor = this._editor();
      const value = this.value();
      if (editor && value !== editor.html) {
        editor.setHtml(value);
      }
    });
    effect(() => this._editor()?.setEditable(!this.disabled() && !this.readonly()));
  }

  focus(): void {
    this._editor()?.focus();
  }

  private async _run(command: RichTextCommand): Promise<void> {
    const editor = this._editor();
    if (!editor) {
      return;
    }
    if (command !== 'link') {
      editor.run(command);
      return;
    }
    this._linkDialogOpen = true;
    const href = await this._dialog.open<string | null, RichTextLinkDialogData>(
      RichTextLinkDialog,
      {
        data: { href: editor.linkHref, profile: this.profile() },
      },
    ).closed;
    this._linkDialogOpen = false;
    if (href !== undefined) {
      editor.setLink(href);
    }
  }

  /** Moving between the text and the toolbar, or into the link dialog, is not leaving the field. */
  private _leave(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (this._linkDialogOpen || (next instanceof Node && this._host.nativeElement.contains(next))) {
      return;
    }
    this.touch.emit();
  }
}
