import { describe, expect, it } from "vitest";
import { effectiveSort, parseSearchParams, toPrefixTsQuery, toQueryString } from "./search";

describe("parseSearchParams", () => {
  it("falls back to defaults for malformed values", () => {
    const f = parseSearchParams({ category: "CARS", minPrice: "abc", page: "-3", sort: "random" });
    expect(f).toMatchObject({ category: undefined, minPrice: undefined, page: 1, sort: undefined, reserved: false });
  });
  it("swaps a reversed price range", () => {
    const f = parseSearchParams({ minPrice: "900", maxPrice: "100" });
    expect([f.minPrice, f.maxPrice]).toEqual([100, 900]);
  });
  it("reads the reserved toggle", () => {
    expect(parseSearchParams({ reserved: "1" }).reserved).toBe(true);
  });
});

describe("toPrefixTsQuery", () => {
  it("builds a prefix AND query", () => {
    expect(toPrefixTsQuery("Casio calc")).toBe("casio:* & calc:*");
  });
  it("strips tsquery operators so input can't inject syntax", () => {
    expect(toPrefixTsQuery("a | b & !c ' :* ()")).toBe("a:* & b:* & c:*");
    expect(toPrefixTsQuery("!!! ")).toBeNull();
  });
});

describe("effectiveSort / toQueryString", () => {
  it("uses relevance only when there is a keyword", () => {
    expect(effectiveSort({ q: "chair" })).toBe("relevance");
    expect(effectiveSort({ q: undefined, sort: "relevance" })).toBe("newest");
  });
  it("round-trips filters and drops defaults", () => {
    const qs = toQueryString({ q: "math book", category: "TEXTBOOKS", reserved: true, page: 1 }, { page: 2 });
    expect(qs).toBe("?q=math+book&category=TEXTBOOKS&reserved=1&page=2");
  });
});
