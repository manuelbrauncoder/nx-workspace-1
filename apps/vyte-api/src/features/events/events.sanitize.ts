import {
  isAllowedRichTextHref,
  RICH_TEXT_LINK_REL,
  RICH_TEXT_LINK_TARGET,
  RICH_TEXT_TAGS,
} from '@contracts/rich-text';
import sanitizeHtml from 'sanitize-html';

// The same formats the editor of the frontend can produce.
const options: sanitizeHtml.IOptions = {
  allowedTags: [...RICH_TEXT_TAGS],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  transformTags: {
    // the same rule as the editor: absolute http(s) and mailto links only, no paths, no `//`
    a: (tagName, attribs) => {
      const href = attribs['href'] ?? '';
      const kept: sanitizeHtml.Attributes = isAllowedRichTextHref(href, 'text')
        ? { href, target: RICH_TEXT_LINK_TARGET, rel: RICH_TEXT_LINK_REL }
        : {};
      return { tagName, attribs: kept };
    },
  },
};

/** Reduces rich text to an allowlist of formatting tags; everything else is dropped. */
export function sanitizeEventDescription(html: string): string {
  return sanitizeHtml(html, options);
}
