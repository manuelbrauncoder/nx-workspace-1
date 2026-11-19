import type { SendMessageInput, UpdateMessageInput } from '@portfolio/contracts/contact';
import { db } from '@server/core/db/db';
import { notFound } from '@server/core/errors';
import { logger } from '@server/core/logger';
import { desc, eq } from 'drizzle-orm';
import { config } from '../../config/index.js';
import { sendMail } from '../../shared/mail.js';
import { contactMessages } from './contact.table.js';

const messageColumns = {
  id: contactMessages.id,
  name: contactMessages.name,
  email: contactMessages.email,
  message: contactMessages.message,
  read: contactMessages.read,
  createdAt: contactMessages.createdAt,
};

/**
 * Stores the message, then forwards it by mail in the background: the visitor gets the answer
 * as soon as the message is in the inbox, not after the SMTP server. A failed mail is logged,
 * not reported to the visitor.
 */
export async function receiveMessage(input: SendMessageInput) {
  const [message] = await db.insert(contactMessages).values(input).returning(messageColumns);

  void sendMail({
    to: config.mail.to,
    replyTo: input.email,
    subject: `Contact form: ${input.name}`,
    text: `${input.message}\n\n${input.name} <${input.email}>`,
  }).catch((error: unknown) => {
    logger.error({ err: error, messageId: message!.id }, 'Could not forward contact message');
  });
}

export function listMessages() {
  return db.select(messageColumns).from(contactMessages).orderBy(desc(contactMessages.createdAt));
}

export async function updateMessage(id: string, input: UpdateMessageInput) {
  const [message] = await db
    .update(contactMessages)
    .set({ read: input.read })
    .where(eq(contactMessages.id, id))
    .returning(messageColumns);
  if (!message) throw notFound('Message not found');
  return message;
}

export async function deleteMessage(id: string) {
  const deleted = await db
    .delete(contactMessages)
    .where(eq(contactMessages.id, id))
    .returning({ id: contactMessages.id });
  if (deleted.length === 0) throw notFound('Message not found');
}
