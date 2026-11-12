import type { NextFunction, Request, Response } from 'express';
import { isTokenPage, noReferrerOnTokenPages } from './token-pages';

describe('isTokenPage', () => {
  it.each([
    '/welcome/abc',
    '/invite/abc',
    '/rsvp/abc',
    '/photos/abc',
    '/stand/abc',
    '/save-the-date/abc',
  ])('knows %s as a token page', (path) => {
    expect(isTokenPage(path)).toBe(true);
  });

  it.each(['/', '/events', '/events/abc', '/welcome', '/sign-in'])('leaves %s alone', (path) => {
    expect(isTokenPage(path)).toBe(false);
  });
});

describe('noReferrerOnTokenPages', () => {
  function run(path: string) {
    const setHeader = vi.fn();
    const next = vi.fn();
    noReferrerOnTokenPages(
      { path } as Request,
      { setHeader } as unknown as Response,
      next as NextFunction,
    );
    return { setHeader, next };
  }

  it('sends no referrer from a token page', () => {
    const { setHeader, next } = run('/welcome/abc');

    expect(setHeader).toHaveBeenCalledWith('Referrer-Policy', 'no-referrer');
    expect(next).toHaveBeenCalledOnce();
  });

  it('keeps the default for every other page', () => {
    const { setHeader, next } = run('/events');

    expect(setHeader).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });
});
