import { describe, expect, it } from "vitest";
import { isAllowedCampusEmail, signupSchema } from "./auth";

const domains = ["sst.scaler.com", "example.edu"];

describe("isAllowedCampusEmail", () => {
  it("accepts exact allowed domains", () => {
    expect(isAllowedCampusEmail("riya@sst.scaler.com", domains)).toBe(true);
    expect(isAllowedCampusEmail("seller@example.edu", domains)).toBe(true);
  });
  it("is case-insensitive on the domain", () => {
    expect(isAllowedCampusEmail("riya@SST.Scaler.com", domains)).toBe(true);
  });
  it("rejects subdomains and look-alike suffixes", () => {
    expect(isAllowedCampusEmail("riya@cs.sst.scaler.com", domains)).toBe(false);
    expect(isAllowedCampusEmail("riya@sst.scaler.com.evil.io", domains)).toBe(false);
    expect(isAllowedCampusEmail("riya@scaler.com", domains)).toBe(false);
  });
  it("rejects other providers and malformed input", () => {
    expect(isAllowedCampusEmail("riya@gmail.com", domains)).toBe(false);
    expect(isAllowedCampusEmail("@sst.scaler.com", domains)).toBe(false);
    expect(isAllowedCampusEmail("no-at-sign", domains)).toBe(false);
  });
});

describe("signupSchema", () => {
  it("normalises email to lowercase", () => {
    const r = signupSchema.parse({ name: "Riya", email: "  Riya@SST.scaler.com ", password: "longenough" });
    expect(r.email).toBe("riya@sst.scaler.com");
  });
  it("gives field errors for short password and name", () => {
    const r = signupSchema.safeParse({ name: "R", email: "riya@sst.scaler.com", password: "short" });
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path[0]);
    expect(paths).toContain("name");
    expect(paths).toContain("password");
  });
});
