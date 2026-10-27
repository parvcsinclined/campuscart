import { z } from "zod";

export const messageSchema = z.object({
  body: z.string().trim().min(1, "Write a message first.").max(2000, "Messages are limited to 2000 characters."),
});

const amount = z.coerce
  .number("Enter an amount in rupees.")
  .int("Use whole rupees, with no paise.")
  .min(1, "Offer at least ₹1.")
  .max(1_000_000, "That amount is too high.");

export const offerSchema = z.object({ amountInr: amount });

export const respondSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept") }),
  z.object({ action: z.literal("reject") }),
  z.object({ action: z.literal("withdraw") }),
  z.object({ action: z.literal("counter"), amountInr: amount }),
]);

// "expire" is system-only and deliberately not accepted from clients.
export const transitionSchema = z.object({
  action: z.enum(["reserve", "cancel_reservation", "back_out", "complete", "withdraw", "relist"]),
  conversationId: z.string().min(1).max(40).optional(),
});
