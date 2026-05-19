import { z } from 'zod'

const envSchema = z.object({
  // Required in all environments
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),

  // PayPlus — required in production, optional in dev
  PAYPLUS_SECRET_KEY: z.string().optional(),
  PAYPLUS_API_KEY: z.string().optional(),
  PAYPLUS_PAGE_UID: z.string().optional(),
  PAYPLUS_SKIP_SIG_VERIFY: z.enum(['true', 'false']).optional(),

  // App URL
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Email
  RESEND_API_KEY: z.string().optional(),

  // Image storage
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Node env
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

// Production-only required fields
const productionSchema = envSchema.superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production') {
    if (!data.PAYPLUS_SECRET_KEY) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'PAYPLUS_SECRET_KEY is required in production', path: ['PAYPLUS_SECRET_KEY'] })
    }
    if (!data.RESEND_API_KEY) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'RESEND_API_KEY is required in production', path: ['RESEND_API_KEY'] })
    }
  }
})

function validateEnv() {
  const result = productionSchema.safeParse(process.env)
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors
    const messages = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(', ')}`)
      .join('\n')
    throw new Error(`Invalid environment variables:\n${messages}`)
  }
  return result.data
}

// Validated at import time — throws immediately if env is broken
export const env = validateEnv()
