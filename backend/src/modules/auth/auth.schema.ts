import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(1, 'Email or phone is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});
