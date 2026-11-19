import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { config } from '../../config/index.js';
import { transporter } from '../../shared/mail.js';
import { adminAgent, app, signedUpAgent } from '../../test/helpers.js';

const message = { name: ' Ada ', email: 'ada@example.com', message: ' Hello there ' };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('contact', () => {
  it('stores the message and forwards it by mail', async () => {
    const sendMail = vi.spyOn(transporter, 'sendMail');
    await request(app).post('/api/v1/contact').send(message).expect(204);

    expect(sendMail).toHaveBeenCalledOnce();
    expect(sendMail.mock.calls[0]![0]).toMatchObject({
      from: config.mail.from,
      to: config.mail.to,
      replyTo: 'ada@example.com',
      subject: 'Contact form: Ada',
    });

    const admin = await adminAgent();
    const inbox = await admin.get('/api/v1/contact/messages').expect(200);
    expect(inbox.body.messages).toEqual([
      expect.objectContaining({
        name: 'Ada',
        email: 'ada@example.com',
        message: 'Hello there',
        read: false,
      }),
    ]);
  });

  it('answers without waiting for the mail', async () => {
    // an SMTP server that never answers, e.g. behind a blocked port. The cast picks the promise
    // overload of sendMail, the typings put the callback one first.
    vi.spyOn(transporter, 'sendMail').mockImplementationOnce(
      () => new Promise(() => undefined) as never,
    );

    await request(app).post('/api/v1/contact').send(message).expect(204);

    const admin = await adminAgent();
    expect((await admin.get('/api/v1/contact/messages')).body.messages).toHaveLength(1);
  });

  it('keeps the message when the mail cannot be sent', async () => {
    vi.spyOn(transporter, 'sendMail').mockRejectedValueOnce(new Error('SMTP down'));
    await request(app).post('/api/v1/contact').send(message).expect(204);

    const admin = await adminAgent();
    expect((await admin.get('/api/v1/contact/messages')).body.messages).toHaveLength(1);
  });

  it('validates the message', async () => {
    const sendMail = vi.spyOn(transporter, 'sendMail');
    await request(app)
      .post('/api/v1/contact')
      .send({ ...message, name: 'Ada\r\nBcc: x@example.com' })
      .expect(400);
    await request(app)
      .post('/api/v1/contact')
      .send({ ...message, email: 'not-an-email' })
      .expect(400);
    await request(app)
      .post('/api/v1/contact')
      .send({ ...message, message: '   ' })
      .expect(400);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('shows the inbox to admins only', async () => {
    await request(app).get('/api/v1/contact/messages').expect(401);
    const user = await signedUpAgent('ada@example.com');
    await user.get('/api/v1/contact/messages').expect(403);
  });

  it('lists newest first, marks as read and deletes', async () => {
    await request(app)
      .post('/api/v1/contact')
      .send({ ...message, name: 'First' })
      .expect(204);
    await request(app)
      .post('/api/v1/contact')
      .send({ ...message, name: 'Second' })
      .expect(204);

    const admin = await adminAgent();
    const inbox = await admin.get('/api/v1/contact/messages').expect(200);
    expect(inbox.body.messages.map((m: { name: string }) => m.name)).toEqual(['Second', 'First']);
    const { id } = inbox.body.messages[0];

    const read = await admin
      .patch(`/api/v1/contact/messages/${id}`)
      .send({ read: true })
      .expect(200);
    expect(read.body.message).toMatchObject({ id, read: true });
    await admin.patch(`/api/v1/contact/messages/${id}`).send({}).expect(400);

    await admin.delete(`/api/v1/contact/messages/${id}`).expect(204);
    await admin.delete(`/api/v1/contact/messages/${id}`).expect(404);
    expect((await admin.get('/api/v1/contact/messages')).body.messages).toHaveLength(1);
  });
});
