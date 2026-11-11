import { safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it.each(['/events', '/events/1/edit?tab=images#top', '/'])('accepts the path %s', (url) => {
    expect(safeReturnUrl(url)).toBe(url);
  });

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'events',
    'javascript:alert(1)',
    '',
    null,
    undefined,
  ])('falls back to the start page for %s', (url) => {
    expect(safeReturnUrl(url)).toBe('/');
  });
});
