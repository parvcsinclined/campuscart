import { NextResponse } from "next/server";
import { withErrorHandling, readJson } from "@/lib/errors";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { signupSchema } from "@/lib/validation/auth";
import { registerUser } from "@/lib/services/users";

export const POST = withErrorHandling(async (req) => {
  await rateLimit(`signup:ip:${clientIp(req)}`, 5, 60 * 60);
  const input = signupSchema.parse(await readJson(req));
  const { emailSent } = await registerUser(input);
  return NextResponse.json({ ok: true, emailSent }, { status: 201 });
});
