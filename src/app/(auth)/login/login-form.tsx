"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { loginSchema } from "@/lib/validation/auth";
import { zodFieldErrorsClient } from "@/lib/form-utils";
import { Button, Card, FormError, TextField } from "@/components/ui";

export function LoginForm({ next }: { next: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrorsClient(parsed.error));
      return;
    }
    setFieldErrors({});
    setPending(true);
    try {
      const res = await signIn("credentials", { ...parsed.data, redirect: false });
      if (res?.error) {
        setError(
          res.code === "rate_limited"
            ? "Too many login attempts. Wait 15 minutes and try again."
            : "Email or password is incorrect.",
        );
        setPending(false);
        return;
      }
      // Full page load: guarantees nothing rendered for a previous session is reused.
      window.location.assign(next);
    } catch {
      setError("Couldn't reach CampusCart. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Log in with your college email.</p>
      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <FormError message={error} />
        <TextField label="College email" name="email" type="email" autoComplete="email" inputMode="email" error={fieldErrors.email} />
        <TextField label="Password" name="password" type="password" autoComplete="current-password" error={fieldErrors.password} />
        <Button type="submit" loading={pending} className="mt-2 w-full">
          {pending ? "Logging in…" : "Log in"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </Card>
  );
}
