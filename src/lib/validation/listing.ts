import { z } from "zod";

export const CATEGORIES = ["TEXTBOOKS", "CALCULATORS", "FURNITURE", "ELECTRONICS", "OTHER"] as const;
export const CONDITIONS = ["NEW", "LIKE_NEW", "GOOD", "FAIR"] as const;
export const STATUSES = ["AVAILABLE", "RESERVED", "SOLD", "WITHDRAWN"] as const;

export const CATEGORY_LABEL: Record<(typeof CATEGORIES)[number], string> = {
  TEXTBOOKS: "Textbooks",
  CALCULATORS: "Calculators",
  FURNITURE: "Furniture",
  ELECTRONICS: "Electronics",
  OTHER: "Other",
};
export const CONDITION_LABEL: Record<(typeof CONDITIONS)[number], string> = {
  NEW: "New",
  LIKE_NEW: "Like new",
  GOOD: "Good",
  FAIR: "Fair",
};

export const MAX_PRICE_INR = 1_000_000;

export const listingInputSchema = z.object({
  title: z.string().trim().min(3, "Give it a title (at least 3 characters).").max(120, "Keep the title under 120 characters."),
  description: z
    .string()
    .trim()
    .min(10, "Add a short description (at least 10 characters).")
    .max(4000, "Keep the description under 4000 characters."),
  category: z.enum(CATEGORIES, "Pick a category."),
  condition: z.enum(CONDITIONS, "Pick a condition."),
  priceInr: z.preprocess(
    // Treat an empty form field as missing rather than coercing it to 0.
    (v) => (v === "" || v === null ? undefined : v),
    z.coerce
      .number("Enter a price in rupees.")
      .int("Use whole rupees, with no paise.")
      .min(1, "Price must be at least ₹1.")
      .max(MAX_PRICE_INR, "That price is too high."),
  ),
  pickupLocation: z
    .string()
    .trim()
    .min(2, "Where on campus can the buyer pick it up?")
    .max(120, "Keep the pickup location short."),
});
export type ListingInput = z.infer<typeof listingInputSchema>;

// ---- Photos ----
export const MAX_IMAGES = 5;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Upload pathnames are generated client-side but must match this shape for the token to be issued. */
export function listingImagePathPattern(listingId: string) {
  return new RegExp(`^listings/${listingId}/[a-z0-9-]{8,64}\\.(webp|jpg|png)$`);
}

export const attachImageSchema = z.object({
  url: z.url().max(1000),
  pathname: z.string().max(300),
});
