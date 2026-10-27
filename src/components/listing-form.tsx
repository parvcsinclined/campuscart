"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { zodFieldErrorsClient } from "@/lib/form-utils";
import { CATEGORIES, CATEGORY_LABEL, CONDITIONS, CONDITION_LABEL, listingInputSchema, type ListingInput } from "@/lib/validation/listing";
import { Button, FormError, SelectField, TextArea, TextField } from "./ui";
import { useToast } from "./toaster";

type Props = { mode: "create" } | { mode: "edit"; listingId: string; initial: ListingInput; disabled?: boolean };

export function ListingForm(props: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const initial = props.mode === "edit" ? props.initial : undefined;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    const parsed = listingInputSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) {
      setFieldErrors(zodFieldErrorsClient(parsed.error));
      return;
    }
    setFieldErrors({});
    setPending(true);
    const res =
      props.mode === "create"
        ? await api<{ id: string }>("/api/listings", { body: parsed.data })
        : await api(`/api/listings/${props.listingId}`, { method: "PATCH", body: parsed.data });
    if (!res.ok) {
      setFieldErrors(res.fieldErrors ?? {});
      setError(res.message);
      setPending(false);
      return;
    }
    if (props.mode === "create") {
      toast("Draft saved. It's not public yet: add a photo and press Publish.", "success");
      router.push(`/listings/${(res.data as { id: string }).id}/edit`);
    } else {
      toast("Changes saved.", "success");
      setPending(false);
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormError message={error} />
      <fieldset disabled={props.mode === "edit" && props.disabled} className="flex flex-col gap-4">
        <TextField label="Title" name="title" defaultValue={initial?.title} placeholder="e.g. Casio fx-991EX scientific calculator" error={fieldErrors.title} />
        <TextArea
          label="Description"
          name="description"
          defaultValue={initial?.description}
          placeholder="Edition, wear and tear, what's included…"
          error={fieldErrors.description}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Category"
            name="category"
            defaultValue={initial?.category ?? ""}
            error={fieldErrors.category}
            options={[{ value: "", label: "Choose…" }, ...CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))]}
          />
          <SelectField
            label="Condition"
            name="condition"
            defaultValue={initial?.condition ?? ""}
            error={fieldErrors.condition}
            options={[{ value: "", label: "Choose…" }, ...CONDITIONS.map((c) => ({ value: c, label: CONDITION_LABEL[c] }))]}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Price (₹)" name="priceInr" type="number" inputMode="numeric" min={1} step={1} defaultValue={initial?.priceInr} placeholder="500" error={fieldErrors.priceInr} />
          <TextField label="Campus pickup location" name="pickupLocation" defaultValue={initial?.pickupLocation} placeholder="e.g. Hostel B lobby" error={fieldErrors.pickupLocation} />
        </div>
        <Button type="submit" loading={pending} className="self-start">
          {props.mode === "create" ? (pending ? "Saving…" : "Save & add photos") : pending ? "Saving…" : "Save changes"}
        </Button>
      </fieldset>
    </form>
  );
}
