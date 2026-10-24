import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(3, 'Phone or email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'),
  address: z.string().min(10, 'Full address is required'),
});

export const chitGroupSchema = z.object({
  name: z.string().min(3, 'Group name is required'),
  type: z.enum(['FIXED', 'AUCTION']),
  chitValue: z.number().min(50000, 'Minimum chit value is ₹50,000'),
  durationMonths: z.number().min(10, 'Minimum duration is 10 months'),
  totalMembers: z.number().min(10, 'Minimum 10 members required'),
  foremanCommissionPercentage: z.number().min(0).max(10, 'Commission cannot exceed 10%'),
});

export const paymentSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  chitGroupId: z.string().min(1, 'Chit group is required'),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE']),
  referenceNo: z.string().optional(),
});
