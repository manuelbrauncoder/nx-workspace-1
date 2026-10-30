import { logger } from '@server/core/logger';
import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config/index.js';

const { enabled, host, port, secure, user, from } = config.mail;

/**
 * SMTP while mail is enabled. Disabled (development, tests), the JSON transport only renders
 * the message, so nothing leaves the process. Exported so tests can spy on sendMail.
 */
export const transporter: Transporter = enabled
  ? nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass: config.env.SMTP_PASSWORD },
    })
  : nodemailer.createTransport({ jsonTransport: true });

export interface Mail {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}

export async function sendMail(mail: Mail): Promise<void> {
  await transporter.sendMail({ from, ...mail });
  if (!enabled) logger.debug({ to: mail.to, subject: mail.subject }, 'Mail not sent (disabled)');
}
