import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import {
  isAllowedRichTextHref,
  RICH_TEXT_LINK_REL,
  RICH_TEXT_LINK_TARGET,
} from '../../ui/rich-text/rich-text-rules';

/** Formats that are either on or off at the cursor. */
export type RichTextToggle =
  | 'bold'
  | 'italic'
  | 'heading2'
  | 'heading3'
  | 'bulletList'
  | 'orderedList'
  | 'blockquote'
  | 'link';
export type RichTextCommand = RichTextToggle | 'undo' | 'redo';

/** What the toolbar shows for the current selection. */
export interface RichTextToolbarState {
  active: Record<RichTextToggle, boolean>;
  canUndo: boolean;
  canRedo: boolean;
}

export const INITIAL_TOOLBAR_STATE: RichTextToolbarState = {
  active: {
    bold: false,
    italic: false,
    heading2: false,
    heading3: false,
    bulletList: false,
    orderedList: false,
    blockquote: false,
    link: false,
  },
  canUndo: false,
  canRedo: false,
};

interface RichTextEditorOptions {
  html: string;
  /** Called with the new HTML after every change made in the editor. */
  onChange: (html: string) => void;
  /** Called whenever the content or the selection changed. */
  onState: (state: RichTextToolbarState) => void;
}

/**
 * The editor behind `app-form-rich-text`. Everything specific to the editor library stays in
 * this file. The schema is limited to the formats of `rich-text-rules.ts`, so HTML that is set
 * or pasted loses everything else while it is parsed.
 */
export class RichTextEditor {
  private readonly _editor: Editor;

  constructor(element: HTMLElement, options: RichTextEditorOptions) {
    this._editor = new Editor({
      // Mounts on the element itself, so its id, ARIA attributes and classes stay in the template.
      element: { mount: element },
      content: options.html,
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3] },
          code: false,
          codeBlock: false,
          horizontalRule: false,
          strike: false,
          underline: false,
          // Would append an empty paragraph to a text that ends with a heading or a list.
          trailingNode: false,
          link: {
            openOnClick: false,
            defaultProtocol: 'https',
            HTMLAttributes: { rel: RICH_TEXT_LINK_REL, target: RICH_TEXT_LINK_TARGET },
            isAllowedUri: (url) => isAllowedRichTextHref(url),
          },
        }),
      ],
      onUpdate: () => options.onChange(this.html),
      onTransaction: () => options.onState(this._toolbarState),
    });
  }

  /** The content as HTML. An editor without text yields `''` instead of an empty paragraph. */
  get html(): string {
    return this._editor.isEmpty ? '' : this._editor.getHTML();
  }

  /** The address of the link at the cursor, `''` when there is none. */
  get linkHref(): string {
    const href: unknown = this._editor.getAttributes('link')['href'];
    return typeof href === 'string' ? href : '';
  }

  /** Replaces the content without reporting it as a change. */
  setHtml(html: string): void {
    this._editor.commands.setContent(html, { emitUpdate: false });
  }

  setEditable(editable: boolean): void {
    this._editor.setEditable(editable, false);
  }

  run(command: Exclude<RichTextCommand, 'link'>): void {
    const chain = this._editor.chain().focus();
    switch (command) {
      case 'bold':
        chain.toggleBold().run();
        break;
      case 'italic':
        chain.toggleItalic().run();
        break;
      case 'heading2':
        chain.toggleHeading({ level: 2 }).run();
        break;
      case 'heading3':
        chain.toggleHeading({ level: 3 }).run();
        break;
      case 'bulletList':
        chain.toggleBulletList().run();
        break;
      case 'orderedList':
        chain.toggleOrderedList().run();
        break;
      case 'blockquote':
        chain.toggleBlockquote().run();
        break;
      case 'undo':
        chain.undo().run();
        break;
      case 'redo':
        chain.redo().run();
        break;
    }
  }

  /**
   * Links the selection or changes the link at the cursor, `null` removes it. Without a
   * selection and without a link the address itself is inserted as the linked text.
   */
  setLink(href: string | null): void {
    const chain = this._editor.chain().focus().extendMarkRange('link');
    if (href === null) {
      chain.unsetLink().run();
    } else if (this._editor.state.selection.empty && !this._editor.isActive('link')) {
      chain
        .insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] })
        .run();
    } else {
      chain.setLink({ href }).run();
    }
  }

  focus(): void {
    this._editor.commands.focus();
  }

  destroy(): void {
    this._editor.destroy();
  }

  private get _toolbarState(): RichTextToolbarState {
    const editor = this._editor;
    return {
      active: {
        bold: editor.isActive('bold'),
        italic: editor.isActive('italic'),
        heading2: editor.isActive('heading', { level: 2 }),
        heading3: editor.isActive('heading', { level: 3 }),
        bulletList: editor.isActive('bulletList'),
        orderedList: editor.isActive('orderedList'),
        blockquote: editor.isActive('blockquote'),
        link: editor.isActive('link'),
      },
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    };
  }
}
