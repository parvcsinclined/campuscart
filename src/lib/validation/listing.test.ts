import { describe, expect, it } from "vitest";
import { listingImagePathPattern, listingInputSchema } from "./listing";

const valid = {
  title: "Casio fx-991EX",
  description: "Works perfectly, used for one semester.",
  category: "CALCULATORS",
  condition: "GOOD",
  priceInr: "650",
  pickupLocation: "Library",
};

describe("listingInputSchema", () => {
  it("coerces form strings to an integer price", () => {
    expect(listingInputSchema.parse(valid).priceInr).toBe(650);
  });
  it("asks for a price when the field is empty", () => {
    const r = listingInputSchema.safeParse({ ...valid, priceInr: "" });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toBe("Enter a price in rupees.");
  });
  it("rejects paise, zero and unknown categories", () => {
    expect(listingInputSchema.safeParse({ ...valid, priceInr: "10.5" }).success).toBe(false);
    expect(listingInputSchema.safeParse({ ...valid, priceInr: "0" }).success).toBe(false);
    expect(listingInputSchema.safeParse({ ...valid, category: "CARS" }).success).toBe(false);
  });
});

describe("listingImagePathPattern", () => {
  const re = listingImagePathPattern("abc123def456");
  it("accepts generated pathnames for that listing", () => {
    expect(re.test("listings/abc123def456/0b6f2c1e-1111-4a4a-9c9c-123456789abc.webp")).toBe(true);
  });
  it("rejects other listings, traversal and other extensions", () => {
    expect(re.test("listings/otherlisting1/0b6f2c1e-1111.webp")).toBe(false);
    expect(re.test("listings/abc123def456/../x/0b6f2c1e.webp")).toBe(false);
    expect(re.test("listings/abc123def456/0b6f2c1e-1111.svg")).toBe(false);
  });
});
