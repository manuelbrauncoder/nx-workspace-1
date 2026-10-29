import { buildRobotsTxt, buildSitemapXml } from './seo-routes';

describe('buildRobotsTxt', () => {
  it('allows crawlers and names the sitemap when indexing is allowed', () => {
    const robots = buildRobotsTxt({ siteUrl: 'https://example.com', allowIndexing: true });

    expect(robots).toContain('Allow: /');
    expect(robots).toContain('Sitemap: https://example.com/sitemap.xml');
    expect(robots).not.toContain('Disallow');
  });

  it('locks out crawlers when indexing is not allowed', () => {
    const robots = buildRobotsTxt({ siteUrl: 'https://example.com', allowIndexing: false });

    expect(robots).toContain('Disallow: /');
    expect(robots).not.toContain('Sitemap');
  });
});

describe('buildSitemapXml', () => {
  it('lists every entry with its absolute URL', () => {
    const sitemap = buildSitemapXml('https://example.com', [
      { path: '/notes' },
      { path: '/notes/7', lastModified: '2026-01-13T14:30:00.000Z' },
    ]);

    expect(sitemap).toContain('<url><loc>https://example.com/notes</loc></url>');
    expect(sitemap).toContain(
      '<url><loc>https://example.com/notes/7</loc><lastmod>2026-01-13T14:30:00.000Z</lastmod></url>',
    );
  });

  it('escapes characters that are special in XML', () => {
    const sitemap = buildSitemapXml('https://example.com', [{ path: '/search?q=a&b=<c>' }]);

    expect(sitemap).toContain('<loc>https://example.com/search?q=a&amp;b=&lt;c&gt;</loc>');
  });
});
