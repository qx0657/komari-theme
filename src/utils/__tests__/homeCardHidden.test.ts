import { describe, expect, it } from "vitest";
import {
  normalizeHomeCardHidden,
  parseHomeCardHidden,
  withHiddenUuid,
} from "@/utils/homeCardHidden";

describe("home card hidden list", () => {
  it("drops blanks, non-strings and duplicates", () => {
    expect(normalizeHomeCardHidden([" a ", "a", "", "b", 1, null])).toEqual(["a", "b"]);
    expect(normalizeHomeCardHidden("nope")).toEqual([]);
  });

  it("treats malformed storage as an empty list", () => {
    expect(parseHomeCardHidden(null)).toEqual([]);
    expect(parseHomeCardHidden("{")).toEqual([]);
    expect(parseHomeCardHidden(JSON.stringify(["node-a", " node-a "]))).toEqual(["node-a"]);
  });

  it("keeps the same array when the uuid is already hidden or blank", () => {
    const current = ["node-a"];
    expect(withHiddenUuid(current, "node-a")).toBe(current);
    expect(withHiddenUuid(current, "  ")).toBe(current);
    expect(withHiddenUuid(current, "node-b")).toEqual(["node-a", "node-b"]);
  });
});
