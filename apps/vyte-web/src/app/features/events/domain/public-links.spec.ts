import { photoStandUrl, saveTheDateUrl } from './public-links';

describe('saveTheDateUrl', () => {
  it('puts the token behind the save-the-date path of the site', () => {
    expect(saveTheDateUrl('https://vyte.example.com', 'abc123')).toBe(
      'https://vyte.example.com/save-the-date/abc123',
    );
  });

  it('encodes a token with reserved characters', () => {
    expect(saveTheDateUrl('https://vyte.example.com', 'a/b?c#d e')).toBe(
      'https://vyte.example.com/save-the-date/a%2Fb%3Fc%23d%20e',
    );
  });
});

describe('photoStandUrl', () => {
  it('puts the token behind the stand path of the site', () => {
    expect(photoStandUrl('https://vyte.example.com', 'abc123')).toBe(
      'https://vyte.example.com/stand/abc123',
    );
  });

  it('encodes a token with reserved characters', () => {
    expect(photoStandUrl('https://vyte.example.com', 'a/b?c#d e')).toBe(
      'https://vyte.example.com/stand/a%2Fb%3Fc%23d%20e',
    );
  });
});
