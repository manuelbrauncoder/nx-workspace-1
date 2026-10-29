import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { TranslationKey } from '@core/i18n/translation-key';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiIconName } from '@shared/ui/icon/ui-icons';
import { RichTextCommand, RichTextToolbarState } from '../rich-text-editor';

interface ToolbarButton {
  command: RichTextCommand;
  icon: UiIconName;
  label: TranslationKey;
}

/** @internal Formatting buttons of `app-form-rich-text`. Reports the command, the control runs it. */
@Component({
  selector: 'app-rich-text-toolbar',
  imports: [TranslatePipe, UiButton, UiIcon],
  styleUrl: './rich-text-toolbar.scss',
  templateUrl: './rich-text-toolbar.html',
})
export class RichTextToolbar {
  readonly state = input.required<RichTextToolbarState>();
  /** Id of the editable element the buttons act on. */
  readonly controlsId = input.required<string>();
  readonly disabled = input(false);
  readonly execute = output<RichTextCommand>();

  private readonly _groups: ToolbarButton[][] = [
    [
      { command: 'bold', icon: 'bold', label: 'form.richText.bold' },
      { command: 'italic', icon: 'italic', label: 'form.richText.italic' },
    ],
    [
      { command: 'heading2', icon: 'heading2', label: 'form.richText.heading2' },
      { command: 'heading3', icon: 'heading3', label: 'form.richText.heading3' },
    ],
    [
      { command: 'bulletList', icon: 'list', label: 'form.richText.bulletList' },
      { command: 'orderedList', icon: 'listOrdered', label: 'form.richText.orderedList' },
      { command: 'blockquote', icon: 'quote', label: 'form.richText.blockquote' },
    ],
    [{ command: 'link', icon: 'link', label: 'form.richText.link' }],
    [
      { command: 'undo', icon: 'undo', label: 'form.richText.undo' },
      { command: 'redo', icon: 'redo', label: 'form.richText.redo' },
    ],
  ];

  /** `undefined` for undo and redo, which are actions and have no pressed state. */
  private _pressed(command: RichTextCommand): boolean | undefined {
    return command === 'undo' || command === 'redo' ? undefined : this.state().active[command];
  }

  private _unavailable(command: RichTextCommand): boolean {
    return (
      this.disabled() ||
      (command === 'undo' && !this.state().canUndo) ||
      (command === 'redo' && !this.state().canRedo)
    );
  }
}
