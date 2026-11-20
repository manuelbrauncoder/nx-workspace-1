import {
  pageQuerySchema,
  sectionInputSchemas,
  type SectionKey,
  sectionUpdateSchemas,
} from '@portfolio/contracts/portfolio';
import { isAdmin, requireAdmin } from '@server/auth/auth.middleware';
import { parse } from '@server/core/validate';
import { type Request, type Response, Router } from 'express';
import { createSection, getPage, updateSection } from './portfolio.service.js';

export const portfolioRouter = Router();

/** Creates the section from the body and answers with it. */
async function addSection(key: SectionKey, req: Request, res: Response) {
  const section = await createSection(key, parse(sectionInputSchemas[key], req.body));
  res.status(201).json({ [key]: section });
}

/** Changes the sent fields of the section and answers with the whole section. */
async function changeSection(key: SectionKey, req: Request, res: Response) {
  const section = await updateSection(key, parse(sectionUpdateSchemas[key], req.body));
  res.json({ [key]: section });
}

// public: the start page; admins also get the draft projects
portfolioRouter.get('/', async (req, res) => {
  const { lang } = parse(pageQuerySchema, req.query);
  const page = await getPage(lang, { includeDrafts: await isAdmin(req) });
  // The answer depends on the session, so no shared cache may keep it and the browser asks again.
  // `vary` appends, the `Vary: Origin` of CORS stays.
  res.set('Cache-Control', 'private, no-cache');
  res.vary('Cookie');
  res.json(page);
});

portfolioRouter.post('/hero', requireAdmin, (req, res) => addSection('hero', req, res));
portfolioRouter.post('/about', requireAdmin, (req, res) => addSection('about', req, res));
portfolioRouter.post('/projects', requireAdmin, (req, res) => addSection('projects', req, res));
portfolioRouter.post('/skills', requireAdmin, (req, res) => addSection('skills', req, res));
portfolioRouter.post('/contact', requireAdmin, (req, res) => addSection('contact', req, res));
portfolioRouter.post('/settings', requireAdmin, (req, res) => addSection('settings', req, res));
portfolioRouter.post('/seo', requireAdmin, (req, res) => addSection('seo', req, res));

portfolioRouter.patch('/hero', requireAdmin, (req, res) => changeSection('hero', req, res));
portfolioRouter.patch('/about', requireAdmin, (req, res) => changeSection('about', req, res));
portfolioRouter.patch('/projects', requireAdmin, (req, res) => changeSection('projects', req, res));
portfolioRouter.patch('/skills', requireAdmin, (req, res) => changeSection('skills', req, res));
portfolioRouter.patch('/contact', requireAdmin, (req, res) => changeSection('contact', req, res));
portfolioRouter.patch('/settings', requireAdmin, (req, res) => changeSection('settings', req, res));
portfolioRouter.patch('/seo', requireAdmin, (req, res) => changeSection('seo', req, res));
