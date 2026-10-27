import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageVerifiedUser } from "@/lib/authz";
import { AppError } from "@/lib/errors";
import { getThread } from "@/lib/services/conversations";
import { Thread } from "@/components/thread";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationPage({ params }: PageProps<"/inbox/[id]">) {
  const user = await pageVerifiedUser();
  const { id } = await params;
  let thread;
  try {
    thread = await getThread(user.id, id);
  } catch (err) {
    // Missing or not a participant: same 404, so conversation IDs can't be probed.
    if (err instanceof AppError && (err.status === 404 || err.status === 403)) notFound();
    throw err;
  }
  return (
    <>
      <Link href="/inbox" className="mb-3 inline-block text-sm font-semibold text-brand hover:underline">
        ← Inbox
      </Link>
      {/* Server-rendered initial state; dates are serialised for the client component. */}
      <Thread initial={JSON.parse(JSON.stringify(thread))} meId={user.id} />
    </>
  );
}
