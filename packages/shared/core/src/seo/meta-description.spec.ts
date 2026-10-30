import { toMetaDescription } from './meta-description';

describe('toMetaDescription', () => {
  it('removes tags and keeps the words of neighbouring blocks apart', () => {
    expect(toMetaDescription('<p>Milch</p><p><strong>Brot</strong> und Butter</p>')).toBe(
      'Milch Brot und Butter',
    );
  });

  it('leaves no space before punctuation that follows a tag', () => {
    expect(toMetaDescription('<p>Mehr in der <a href="#">Doku</a>.</p>')).toBe('Mehr in der Doku.');
  });

  it('decodes the entities an editor writes', () => {
    expect(toMetaDescription('<p>Tom &amp; Jerry&nbsp;&lt;3</p>')).toBe('Tom & Jerry <3');
  });

  it('cuts a long text at a word and marks the cut', () => {
    const description = toMetaDescription(`<p>${'Wort '.repeat(60)}</p>`);

    expect(description.length).toBeLessThanOrEqual(160);
    expect(description.endsWith('Wort…')).toBe(true);
  });

  it('returns an empty text for empty content', () => {
    expect(toMetaDescription('')).toBe('');
  });
});
