import { saveTheDateUrl } from './save-the-date-link';

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
