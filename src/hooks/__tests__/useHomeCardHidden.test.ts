import { afterEach, describe, expect, it, vi } from "vitest";
import { HOME_CARD_HIDDEN_STORAGE_KEY } from "@/utils/homeCardHidden";
import {
  hideHomeCard,
  reloadHomeCardHidden,
  showAllHomeCards,
} from "@/hooks/useHomeCardHidden";

describe("home card hidden store", () => {
  afterEach(() => {
    reloadHomeCardHidden();
    vi.unstubAllGlobals();
  });

  it("persists a hide and clears it on show all", () => {
    const entries = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => entries.set(key, value),
      removeItem: (key: string) => entries.delete(key),
    });
    reloadHomeCardHidden();

    hideHomeCard("node-a");
    hideHomeCard("node-a");
    hideHomeCard("  ");
    expect(JSON.parse(entries.get(HOME_CARD_HIDDEN_STORAGE_KEY) || "null")).toEqual(["node-a"]);

    showAllHomeCards();
    expect(entries.has(HOME_CARD_HIDDEN_STORAGE_KEY)).toBe(false);

    hideHomeCard("node-b");
    reloadHomeCardHidden();
    hideHomeCard("node-c");
    expect(JSON.parse(entries.get(HOME_CARD_HIDDEN_STORAGE_KEY) || "null")).toEqual([
      "node-b",
      "node-c",
    ]);
  });
});
