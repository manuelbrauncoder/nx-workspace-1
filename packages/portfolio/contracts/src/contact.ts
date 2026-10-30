import { z } from 'zod';

/** The body of `POST /contact`, sent by the contact form. */
export const sendMessageSchema = z.object({
  // a single line: the name goes into the subject of the notification mail
  name: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[^\r\n]*$/, 'Must be a single line'),
  email: z.string().trim().pipe(z.email().max(254)),
  message: z.string().trim().min(1).max(5000),
});

export const messageParamsSchema = z.object({ id: z.uuid() });

export const updateMessageSchema = z.object({ read: z.boolean() });

/** A message as returned to the admin. */
export const contactMessageSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  message: z.string(),
  read: z.boolean(),
  createdAt: z.iso.datetime(),
});

export type SendMessageInput = z.output<typeof sendMessageSchema>;
export type UpdateMessageInput = z.output<typeof updateMessageSchema>;

// The API wraps a single message and the list in an object.
export const contactMessageResponseSchema = z.object({ message: contactMessageSchema });
export const contactMessagesResponseSchema = z.object({ messages: z.array(contactMessageSchema) });

// The wire format as a client sees it. `createdAt` is an ISO 8601 string.
/** Body of `POST /contact`. */
export type SendMessageDto = z.input<typeof sendMessageSchema>;
export type ContactMessageDto = z.output<typeof contactMessageSchema>;
export type ContactMessageResponseDto = z.output<typeof contactMessageResponseSchema>;
export type ContactMessagesResponseDto = z.output<typeof contactMessagesResponseSchema>;
/** Body of `PATCH /contact/messages/{id}`. */
export type UpdateMessageDto = z.input<typeof updateMessageSchema>;
