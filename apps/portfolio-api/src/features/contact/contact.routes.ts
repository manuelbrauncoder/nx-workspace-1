import {
  messageParamsSchema,
  sendMessageSchema,
  updateMessageSchema,
} from '@portfolio/contracts/contact';
import { requireAdmin } from '@server/auth/auth.middleware';
import { parse } from '@server/core/validate';
import { Router } from 'express';
import { contactRateLimit } from '../../shared/middleware/rate-limit.js';
import { deleteMessage, listMessages, receiveMessage, updateMessage } from './contact.service.js';

export const contactRouter = Router();

// public: the contact form of the start page
contactRouter.post('/', contactRateLimit, async (req, res) => {
  await receiveMessage(parse(sendMessageSchema, req.body));
  res.status(204).end();
});

contactRouter.get('/messages', requireAdmin, async (_req, res) => {
  res.json({ messages: await listMessages() });
});

contactRouter.patch('/messages/:id', requireAdmin, async (req, res) => {
  const { id } = parse(messageParamsSchema, req.params);
  const message = await updateMessage(id, parse(updateMessageSchema, req.body));
  res.json({ message });
});

contactRouter.delete('/messages/:id', requireAdmin, async (req, res) => {
  const { id } = parse(messageParamsSchema, req.params);
  await deleteMessage(id);
  res.status(204).end();
});
