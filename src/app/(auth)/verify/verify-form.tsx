"use client";

import { useEffect, useState } from "react";
import { verifySchema } from "@/lib/validation/auth";
import { api } from "@/lib/api-client";
import { Button, Card, FormError, TextField } from "@/components/ui";
import { useToast } from "@/components/toaster";

const RESEND_COOLDOWN = 60;

export function VerifyForm({ email }: { email: string }) {
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [error, setError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string[] | undefined>();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    const parsed = verifySchema.safeParse({ code: new FormData(e.currentTarget).get("code") });
    if (!parsed.success) {
      setCodeError([parsed.error.issues[0].message]);
      return;
    }
    setCodeError(undefined);
    setPending(true);
    const res = await api("/api/auth/verify", { body: parsed.data });
    if (!res.ok) {
      if (res.fieldErrors?.code) setCodeError(res.fieldErrors.code);
      else setError(res.message);
      setPending(false);
      return;
    }
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload after an auth change, so no page cached for a previous account is reused
    window.location.assign("/browse");
  }

  async function resend() {
    setResending(true);
    setError(null);
    const res = await api("/api/auth/verify/resend", { method: "POST" });
    setResending(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setCooldown(RESEND_COOLDOWN);
    setCodeError(undefined);
    toast("A new code is on its way.", "success");
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">Check your email</h1>
      <p className="mt-1 text-sm text-muted">
        Enter the 6-digit code emailed to <span className="font-medium text-ink">{email}</span>. Codes expire after 15 minutes. Check your spam folder, or
        use &ldquo;Resend code&rdquo; to get a new one.
      </p>
      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <FormError message={error} />
        <TextField
          label="Verification code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          error={codeError}
          className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-center font-mono text-2xl tracking-[0.5em] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <Button type="submit" loading={pending} className="w-full">
          {pending ? "Verifying…" : "Verify email"}
        </Button>
        <Button type="button" variant="ghost" onClick={resend} loading={resending} disabled={cooldown > 0} className="w-full">
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </Button>
      </form>
    </Card>
  );
}
