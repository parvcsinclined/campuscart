"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "./ui";

/**
 * Signs out and does a full page load (not a client-side navigation), so no page
 * rendered for the previous account can be reused from the router cache.
 */
export function LogoutButton({
  to = "/login",
  label = "Log out",
  variant = "secondary",
  className = "",
}: {
  to?: string;
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      variant={variant}
      loading={pending}
      className={className}
      onClick={async () => {
        setPending(true);
        try {
          await signOut({ redirect: false });
        } finally {
          window.location.assign(to);
        }
      }}
    >
      {pending ? "Logging out…" : label}
    </Button>
  );
}
