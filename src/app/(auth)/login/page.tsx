import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/authz";
import { SignedInNotice } from "@/components/signed-in-notice";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // Don't silently bounce a logged-in user away: show who they are and offer to switch accounts.
  const user = await getCurrentUser();
  if (user) return <SignedInNotice name={user.name} email={user.email} isVerified={user.isVerified} />;
  const { next } = await searchParams;
  // Only allow same-site relative redirects.
  const safeNext = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/browse";
  return <LoginForm next={safeNext} />;
}
