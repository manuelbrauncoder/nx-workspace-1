import { inviteLinkUrl } from './invite-link';

describe('inviteLinkUrl', () => {
  it('puts the token behind /invite on the site', () => {
    expect(inviteLinkUrl('https://vyte.example.com', 'abc123')).toBe(
      'https://vyte.example.com/invite/abc123',
    );
  });

  it('encodes characters that would end the path segment', () => {
    expect(inviteLinkUrl('https://vyte.example.com', 'a/b?c#d e')).toBe(
      'https://vyte.example.com/invite/a%2Fb%3Fc%23d%20e',
    );
  });
});
