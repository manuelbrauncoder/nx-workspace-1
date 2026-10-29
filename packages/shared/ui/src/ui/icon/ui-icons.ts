import {
  lucideBold,
  lucideCheck,
  lucideChevronDown,
  lucideComponent,
  lucideFile,
  lucideHeading2,
  lucideHeading3,
  lucideItalic,
  lucideLanguages,
  lucideLink,
  lucideList,
  lucideListOrdered,
  lucideLogOut,
  lucideMenu,
  lucideMoon,
  lucideNotebookPen,
  lucidePalette,
  lucidePlus,
  lucideRedo2,
  lucideSun,
  lucideTextCursorInput,
  lucideTextQuote,
  lucideTrash2,
  lucideType,
  lucideUndo2,
  lucideUpload,
  lucideUser,
  lucideX,
} from '@ng-icons/lucide';

/**
 * Every icon the app may use. Add new icons here, the key is the name passed to `app-ui-icon`.
 * Swapping the icon set only touches this file.
 */
export const UI_ICONS = {
  bold: lucideBold,
  check: lucideCheck,
  chevronDown: lucideChevronDown,
  component: lucideComponent,
  file: lucideFile,
  heading2: lucideHeading2,
  heading3: lucideHeading3,
  italic: lucideItalic,
  languages: lucideLanguages,
  link: lucideLink,
  list: lucideList,
  listOrdered: lucideListOrdered,
  logOut: lucideLogOut,
  menu: lucideMenu,
  moon: lucideMoon,
  notebookPen: lucideNotebookPen,
  palette: lucidePalette,
  plus: lucidePlus,
  quote: lucideTextQuote,
  redo: lucideRedo2,
  sun: lucideSun,
  textCursorInput: lucideTextCursorInput,
  trash: lucideTrash2,
  type: lucideType,
  undo: lucideUndo2,
  upload: lucideUpload,
  user: lucideUser,
  x: lucideX,
} as const;

export type UiIconName = keyof typeof UI_ICONS;

export const UI_ICON_NAMES = Object.keys(UI_ICONS) as UiIconName[];
