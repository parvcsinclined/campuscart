import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/errors";
import { requireVerifiedUser } from "@/lib/authz";
import { unreadTotal } from "@/lib/services/conversations";

export const GET = withErrorHandling(async () => {
  const user = await requireVerifiedUser();
  return NextResponse.json({ unread: await unreadTotal(user.id) }, { headers: { "Cache-Control": "no-store" } });
});
