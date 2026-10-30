import {
  isAllowedRichTextHref,
  RICH_TEXT_LINK_REL,
  RICH_TEXT_LINK_TARGET,
  RICH_TEXT_TAGS,
} from './rich-text-rules';

/** Removed together with their content. Any other unknown element only loses its tag. */
const DROPPED_TAGS: readonly string[] = [
  'script',
  'style',
  'template',
  'noscript',
  'iframe',
  'object',
  'embed',
  'svg',
  'math',
  'title',
  'textarea',
  'select',
];

function unwrap(element: Element): void {
  const parent = element.parentNode;
  if (!parent) {
    return;
  }
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
}

/**
 * Reduces untrusted HTML to the formats of `rich-text-rules.ts`: unknown elements lose their tag,
 * every attribute is removed and a link keeps only an allowed `href`, with `target` and `rel` set
 * here. Parsing happens in an inert
 * document, so nothing is loaded or executed. The result still goes through Angular's sanitizer
 * when it is bound to `innerHTML`, this function only narrows what that lets through.
 */
export function restrictRichText(html: string, document: Document): string {
  const body = document.implementation.createHTMLDocument('').body;
  body.innerHTML = html;

  for (const element of Array.from(body.querySelectorAll('*'))) {
    const tag = element.tagName.toLowerCase();
    if (DROPPED_TAGS.includes(tag)) {
      element.remove();
      continue;
    }
    const href = tag === 'a' ? element.getAttribute('href') : null;
    for (const attribute of Array.from(element.attributes)) {
      element.removeAttribute(attribute.name);
    }
    if (!RICH_TEXT_TAGS.includes(tag) || (tag === 'a' && !(href && isAllowedRichTextHref(href)))) {
      unwrap(element);
    } else if (href) {
      element.setAttribute('href', href);
      element.setAttribute('target', RICH_TEXT_LINK_TARGET);
      element.setAttribute('rel', RICH_TEXT_LINK_REL);
    }
  }
  return body.innerHTML;
}
