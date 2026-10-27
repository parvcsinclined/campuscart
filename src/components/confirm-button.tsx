"use client";

import { useState, type ReactNode } from "react";
import { Button } from "./ui";

/** Two-step inline confirmation for irreversible actions (no window.confirm). */
export function ConfirmButton({
  onConfirm,
  children,
  prompt,
  confirmLabel = "Yes, continue",
  variant = "secondary",
  disabled,
}: {
  onConfirm: () => Promise<void>;
  children: ReactNode;
  prompt: string;
  confirmLabel?: string;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}) {
  const [stage, setStage] = useState<"idle" | "confirm" | "pending">("idle");
  if (stage === "idle") {
    return (
      <Button variant={variant} onClick={() => setStage("confirm")} disabled={disabled}>
        {children}
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface-2 p-2">
      <span className="px-1 text-sm">{prompt}</span>
      <Button
        variant={variant === "danger" ? "danger" : "primary"}
        loading={stage === "pending"}
        onClick={async () => {
          setStage("pending");
          await onConfirm();
          setStage("idle");
        }}
      >
        {confirmLabel}
      </Button>
      <Button variant="ghost" onClick={() => setStage("idle")} disabled={stage === "pending"}>
        Cancel
      </Button>
    </div>
  );
}
