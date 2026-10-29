const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

/** Search engines cut a description off at about this length. */
const MAX_LENGTH = 160;

/**
 * Plain text of rich text for a meta description: without tags, on one line, cut at a word.
 * The result is text for an attribute, not HTML to render.
 */
export function toMetaDescription(html: string, maxLength = MAX_LENGTH): string {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity])
    .replace(/\s+/g, ' ')
    // The space that replaced a closing tag, e.g. of a link at the end of a sentence.
    .replace(/ ([.,;:!?])/g, '$1')
    .trim();
  if (text.length <= maxLength) {
    return text;
  }
  const cut = text.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
