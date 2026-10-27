import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/browse");
  const { next } = await searchParams;
  // Only allow same-site relative redirects.
  const safeNext = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/browse";
  return <LoginForm next={safeNext} />;
}
