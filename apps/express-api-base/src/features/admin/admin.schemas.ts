import { z } from 'zod';
import { roleSchema } from '../auth/auth.schemas.js';

export const userParamsSchema = z.object({ id: z.uuid() });

export const updateUserSchema = z.object({ role: roleSchema });

export type UpdateUserInput = z.output<typeof updateUserSchema>;
