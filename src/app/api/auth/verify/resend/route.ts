import { NextResponse } from "next/server";
import { withErrorHandling, conflict } from "@/lib/errors";
import { requireUser } from "@/lib/authz";
import { rateLimit } from "@/lib/rate-limit";
import { issueVerificationCode } from "@/lib/services/users";

export const POST = withErrorHandling(async () => {
  const user = await requireUser();
  if (user.emailVerified) throw conflict("Your email is already verified.");
  await rateLimit(`verify-resend:cooldown:${user.id}`, 1, 60);
  await rateLimit(`verify-resend:hour:${user.id}`, 5, 60 * 60);
  await issueVerificationCode(user);
  return NextResponse.json({ ok: true });
});
