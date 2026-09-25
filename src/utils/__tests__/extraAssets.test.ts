import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXTRA_ASSETS,
  SAMPLE_EXTRA_ASSETS,
  airportBoardFromAsset,
  airportLiveTotalGb,
  airportQuotaGb,
  airportTrafficFromSource,
  extractAirportUsageSources,
  ispFupGb,
  ispHasLiveUsage,
  ispProviderLabel,
  ispProxyIps,
  ispRemainingGb,
  ispUsedGb,
  nextMonthlyResetDay,
  normalizeExtraAssets,
  overlayIspAsset,
  overlayLiveExtraAssets,
} from "@/utils/extraAssets";

const SAVED_ASSETS = [
  {
    id: "isp-example",
    kind: "isp",
    name: "Example ISP Dedicated",
    region: "US",
    price: 10,
    currency: "USD",
    billingCycle: 30,
    expiredAt: "2030-01-15",
  },
  {
    id: "domain-example",
    kind: "domain",
    name: "example.com",
    region: "",
    price: 12,
    currency: "USD",
    billingCycle: 365,
    expiredAt: "2030-06-01",
  },
  {
    id: "airport-alpha",
    kind: "airport",
    name: "Example Airport",
    region: "",
    price: 100,
    currency: "CNY",
    billingCycle: 365,
    expiredAt: "2030-03-01",
  },
  {
    id: "airport-beta",
    kind: "airport",
    name: "Second Airport",
    region: "",
    price: 80,
    currency: "CNY",
    billingCycle: 365,
    expiredAt: "2030-04-01",
  },
] as const;

describe("normalizeExtraAssets", () => {
  it("returns an empty list for missing or empty payloads (shareable default)", () => {
    expect(DEFAULT_EXTRA_ASSETS).toEqual([]);
    expect(normalizeExtraAssets(undefined)).toEqual([]);
    expect(normalizeExtraAssets(null)).toEqual([]);
    expect(normalizeExtraAssets({})).toEqual([]);
    expect(normalizeExtraAssets([])).toEqual([]);
  });

  it("keeps a saved extra-asset list and does not invent Glow personal defaults", () => {
    const assets = normalizeExtraAssets([
      {
        id: "domain-example",
        kind: "domain",
        name: "example.com",
        price: 12,
        currency: "USD",
        billingCycle: 365,
        expiredAt: "2030-01-01",
      },
    ]);
    expect(assets).toHaveLength(1);
    expect(assets[0]?.name).toBe("example.com");
    expect(assets.map((item) => item.id)).toEqual(["domain-example"]);
    expect(SAMPLE_EXTRA_ASSETS.length).toBeGreaterThan(0);
  });

  it("keeps airport fields that were saved and does not invent any by id", () => {
    const [isp, , alpha, beta] = normalizeExtraAssets([...SAVED_ASSETS]);
    expect(isp).toMatchObject({ provider: "IProyal", liveIspUsage: true });
    expect(alpha).not.toHaveProperty("plan");
    expect(alpha).not.toHaveProperty("resetDayOfMonth");
    expect(beta).not.toHaveProperty("quotaGb");

    const explicit = normalizeExtraAssets([
      {
        id: "airport-custom",
        kind: "airport",
        name: "Custom",
        price: 1,
        currency: "CNY",
        billingCycle: 30,
        expiredAt: "2030-01-01",
        plan: "Pro",
        resetDayOfMonth: 5,
        quotaGb: 50,
        usageSourceId: "alpha",
        usageFromSzSourceId: "ignored",
      },
    ]);
    expect(explicit[0]).toMatchObject({
      plan: "Pro",
      resetDayOfMonth: 5,
      quotaGb: 50,
      usageSourceId: "alpha",
    });
    expect(explicit[0]).not.toHaveProperty("usageFromSzSourceId");

    const leaked = normalizeExtraAssets([
      {
        id: "airport-secret",
        kind: "airport",
        name: "Secret",
        usageSourceId: "https://example.com/sub?token=secret",
      },
    ]);
    expect(leaked[0]).not.toHaveProperty("usageSourceId");
  });

  it("treats every isp row as IProyal, regardless of id", () => {
    const [isp] = normalizeExtraAssets([
      {
        id: "isp-custom",
        kind: "isp",
        name: "Dedicated",
        price: 4,
        currency: "USD",
        billingCycle: 30,
        expiredAt: "2030-01-01",
        provider: "Other",
      },
    ]);
    expect(isp).toMatchObject({ provider: "IProyal", liveIspUsage: true });
  });
});

