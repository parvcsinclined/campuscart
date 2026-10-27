import "server-only";
import { z } from "zod";

const optional = z
  .string()
  .optional()
  // Treat empty strings and unfilled placeholders from .env.example as unset.
  .transform((v) => (v && v.trim() && !v.startsWith("your-") ? v.trim() : undefined));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET is required (run `npx auth secret`)"),
  ALLOWED_EMAIL_DOMAINS: z.string().min(1, "ALLOWED_EMAIL_DOMAINS is required"),
  // "required": new accounts must enter an emailed 6-digit code. "off" (default): the
  // campus-domain check at sign-up is the only gate, and accounts are active immediately.
  EMAIL_VERIFICATION: z.enum(["required", "off"]).default("off"),
  BLOB_READ_WRITE_TOKEN: optional,
  SMTP_HOST: optional,
  SMTP_PORT: optional,
  SMTP_USER: optional,
  SMTP_PASSWORD: optional,
  EMAIL_FROM: optional,
});

let cached: z.infer<typeof schema> | undefined;

export function env() {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`Invalid environment configuration: ${issues}`);
    }
    cached = parsed.data;
  }
  return cached;
}

export function emailVerificationRequired(): boolean {
  return env().EMAIL_VERIFICATION === "required";
}

export function allowedEmailDomains(): string[] {
  return parseDomainList(env().ALLOWED_EMAIL_DOMAINS);
}

export function parseDomainList(raw: string): string[] {
  return raw
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}
