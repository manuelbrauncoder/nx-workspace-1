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

/**
 * Where rich text is shown. `text` is content such as a note, which links only to other sites.
 * `page` is a page of this site, e.g. a legal page, which may also link within the site (`/privacy`,
 * `/#contact`) and to a phone number.
 */
export type RichTextProfile = 'text' | 'page';

/** External links open in a new tab, so following one does not discard the page the user is on. */
export const RICH_TEXT_LINK_TARGET = '_blank';

/** Set on every link, so the target page gets neither the opener nor a ranking boost. */
export const RICH_TEXT_LINK_REL = 'noopener noreferrer nofollow';

/**
 * Absolute web and mail links, in the profile `page` also paths of this site and phone numbers.
 * The value has to start with the scheme or the slash literally, so `javascript:` cannot be
 * smuggled in behind whitespace or control characters. `//` would leave the site.
 */
export function isAllowedRichTextHref(href: string, profile: RichTextProfile = 'text'): boolean {
  if (/^(https?:\/\/|mailto:)[^\s<>"]+$/i.test(href)) {
    return true;
  }
  return profile === 'page' && (/^\/(?!\/)[^\s<>"]*$/.test(href) || /^tel:\+?[0-9]+$/i.test(href));
}

/** A link to another site, which opens in a new tab. */
export function isExternalRichTextHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/** A path of this site, which the router follows without loading the page again. */
export function isInternalRichTextHref(href: string): boolean {
  return /^\/(?!\/)/.test(href);
}
