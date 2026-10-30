import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { errorResponses, jsonContent, jsonResponse, sessionAuth } from '@server/core/openapi';
import { z } from 'zod';
import {
  contactMessageSchema,
  messageParamsSchema,
  sendMessageSchema,
  updateMessageSchema,
} from './contact.schemas.js';

export function registerContactDocs(registry: OpenAPIRegistry) {
  registry.registerPath({
    method: 'post',
    path: '/contact',
    tags: ['Contact'],
    summary: 'Send a message',
    description:
      'Public, rate limited per IP. The message is stored in the inbox and forwarded by mail; ' +
      "the reply-to address is the sender's.",
    request: { body: jsonContent(sendMessageSchema) },
    responses: {
      204: { description: 'Message received' },
      ...errorResponses(400, 403, 429),
    },
  });

  const base = { tags: ['Contact'], security: sessionAuth };

  registry.registerPath({
    ...base,
    method: 'get',
    path: '/contact/messages',
    summary: 'List received messages',
    description: 'Admin only. Newest first.',
    responses: {
      200: jsonResponse('All messages', z.object({ messages: z.array(contactMessageSchema) })),
      ...errorResponses(401, 403),
    },
  });

  registry.registerPath({
    ...base,
    method: 'patch',
    path: '/contact/messages/{id}',
    summary: 'Mark a message as read or unread',
    description: 'Admin only.',
    request: { params: messageParamsSchema, body: jsonContent(updateMessageSchema) },
    responses: {
      200: jsonResponse('The changed message', z.object({ message: contactMessageSchema })),
      ...errorResponses(400, 401, 403, 404),
    },
  });

  registry.registerPath({
    ...base,
    method: 'delete',
    path: '/contact/messages/{id}',
    summary: 'Delete a message',
    description: 'Admin only.',
    request: { params: messageParamsSchema },
    responses: {
      204: { description: 'Message deleted' },
      ...errorResponses(400, 401, 403, 404),
    },
  });
}
