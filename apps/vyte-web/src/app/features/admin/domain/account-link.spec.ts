import { accountLinkUrl } from './account-link';

describe('accountLinkUrl', () => {
  it('points to the welcome page of the site', () => {
    expect(accountLinkUrl('https://vyte.example.com', 'a_b-c')).toBe(
      'https://vyte.example.com/welcome/a_b-c',
    );
  });
});
