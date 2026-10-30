/**
 * What rich text may contain. The editor, the display and the sanitizer of the API follow this
 * list, so a format added here has to be added to the editor schema and the styles in
 * `_rich-text.scss` as well.
 */
export const RICH_TEXT_TAGS: readonly string[] = [
  'p',
  'br',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'blockquote',
  'strong',
  'em',
  'a',
];

/** Links open in a new tab, so following one does not discard the page the user is on. */
export const RICH_TEXT_LINK_TARGET = '_blank';

/** Set on every link, so the target page gets neither the opener nor a ranking boost. */
export const RICH_TEXT_LINK_REL = 'noopener noreferrer nofollow';

/**
 * Only absolute web and mail links. The value has to start with the scheme literally, so
 * `javascript:` cannot be smuggled in behind whitespace or control characters.
 */
export function isAllowedRichTextHref(href: string): boolean {
  return /^(https?:\/\/|mailto:)[^\s<>"]+$/i.test(href);
}
