import { booleanAttribute, Component, Directive, input, output } from '@angular/core';
import {
  HlmAttachment,
  HlmAttachmentGroup,
  HlmAttachmentImports,
} from '@spartan-ng/helm/attachment';
import { UiIcon } from '../icon/icon';
import { UiIconName } from '../icon/ui-icons';

export type UiAttachmentState = 'idle' | 'uploading' | 'processing' | 'error' | 'done';
export type UiAttachmentOrientation = 'horizontal' | 'vertical';

/**
 * A file or image as a tile: a preview or an icon, optionally with name, a line of details, a
 * link to the file and a button to remove it. Several tiles go into an `appUiAttachmentGroup`.
 * Import both through `UiAttachmentImports`.
 *
 * @example
 * <div appUiAttachmentGroup role="list">
 *   <app-ui-attachment
 *     role="listitem"
 *     orientation="vertical"
 *     [imageSrc]="image.url"
 *     imageAlt="Bild 1"
 *     [href]="image.url"
 *     linkLabel="Bild 1 in voller Größe öffnen"
 *   />
 * </div>
 * <app-ui-attachment
 *   title="bericht.pdf"
 *   description="1,2 MB"
 *   removable
 *   removeLabel="Entfernen: bericht.pdf"
 *   (remove)="remove()"
 * />
 */
@Component({
  selector: 'app-ui-attachment',
  imports: [HlmAttachmentImports, UiIcon],
  hostDirectives: [{ directive: HlmAttachment, inputs: ['state', 'orientation'] }],
  styleUrl: './attachment.scss',
  templateUrl: './attachment.html',
})
export class UiAttachment {
  /** Preview image. Without it the tile shows `icon`. */
  readonly imageSrc = input<string>();
  readonly imageAlt = input('');
  /** Shown while there is no `imageSrc`. */
  readonly icon = input<UiIconName>('file');
  /** Name of the file. */
  readonly title = input<string>();
  /** Muted line below the title, e.g. the file size. */
  readonly description = input<string>();
  /** Makes the whole tile a link that opens in a new tab. Needs `linkLabel`. */
  readonly href = input<string>();
  /** Accessible name of the link. */
  readonly linkLabel = input<string>();
  /** Shows a button that emits `remove`. Needs `removeLabel`. */
  readonly removable = input(false, { transform: booleanAttribute });
  /** Accessible name of the remove button, e.g. "Entfernen: bericht.pdf". */
  readonly removeLabel = input<string>();

  readonly remove = output<void>();
}

/** Row of `app-ui-attachment` tiles that scrolls sideways when they do not fit. */
@Directive({
  selector: '[appUiAttachmentGroup]',
  hostDirectives: [HlmAttachmentGroup],
})
export class UiAttachmentGroup {}

export const UiAttachmentImports = [UiAttachment, UiAttachmentGroup] as const;
