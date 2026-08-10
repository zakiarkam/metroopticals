import { z } from "zod";

// Next sets NEXT_PHASE during build.
// We should NOT fail hard for runtime-only env vars during build.
const isBuildPhase =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.NEXT_PHASE === "phase-export";

const envSchema = z.object({
  NODE_ENV: z.string().optional(),

  DATABASE_URL: isBuildPhase
    ? z.string().optional()
    : z.string().min(1, "DATABASE_URL is required"),

  DIRECT_URL: z.string().optional(),

  NEXTAUTH_URL: isBuildPhase
    ? z.string().optional()
    : z.string().min(1, "NEXTAUTH_URL is required"),

  NEXT_PUBLIC_SITE_URL: z.string().optional(),

  // Many projects enforce 32+ chars; adjust to match your project rules
  NEXTAUTH_SECRET: isBuildPhase
    ? z.string().optional()
    : z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PHONE: z.string().optional(),

  // Cloudflare R2 storage
  R2_BUCKET_NAME: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  NEXT_PUBLIC_R2_PUBLIC_URL: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  NEXT_PUBLIC_WHATSAPP_NUMBER: z.string().optional(),

  LOG_LEVEL: z.string().optional(),
  REQUEST_TIMEOUT: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // During build, don't crash the build because runtime vars may not exist.
  if (!isBuildPhase) {
    const missing = parsed.error.issues.map((i) => i.message).join(", ");
    throw new Error(`Missing or invalid environment variables: ${missing}`);
  }
}

export const env = parsed.success ? parsed.data : (process.env as any);
export type Env = z.infer<typeof envSchema>;
