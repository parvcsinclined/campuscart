import "server-only";
import nodemailer from "nodemailer";
import { env } from "./env";
import { AppError } from "./errors";

function smtpConfigured() {
  const e = env();
  return Boolean(e.SMTP_HOST && e.SMTP_USER && e.SMTP_PASSWORD);
}

export async function sendVerificationCode(to: string, name: string, code: string) {
  const e = env();
  if (!smtpConfigured()) {
    if (e.NODE_ENV === "production") {
      console.error("[email] SMTP is not configured in production; cannot send verification code");
      throw new AppError(503, "SERVICE_UNAVAILABLE", "We couldn't send the verification email right now. Please try again later.");
    }
    console.info(`[email] (dev, no SMTP configured) verification code for ${to}: ${code}`);
    return;
  }

  const port = Number(e.SMTP_PORT ?? 465);
  const transport = nodemailer.createTransport({
    host: e.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: e.SMTP_USER, pass: e.SMTP_PASSWORD },
  });

  try {
    await transport.sendMail({
      from: e.EMAIL_FROM ?? `CampusCart <${e.SMTP_USER}>`,
      to,
      subject: `${code} is your CampusCart verification code`,
      text: `Hi ${name},\n\nYour CampusCart verification code is ${code}. It expires in 15 minutes.\n\nIf you didn't sign up, you can ignore this email.`,
    });
  } catch (err) {
    console.error("[email] failed to send verification code", err);
    throw new AppError(503, "SERVICE_UNAVAILABLE", "We couldn't send the verification email. Please try again in a minute.");
  }
}
