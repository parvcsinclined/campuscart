"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { signupSchema } from "@/lib/validation/auth";
import { zodFieldErrorsClient } from "@/lib/form-utils";
import { api } from "@/lib/api-client";
import { Button, Card, FormError, TextField } from "@/components/ui";
import { useToast } from "@/components/toaster";

export function SignupForm({ domains }: { domains: string[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const domainHint = domains.length ? `Must end in ${domains.map((d) => "@" + d).join(" or ")}` : undefined;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrorsClient(parsed.error));
      return;
    }
    setFieldErrors({});
    setPending(true);

    const res = await api<{ ok: true; emailSent: boolean }>("/api/auth/signup", { body: parsed.data });
    if (!res.ok) {
      setFieldErrors(res.fieldErrors ?? {});
      setError(res.message);
      setPending(false);
      return;
    }

    const login = await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirect: false }).catch(() => null);
    if (!login || login.error) {
      toast("Account created. Please log in to verify your email.", "info");
      router.replace("/login");
      return;
    }
    toast(res.data.emailSent ? "Account created! Check your inbox for a 6-digit code." : "Account created, but we couldn't send the email. Use “Resend code”.", res.data.emailSent ? "success" : "error");
    router.replace("/verify");
    router.refresh();
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">Join your campus market</h1>
      <p className="mt-1 text-sm text-muted">Only students with a college email can join.</p>
      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <FormError message={error} />
        <TextField label="Full name" name="name" autoComplete="name" error={fieldErrors.name} />
        <TextField label="College email" name="email" type="email" autoComplete="email" inputMode="email" error={fieldErrors.email} hint={domainHint} />
        <TextField label="Password" name="password" type="password" autoComplete="new-password" error={fieldErrors.password} hint="At least 8 characters." />
        <Button type="submit" loading={pending} className="mt-2 w-full">
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Log in
        </Link>
      </p>
    </Card>
  );
}
