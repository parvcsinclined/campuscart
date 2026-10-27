import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { pageUser } from "@/lib/authz";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyPage() {
  const user = await pageUser();
  if (user.isVerified) redirect("/browse");
  return <VerifyForm email={user.email} />;
}
