import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { allowedEmailDomains } from "@/lib/env";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/browse");
  // The demo domain is for seeded evaluator accounts; don't advertise it.
  const domains = allowedEmailDomains().filter((d) => d !== "example.edu");
  return <SignupForm domains={domains} />;
}