describe("ISP homepage rows", () => {
  it("labels providers from asset.provider and reads remaining plus proxy IPs", () => {
    expect(ispProviderLabel({ name: "IProyal ISP Dedicated", provider: "IProyal" })).toBe(
      "IProyal",
    );
    expect(ispHasLiveUsage({ liveIspUsage: true })).toBe(true);
    expect(ispHasLiveUsage({})).toBe(false);
    const isp = {
      remaining_gb: 69.62,
      used_gb: 30.377,
      fup_gb: 100,
      active: {
        days_left: 6.4,
        proxies: [{ ip: "205.179.246.63" }, { ip: "205.179.246.63" }],
      },
    };
    expect(ispRemainingGb(isp)).toBe(69.62);
    expect(ispUsedGb(isp)).toBe(30.377);
    expect(ispFupGb(isp)).toBe(100);
    expect(ispProxyIps(isp)).toEqual(["205.179.246.63"]);
  });

  it("falls back to usage.remaining and keeps unknown ISP names", () => {
    expect(ispRemainingGb({ usage: { remaining: { gb_balance: 12.5 } } })).toBe(12.5);
    expect(ispUsedGb({ usage: { remaining: { gb_used: 3 } } })).toBe(3);
    expect(ispFupGb({ usage: { remaining: { gb_limit: 80 } } })).toBe(80);
    expect(ispProxyIps(null)).toEqual([]);
    expect(ispProviderLabel({ name: "Other ISP" })).toBe("Other ISP");
  });
});

describe("overlayIspAsset", () => {
  it("writes live price and expiry onto rows marked liveIspUsage", () => {
    const assets = normalizeExtraAssets([...SAVED_ASSETS]);
    const overlaid = overlayIspAsset(assets, {
      active: {
        product: "ISP Dedicated",
        location: "United States",
        expire_date: "2026-09-25 15:06:34",
        renew_price: 4,
      },
    });
    const isp = overlaid.find((item) => item.id === "isp-example");
    expect(isp?.price).toBe(4);
    expect(isp?.expiredAt).toBe("2026-09-25");
    expect(isp?.region).toBe("US");
  });
});

describe("airport board fields", () => {
  it("reads only the fields saved on the entry", () => {
    const [airport] = normalizeExtraAssets([
      {
        id: "airport-custom",
        kind: "airport",
        name: "Example",
        price: 100,
        currency: "CNY",
        billingCycle: 365,
        expiredAt: "2030-01-01",
        plan: "Standard",
        resetDayOfMonth: 10,
        quotaGb: 120,
      },
    ]);
    const board = airportBoardFromAsset(airport!);
    expect(board).toEqual({ plan: "Standard", resetDay: 10, quotaGb: 120 });
    expect(airportQuotaGb(board)).toBe(120);
    expect(airportQuotaGb(airportBoardFromAsset({}))).toBeNull();
  });

  it("computes the next monthly reset from the saved day", () => {
    expect(nextMonthlyResetDay(10, new Date(2026, 8, 14))).toBe("2026-10-10");
    expect(nextMonthlyResetDay(10, new Date(2026, 9, 10))).toBe("2026-10-10");
    expect(nextMonthlyResetDay(1, new Date(2026, 9, 1))).toBe("2026-10-01");
    expect(nextMonthlyResetDay(0, new Date(2026, 9, 1))).toBe("");
  });

  it("leaves airport expiry on the saved date when overlaying ISP usage", () => {
    const assets = overlayLiveExtraAssets(normalizeExtraAssets([...SAVED_ASSETS]), null);
    expect(assets.find((item) => item.id === "airport-alpha")?.expiredAt).toBe("2030-03-01");
  });
});

describe("airport subscription usage", () => {
  const gib = 1073741824;

  it("reads used and total bytes, and keeps a total when used is missing", () => {
    const live = airportTrafficFromSource({
      id: "alpha",
      upload: gib,
      download: gib,
      total: 10 * gib,
    });
    expect(live).toMatchObject({ usedGb: 2, totalGb: 10, usedPct: 20 });
    expect(airportTrafficFromSource({ id: "alpha", total: 5 * gib })).toBeNull();
    expect(airportLiveTotalGb({ id: "alpha", total: 5 * gib })).toBe(5);
    expect(airportLiveTotalGb(undefined)).toBeNull();
  });

  it("extracts sources from a bare list or a wrapped probe payload", () => {
    const source = { id: "alpha", upload: "1", download: "2", total: "3", name: "skip-me" };
    expect(extractAirportUsageSources({ sources: [source, { id: "" }] })).toEqual([
      { id: "alpha", upload: "1", download: "2", total: "3" },
    ]);
    expect(extractAirportUsageSources({ probe: { sources: [source] } })).toEqual([
      { id: "alpha", upload: "1", download: "2", total: "3" },
    ]);
    expect(extractAirportUsageSources({ nodes: [{ server: "secret.example" }] })).toEqual([]);
  });
});
