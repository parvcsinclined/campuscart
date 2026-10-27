import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/authz";
import { allowedEmailDomains } from "@/lib/env";
import { SignedInNotice } from "@/components/signed-in-notice";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) return <SignedInNotice name={user.name} email={user.email} isVerified={user.isVerified} />;
  // The demo domain is for seeded evaluator accounts; don't advertise it.
  const domains = allowedEmailDomains().filter((d) => d !== "example.edu");
  return <SignupForm domains={domains} />;
}
