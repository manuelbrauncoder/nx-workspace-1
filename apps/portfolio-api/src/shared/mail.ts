import { logger } from '@server/core/logger';
import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config/index.js';

const { enabled, host, port, secure, user, from } = config.mail;

/** Long enough for a slow SMTP server, short enough that a blocked port shows up in the log. */
const CONNECTION_TIMEOUT_MS = 10_000;
const GREETING_TIMEOUT_MS = 10_000;
const SOCKET_TIMEOUT_MS = 30_000;

/**
 * SMTP while mail is enabled. Disabled (development, tests), the JSON transport only renders
 * the message, so nothing leaves the process. Exported so tests can spy on sendMail.
 *
 * `secure: true` is TLS from the start (port 465). `secure: false` starts plain and switches to
 * TLS with STARTTLS (port 587); `requireTLS` makes that switch mandatory, so a server or a
 * man in the middle that drops STARTTLS ends the connection instead of getting the password in
 * plain text.
 *
 * One pooled connection: mails queue up in the transporter instead of opening a connection and a
 * login each. The contact form no longer waits for the mail, so without the pool a burst of
 * messages would open as many SMTP sessions at once, which the mail provider may throttle.
 */
export const transporter: Transporter = enabled
  ? nodemailer.createTransport({
      host,
      port,
      secure,
      requireTLS: !secure,
      pool: true,
      maxConnections: 1,
      maxMessages: 100,
      auth: { user, pass: config.env.SMTP_PASSWORD },
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      greetingTimeout: GREETING_TIMEOUT_MS,
      socketTimeout: SOCKET_TIMEOUT_MS,
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
