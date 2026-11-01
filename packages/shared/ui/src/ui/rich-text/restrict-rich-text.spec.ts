import { restrictRichText } from './restrict-rich-text';

describe('restrictRichText', () => {
  const restrict = (html: string) => restrictRichText(html, document);

  it('keeps the formats of the editor', () => {
    const html =
      '<h2>Liste</h2><p><strong>fett</strong> und <em>kursiv</em><br>Zeile</p>' +
      '<ul><li><p>eins</p></li></ul><ol><li><p>zwei</p></li></ol><blockquote><p>Zitat</p></blockquote>';

    expect(restrict(html)).toBe(html);
  });

  it('removes scripts and other active content together with what is inside', () => {
    expect(
      restrict(
        '<p>a</p><script>alert(1)</script><style>p{color:red}</style>' +
          '<iframe src="https://example.org"></iframe><svg onload="alert(1)"><circle /></svg><p>b</p>',
      ),
    ).toBe('<p>a</p><p>b</p>');
  });

  it('removes unknown elements but keeps their text', () => {
    expect(restrict('<div><p>a <span>b</span> <u>c</u></p></div><h1>d</h1>')).toBe('<p>a b c</p>d');
  });

  it('removes images, including one with an error handler', () => {
    expect(restrict('<p>a<img src="x" onerror="alert(1)"></p>')).toBe('<p>a</p>');
  });

  it('removes every attribute, so stored HTML cannot use the classes of the app', () => {
    expect(
      restrict('<p class="fixed inset-0" style="color:red" id="x" onclick="alert(1)">a</p>'),
    ).toBe('<p>a</p>');
  });

  it('keeps web and mail links and sets target and rel itself', () => {
    expect(restrict('<a href="https://angular.dev" target="_top" rel="opener">Angular</a>')).toBe(
      '<a href="https://angular.dev" target="_blank" rel="noopener noreferrer nofollow">Angular</a>',
    );
    expect(restrict('<a href="mailto:a@example.org">Mail</a>')).toContain(
      'href="mailto:a@example.org"',
    );
  });

  it.each([
    'javascript:alert(1)',
    ' javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'java\tscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:x',
    '/relative',
    '//example.org',
  ])('turns a link to %s into plain text', (href) => {
    const link = document.createElement('a');
    link.setAttribute('href', href);
    link.textContent = 'Link';

    expect(restrict(link.outerHTML)).toBe('Link');
  });

  it('keeps mail links without a new tab', () => {
    expect(restrict('<a href="mailto:a@example.org" target="_blank">Mail</a>')).toBe(
      '<a href="mailto:a@example.org">Mail</a>',
    );
  });

  describe('in the profile page', () => {
    const restrictPage = (html: string) => restrictRichText(html, document, 'page');

    it.each(['/privacy', '/#contact', 'tel:+491234'])(
      'keeps a link to %s in the same tab',
      (href) => {
        expect(restrictPage(`<a href="${href}" target="_blank">Link</a>`)).toBe(
          `<a href="${href}">Link</a>`,
        );
      },
    );

    it.each(['//example.org', 'javascript:alert(1)', 'tel:+49 javascript'])(
      'still turns a link to %s into plain text',
      (href) => {
        const link = document.createElement('a');
        link.setAttribute('href', href);
        link.textContent = 'Link';

        expect(restrictPage(link.outerHTML)).toBe('Link');
      },
    );
  });
});
