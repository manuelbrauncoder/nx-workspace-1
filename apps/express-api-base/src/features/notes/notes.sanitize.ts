import { RICH_TEXT_LINK_REL, RICH_TEXT_LINK_TARGET, RICH_TEXT_TAGS } from '@contracts/rich-text';
import sanitizeHtml from 'sanitize-html';

// The same formats the editor of the frontend can produce.
const options: sanitizeHtml.IOptions = {
  allowedTags: [...RICH_TEXT_TAGS],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', {
      target: RICH_TEXT_LINK_TARGET,
      rel: RICH_TEXT_LINK_REL,
    }),
  },
};

/** Reduces rich text to an allowlist of formatting tags; everything else is dropped. */
export function sanitizeDescription(html: string): string {
  return sanitizeHtml(html, options);
}
