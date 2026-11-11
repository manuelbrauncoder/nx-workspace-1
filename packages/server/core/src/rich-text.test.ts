import { describe, expect, it } from 'vitest';
import { sanitizeRichText } from './rich-text';

const external = 'target="_blank" rel="noopener noreferrer nofollow"';
const link = (href: string) => `<a href="${href.replace(/"/g, '&quot;')}">x</a>`;

describe('sanitizeRichText', () => {
  it('keeps the formats of the editor and drops everything else', () => {
    const html =
      '<h1>Title</h1><h2 onclick="steal()">Head</h2><script>alert(1)</script>' +
      '<p style="color:red">A <strong>b</strong> <em>c</em><br>d</p>' +
      '<ul><li>1</li></ul><ol><li>2</li></ol><blockquote>q</blockquote><h3>h</h3>' +
      '<img src="x" onerror="alert(1)"><iframe src="https://example.com"></iframe>' +
      '<address><p>Ada</p></address><style>p{}</style>';

    expect(sanitizeRichText(html)).toBe(
      'Title<h2>Head</h2>' +
        '<p>A <strong>b</strong> <em>c</em><br />d</p>' +
        '<ul><li>1</li></ul><ol><li>2</li></ol><blockquote>q</blockquote><h3>h</h3>' +
        '<p>Ada</p>',
    );
    expect(sanitizeRichText(html, 'page')).toBe(sanitizeRichText(html));
  });

  it('is text by default', () => {
    expect(sanitizeRichText(link('/privacy'))).toBe(sanitizeRichText(link('/privacy'), 'text'));
  });

  describe('links in the profile text', () => {
    it.each([
      ['https://example.com/a?b=1', `<a href="https://example.com/a?b=1" ${external}>x</a>`],
      ['http://example.com', `<a href="http://example.com" ${external}>x</a>`],
      ['HTTPS://EXAMPLE.COM', `<a href="HTTPS://EXAMPLE.COM" ${external}>x</a>`],
      ['mailto:ada@example.com', '<a href="mailto:ada@example.com">x</a>'],
      ['//evil.example', '<a>x</a>'],
      ['/privacy', '<a>x</a>'],
      ['/#contact', '<a>x</a>'],
      ['privacy', '<a>x</a>'],
      ['#contact', '<a>x</a>'],
      ['tel:+4912345', '<a>x</a>'],
      ['javascript:alert(1)', '<a>x</a>'],
      ['JaVaScRiPt:alert(1)', '<a>x</a>'],
      ['java\tscript:alert(1)', '<a>x</a>'],
      ['data:text/html,<b>1</b>', '<a>x</a>'],
      ['vbscript:x', '<a>x</a>'],
      [' https://example.com', '<a>x</a>'],
      ['', '<a>x</a>'],
    ])('%j becomes %s', (href, expected) => {
      expect(sanitizeRichText(link(href))).toBe(expected);
    });
  });

  describe('links in the profile page', () => {
    it.each([
      ['https://example.com', `<a href="https://example.com" ${external}>x</a>`],
      ['mailto:ada@example.com', '<a href="mailto:ada@example.com">x</a>'],
      ['/privacy', '<a href="/privacy">x</a>'],
      ['/#contact', '<a href="/#contact">x</a>'],
      ['/', '<a href="/">x</a>'],
      ['tel:+4912345', '<a href="tel:+4912345">x</a>'],
      ['tel:0123', '<a href="tel:0123">x</a>'],
      ['tel:+49 123', '<a>x</a>'],
      ['tel:javascript:alert(1)', '<a>x</a>'],
      ['//evil.example', '<a>x</a>'],
      // browsers read `/\` like `//`, sanitize-html drops it even though the contract allows it
      ['/\\evil.example', '<a>x</a>'],
      ['privacy', '<a>x</a>'],
      ['../privacy', '<a>x</a>'],
      ['#contact', '<a>x</a>'],
      ['javascript:alert(1)', '<a>x</a>'],
      [' /privacy', '<a>x</a>'],
    ])('%j becomes %s', (href, expected) => {
      expect(sanitizeRichText(link(href), 'page')).toBe(expected);
    });
  });

  it('checks the href after entities are decoded', () => {
    expect(sanitizeRichText('<a href="&#106;avascript:alert(1)">x</a>')).toBe('<a>x</a>');
    expect(sanitizeRichText('<a href="java&#x09;script:alert(1)">x</a>')).toBe('<a>x</a>');
    expect(sanitizeRichText('<a href="&#47;&#92;evil.example">x</a>', 'page')).toBe('<a>x</a>');
    expect(sanitizeRichText('<a href="&#47;&#47;evil.example">x</a>', 'page')).toBe('<a>x</a>');
    expect(sanitizeRichText('<a href="https://x.example/&quot;onclick=alert(1)">x</a>')).toBe(
      '<a>x</a>',
    );
    expect(sanitizeRichText('<a href="https://x.example/?a=1&amp;b=2">x</a>')).toBe(
      `<a href="https://x.example/?a=1&amp;b=2" ${external}>x</a>`,
    );
  });

  it('drops attributes of a link that the sanitizer sets itself or does not know', () => {
    expect(
      sanitizeRichText(
        '<a href="https://example.com" target="_self" rel="opener" onclick="x()" title="t">x</a>',
      ),
    ).toBe(`<a href="https://example.com" ${external}>x</a>`);
    expect(sanitizeRichText('<a href="/privacy" target="_blank" rel="opener">x</a>', 'page')).toBe(
      '<a href="/privacy">x</a>',
    );
    expect(sanitizeRichText('<a target="_blank">x</a>')).toBe('<a>x</a>');
  });
});
