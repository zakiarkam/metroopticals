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

  NEXTAUTH_URL: isBuildPhase
    ? z.string().optional()
    : z.string().min(1, "NEXTAUTH_URL is required"),

  NEXT_PUBLIC_SITE_URL: z.string().optional(),

  // Many projects enforce 32+ chars; adjust to match your project rules
  NEXTAUTH_SECRET: isBuildPhase
    ? z.string().optional()
    : z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),

  // Password resets and order confirmations go out by email, so a live site
  // without a key would fail its customers silently. Required in production
  // unless the mock is deliberately switched on.
  RESEND_API_KEY:
    process.env.NODE_ENV === "production" &&
    process.env.USE_MOCK_EMAIL !== "true" &&
    !isBuildPhase
      ? z.string().min(1, "RESEND_API_KEY is required in production")
      : z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PHONE: z.string().optional(),

  // Cloudflare R2 storage
  R2_BUCKET_NAME: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  // Every catalogue image URL is built from this; without it the storefront
  // renders broken pictures with no error anywhere.
  NEXT_PUBLIC_R2_PUBLIC_URL:
    process.env.NODE_ENV === "production" && !isBuildPhase
      ? z.string().url("NEXT_PUBLIC_R2_PUBLIC_URL is required in production")
      : z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  NEXT_PUBLIC_WHATSAPP_NUMBER: z.string().optional(),
  WASENDER_API_KEY: z.string().optional(),
  WASENDER_API_URL: z.string().optional(),
  USE_MOCK_EMAIL: z.string().optional(),
  ADMIN_BOOTSTRAP_EMAIL: z.string().optional(),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().optional(),

  // Reading a prescription off an uploaded photo, via Gemini. Unset simply
  // hides the "Upload a photo" option — the manual form is always there, so
  // nothing breaks without it.
  PRESCRIPTION_OCR_PROVIDER: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  GEMINI_API_URL: z.string().optional(),

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
