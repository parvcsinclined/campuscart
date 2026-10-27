import "server-only";
import { createHash, randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { env, allowedEmailDomains, emailVerificationRequired } from "../env";
import { badRequest, conflict, AppError } from "../errors";
import { sendVerificationCode } from "../email";
import { isAllowedCampusEmail, type SignupInput } from "../validation/auth";

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

function hashCode(userId: string, code: string) {
  return createHash("sha256").update(`${userId}:${code}:${env().AUTH_SECRET}`).digest("hex");
}

export async function registerUser(input: SignupInput) {
  const domains = allowedEmailDomains();
  if (!isAllowedCampusEmail(input.email, domains)) {
    throw badRequest("CampusCart is only open to students with a college email.", {
      email: [`Use your college email (${domains.filter((d) => d !== "example.edu").map((d) => "@" + d).join(", ")}).`],
    });
  }

  const existing = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) {
    throw conflict("An account with this email already exists. Try logging in instead.");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const requireCode = emailVerificationRequired();
  const user = await db.user.create({
    // Without code verification the account is active immediately (campus domain already checked).
    data: { name: input.name, email: input.email, passwordHash, emailVerified: requireCode ? null : new Date() },
    select: { id: true, name: true, email: true },
  });
  if (!requireCode) return { id: user.id, emailSent: false, verified: true };
  // The account exists either way; if email delivery fails the user can log in and resend.
  try {
    await issueVerificationCode(user);
    return { id: user.id, emailSent: true, verified: false };
  } catch (err) {
    if (err instanceof AppError && err.status === 503) return { id: user.id, emailSent: false, verified: false };
    throw err;
  }
}

export async function issueVerificationCode(user: { id: string; name: string; email: string }) {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await db.$transaction([
    db.verificationToken.deleteMany({ where: { userId: user.id } }),
    db.verificationToken.create({
      data: { userId: user.id, codeHash: hashCode(user.id, code), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
    }),
  ]);
  await sendVerificationCode(user.email, user.name, code);
}

export async function verifyEmailCode(userId: string, code: string) {
  const token = await db.verificationToken.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  if (!token) throw badRequest("No active code. Request a new one.", { code: ["No active code. Request a new one."] });
  if (token.expiresAt < new Date()) {
    throw badRequest("That code has expired. Request a new one.", { code: ["That code has expired. Request a new one."] });
  }
  if (token.attempts >= MAX_CODE_ATTEMPTS) {
    throw new AppError(429, "RATE_LIMITED", "Too many wrong attempts. Request a new code.");
  }

  if (token.codeHash !== hashCode(userId, code)) {
    await db.verificationToken.update({ where: { id: token.id }, data: { attempts: { increment: 1 } } });
    const left = MAX_CODE_ATTEMPTS - token.attempts - 1;
    throw badRequest("Incorrect code.", {
      code: [left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Incorrect code. Request a new one."],
    });
  }

  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { emailVerified: new Date() } }),
    db.verificationToken.deleteMany({ where: { userId } }),
  ]);
}
