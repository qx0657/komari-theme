import { describe, expect, it } from "vitest";
import { normalizeThemeSettings } from "../themeSettings";
import {
  nextTrafficReset, normalizeTrafficResets, resolveNodeTrafficReset,
  trafficResetDisplay, type NodeTrafficReset,
} from "../trafficReset";

const base: NodeTrafficReset = {
  identities: ["node-1"], day: 1, time: "00:00", timeZone: "Asia/Shanghai", shortMonth: "last-day",
};
const next = (rule: Partial<NodeTrafficReset>, now: string) => {
  const at = nextTrafficReset({ ...base, ...rule }, Date.parse(now));
  return at === null ? null : new Date(at).toISOString();
};

describe("traffic reset calendar", () => {
  it("uses the configured timezone across date and year boundaries", () => {
    expect(next({}, "2026-10-22T12:00:00Z")).toBe("2026-10-31T16:00:00.000Z");
    expect(next({}, "2026-12-31T15:59:00Z")).toBe("2026-12-31T16:00:00.000Z");
    expect(next({}, "2026-12-31T16:00:00Z")).toBe("2027-01-31T16:00:00.000Z");
  });

  it("advances to next month immediately at the reset instant", () => {
    expect(next({ day: 22, timeZone: "UTC" }, "2026-10-22T00:00:00Z")).toBe("2026-11-22T00:00:00.000Z");
  });

  it("supports exact service-provider times including seconds", () => {
    expect(next({ day: 31, time: "04:02:13" }, "2026-10-22T00:00:00Z")).toBe("2026-10-30T20:02:13.000Z");
  });

  it("clamps 29–31 to month end, including leap years", () => {
    expect(next({ day: 31, timeZone: "UTC" }, "2027-02-01T00:00:00Z")).toBe("2027-02-28T00:00:00.000Z");
    expect(next({ day: 30, timeZone: "UTC" }, "2028-02-01T00:00:00Z")).toBe("2028-02-29T00:00:00.000Z");
  });

  it("can skip short months when the plan requires the exact day", () => {
    expect(next({ day: 31, timeZone: "UTC", shortMonth: "skip" }, "2027-02-01T00:00:00Z")).toBe("2027-03-31T00:00:00.000Z");
  });

  it("can roll short months to the next month's first day, matching Komari agent", () => {
    expect(next({ day: 31, timeZone: "UTC", shortMonth: "next-month" }, "2027-02-01T00:00:00Z")).toBe("2027-03-01T00:00:00.000Z");
    // 上个月顺延过来的时刻仍可能在未来，不能跳到本月 31 日。
    expect(next({ day: 31, time: "04:00", timeZone: "UTC", shortMonth: "next-month" }, "2027-03-01T03:59:00Z")).toBe("2027-03-01T04:00:00.000Z");
    expect(next({ day: 31, time: "04:00", timeZone: "UTC", shortMonth: "next-month" }, "2027-03-01T04:00:00Z")).toBe("2027-03-31T04:00:00.000Z");
  });

  it("follows daylight saving offsets, including missing and repeated times", () => {
    expect(next({ day: 11, timeZone: "America/New_York" }, "2026-10-22T00:00:00Z")).toBe("2026-11-11T05:00:00.000Z");
    expect(next({ day: 8, time: "02:30", timeZone: "America/New_York" }, "2026-03-01T00:00:00Z")).toBe("2026-03-08T07:30:00.000Z");
    expect(next({ day: 1, time: "01:30", timeZone: "America/New_York" }, "2026-10-02T00:00:00Z")).toBe("2026-11-01T05:30:00.000Z");
  });

  it.each([
    ["2026-10-29T16:00:00Z", "2 天后重置"],
    ["2026-10-31T14:00:00Z", "2 小时后重置"],
    ["2026-10-31T15:57:30Z", "3 分钟后重置"],
    ["2026-10-31T15:59:30Z", "即将重置"],
  ])("formats a useful countdown at %s", (now, countdown) => {
    const display = trafficResetDisplay(base, Date.parse(now));
    expect(display?.countdown).toBe(countdown);
    expect(display?.date).toBe("11 月 1 日");
    expect(display?.exact).toContain("2026 年 11 月 1 日 00:00（Asia/Shanghai）");
  });
});

describe("traffic reset configuration", () => {
  it("hides missing configuration and unlimited nodes even if configured", () => {
    const node = { uuid: "node-1", name: "Example", traffic_limit: 1024 };
    const now = Date.parse("2026-10-22T00:00:00Z");
    expect(resolveNodeTrafficReset(node, [], now)).toBeNull();
    expect(resolveNodeTrafficReset({ ...node, traffic_limit: 0 }, [base], now)).toBeNull();
    expect(resolveNodeTrafficReset(node, [base], now)?.at).toBe(Date.parse("2026-10-31T16:00:00Z"));
  });

  it("prefers explicit UUID configuration over name matching", () => {
    const node = { uuid: "node-1", name: "Example", traffic_limit: 1024 };
    const rules = [{ ...base, identities: ["example"], day: 2 }, base];
    expect(resolveNodeTrafficReset(node, rules, Date.parse("2026-10-22T00:00:00Z"))?.rule).toContain("每月 1 日");
  });

  it("keeps old theme settings empty and rejects malformed rules", () => {
    expect(normalizeThemeSettings({}).trafficResets).toEqual([]);
    expect(normalizeTrafficResets([
      { ...base, day: 32 }, { ...base, day: 1.5 }, { ...base, day: "1" },
      { ...base, time: "24:00" }, { ...base, timeZone: "invalid" },
      { ...base, identities: [] }, { ...base, shortMonth: "invalid" }, null,
    ])).toEqual([]);
    expect(normalizeThemeSettings({ trafficResets: [{ identities: ["node-1"], day: 1 }] }).trafficResets)
      .toEqual([{ ...base, timeZone: "UTC" }]);
  });
});
