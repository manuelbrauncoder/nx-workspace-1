import { AppConfig } from '@core/config/app-config';
import { Router } from 'express';

/** One page in the sitemap. */
export interface SitemapEntry {
  /** Path of the page, e.g. `/notes/42`. */
  path: string;
  /** ISO timestamp of the last change. */
  lastModified?: string;
}

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

const escapeXml = (value: string) => value.replace(/[&<>"']/g, (char) => XML_ESCAPES[char]);

/** A deployment that must not be indexed, e.g. staging, locks out every crawler. */
export function buildRobotsTxt(config: Pick<AppConfig, 'siteUrl' | 'allowIndexing'>): string {
  const lines = config.allowIndexing
    ? ['User-agent: *', 'Allow: /', '', `Sitemap: ${config.siteUrl}/sitemap.xml`]
    : ['User-agent: *', 'Disallow: /'];
  return `${lines.join('\n')}\n`;
}

export function buildSitemapXml(siteUrl: string, entries: SitemapEntry[]): string {
  const urls = entries.map(({ path, lastModified }) => {
    const lastmod = lastModified ? `<lastmod>${escapeXml(lastModified)}</lastmod>` : '';
    return `  <url><loc>${escapeXml(siteUrl + path)}</loc>${lastmod}</url>`;
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

/**
 * `robots.txt` and `sitemap.xml`. Both are generated, since the public URL of the app is only
 * known at runtime. `entries` lists the pages for the sitemap and is asked on every request.
 */
export function seoRoutes(config: AppConfig | undefined, entries: () => SitemapEntry[]): Router {
  const router = Router();

  router.get('/robots.txt', (_req, res) => {
    if (!config) {
      res.sendStatus(503);
      return;
    }
    res.type('text/plain').send(buildRobotsTxt(config));
  });

  router.get('/sitemap.xml', (_req, res) => {
    if (!config) {
      res.sendStatus(503);
      return;
    }
    res.type('application/xml').send(buildSitemapXml(config.siteUrl, entries()));
  });

  return router;
}
