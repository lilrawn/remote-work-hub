import { z } from 'zod';

// =====================================================
// SECURITY: Input validation schemas using Zod
// All user inputs MUST be validated before processing
// =====================================================

// Email validation with strict rules
export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Invalid email address')
  .max(255, 'Email must be less than 255 characters')
  .toLowerCase();

// Password validation with security requirements
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Simple password for login (no regex, just length)
export const loginPasswordSchema = z
  .string()
  .min(1, 'Password is required')
  .max(128, 'Password must be less than 128 characters');

// Phone number validation (Kenya format)
export const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Phone number is required')
  .max(15, 'Phone number is too long')
  .regex(
    /^(?:\+?254|0)?[17]\d{8}$/,
    'Invalid Kenyan phone number format'
  );

// Name validation
export const nameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

// Search query validation (prevent injection)
export const searchQuerySchema = z
  .string()
  .trim()
  .max(100, 'Search query is too long')
  .transform((val) => val.replace(/[<>'"]/g, '')); // Strip potential XSS characters

// Auth form schemas
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  fullName: nameSchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const signInSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

// Checkout form schema
export const checkoutSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  email: z.string().trim().email('Invalid email').max(255).optional().or(z.literal('')),
});

// Admin job account form schema
export const jobAccountSchema = z.object({
  title: z.string().trim().min(3, 'Title is required').max(200),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(2000),
  company: z.string().trim().max(100).optional(),
  price: z.number().min(2000, 'Minimum price is KSH 2,000').max(100000, 'Maximum price is KSH 100,000'),
  monthly_earnings: z.string().trim().max(50).optional(),
  skills_required: z.array(z.string().trim().max(50)).max(10).optional(),
  category_id: z.string().uuid('Invalid category'),
  is_available: z.boolean().default(true),
});

// Order lookup schema (for order history)
export const orderLookupSchema = z.object({
  phone: phoneSchema,
});

// Type exports
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
export type CheckoutFormData = z.infer<typeof checkoutSchema>;
export type JobAccountFormData = z.infer<typeof jobAccountSchema>;
export type OrderLookupFormData = z.infer<typeof orderLookupSchema>;

// Utility function to format phone number for M-Pesa
export function formatPhoneForMpesa(phone: string): string {
  // Remove any non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle different formats
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('+254')) {
    cleaned = cleaned.substring(1);
  } else if (!cleaned.startsWith('254')) {
    cleaned = '254' + cleaned;
  }
  
  return cleaned;
}

// Sanitize string for display (prevent XSS)
export function sanitizeForDisplay(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
