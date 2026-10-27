import { NextResponse } from "next/server";
import { withErrorHandling, readJson } from "@/lib/errors";
import { requireUser } from "@/lib/authz";
import { rateLimit } from "@/lib/rate-limit";
import { verifySchema } from "@/lib/validation/auth";
import { verifyEmailCode } from "@/lib/services/users";

export const POST = withErrorHandling(async (req) => {
  const user = await requireUser();
  if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });
  await rateLimit(`verify:user:${user.id}`, 15, 15 * 60);
  const { code } = verifySchema.parse(await readJson(req));
  await verifyEmailCode(user.id, code);
  return NextResponse.json({ ok: true });
});
