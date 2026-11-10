import {
  isAllowedRichTextHref,
  isExternalRichTextHref,
  RICH_TEXT_LINK_REL,
  RICH_TEXT_LINK_TARGET,
  RICH_TEXT_TAGS,
  type RichTextProfile,
} from '@contracts/rich-text';
import sanitizeHtml from 'sanitize-html';

const linkAttributes = (href: string, profile: RichTextProfile): sanitizeHtml.Attributes => {
  if (!isAllowedRichTextHref(href, profile)) {
    return {};
  }
  return isExternalRichTextHref(href)
    ? { href, target: RICH_TEXT_LINK_TARGET, rel: RICH_TEXT_LINK_REL }
    : { href };
};

const optionsFor = (profile: RichTextProfile): sanitizeHtml.IOptions => ({
  // the same formats the editor of the frontend can produce
  allowedTags: [...RICH_TEXT_TAGS],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  // a first filter only, `isAllowedRichTextHref` below decides which links stay
  allowedSchemes:
    profile === 'page' ? ['http', 'https', 'mailto', 'tel'] : ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  transformTags: {
    // a link that breaks the rule keeps its text but loses every attribute
    a: (tagName, attribs) => ({ tagName, attribs: linkAttributes(attribs['href'] ?? '', profile) }),
  },
});

const options: Record<RichTextProfile, sanitizeHtml.IOptions> = {
  text: optionsFor('text'),
  page: optionsFor('page'),
};

/**
 * Reduces untrusted rich text to the formats of `@contracts/rich-text` before it is stored:
 * unknown tags are dropped (their text stays), and a link keeps its `href` only if
 * `isAllowedRichTextHref(href, profile)` accepts it. `text` (notes, descriptions) allows absolute
 * http(s) and mailto links, `page` (pages of the site such as legal pages) also paths of the site
 * and `tel:`. External links get `target` and `rel`, the same rule as the display in the frontend.
 */
export function sanitizeRichText(html: string, profile: RichTextProfile = 'text'): string {
  return sanitizeHtml(html, options[profile]);
}
