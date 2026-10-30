import {
  type LegalPageKey,
  legalPageUpdateSchema,
  legalQuerySchema,
} from '@portfolio/contracts/legal';
import { requireAdmin } from '@server/auth/auth.middleware';
import { parse } from '@server/core/validate';
import { type Request, type Response, Router } from 'express';
import { getLegalHtml, listLegalPages, updateLegalPage } from './legal.service.js';

export const legalRouter = Router();

/** Sends the finished fragment in the language of `?lang=`; the web app puts it into its layout. */
async function sendPage(key: LegalPageKey, req: Request, res: Response) {
  const { lang } = parse(legalQuerySchema, req.query);
  const html = await getLegalHtml(key, lang);
  res.type('html').set('Content-Language', lang).send(html);
}

/** Changes the sent languages of the page and answers with the whole page. */
async function changePage(key: LegalPageKey, req: Request, res: Response) {
  const page = await updateLegalPage(key, parse(legalPageUpdateSchema, req.body));
  res.json({ [key]: page });
}

// public: the pages themselves
legalRouter.get('/imprint', (req, res) => sendPage('imprint', req, res));
legalRouter.get('/privacy', (req, res) => sendPage('privacy', req, res));
legalRouter.get('/accessibility', (req, res) => sendPage('accessibility', req, res));
legalRouter.get('/cookies', (req, res) => sendPage('cookies', req, res));

legalRouter.get('/', requireAdmin, async (_req, res) => {
  res.json(await listLegalPages());
});

legalRouter.patch('/imprint', requireAdmin, (req, res) => changePage('imprint', req, res));
legalRouter.patch('/privacy', requireAdmin, (req, res) => changePage('privacy', req, res));
legalRouter.patch('/accessibility', requireAdmin, (req, res) =>
  changePage('accessibility', req, res),
);
legalRouter.patch('/cookies', requireAdmin, (req, res) => changePage('cookies', req, res));
