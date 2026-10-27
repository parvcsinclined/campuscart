import { NextResponse } from "next/server";
import { withErrorHandling, readJson } from "@/lib/errors";
import { requireVerifiedUser } from "@/lib/authz";
import { rateLimit } from "@/lib/rate-limit";
import { messageSchema } from "@/lib/validation/conversation";
import { postMessage } from "@/lib/services/conversations";

export const POST = withErrorHandling<RouteContext<"/api/conversations/[id]/messages">>(async (req, ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await ctx.params;
  await rateLimit(`message:${user.id}`, 30, 60);
  const { body } = messageSchema.parse(await readJson(req));
  return NextResponse.json(await postMessage(user.id, id, body), { status: 201 });
});
