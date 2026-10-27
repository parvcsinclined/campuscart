import { z } from "zod";

// Shared by client forms and API routes. The campus-domain check needs server env,
// so it lives in isAllowedCampusEmail and is applied in the signup route.

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your college email.")
  .max(254, "That email is too long.")
  .pipe(z.email("Enter a valid email address."));

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your name (at least 2 characters).").max(80, "Name is too long."),
  email,
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    // bcrypt only hashes the first 72 bytes.
    .refine((p) => new TextEncoder().encode(p).length <= 72, "Password is too long (max 72 bytes)."),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(200),
});

export const verifySchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your email."),
});

/** Exact domain match only: `a@sst.scaler.com` passes, `a@x.sst.scaler.com` and `a@sst.scaler.com.evil.io` do not. */
export function isAllowedCampusEmail(address: string, allowedDomains: string[]): boolean {
  const at = address.lastIndexOf("@");
  if (at < 1) return false;
  const domain = address.slice(at + 1).toLowerCase();
  return allowedDomains.includes(domain);
}
