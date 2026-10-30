import sanitizeHtml from 'sanitize-html';

const options: sanitizeHtml.IOptions = {
  // the formats of the rich text editor in the web app, which renders the h1 itself
  allowedTags: ['p', 'br', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'strong', 'em', 'a'],
  // relative links such as /privacy stay allowed
  allowedAttributes: { a: ['href'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
};

/** Reduces a legal page to the formats of the editor; everything else is dropped. */
export function sanitizeLegalHtml(html: string): string {
  return sanitizeHtml(html, options).trim();
}
