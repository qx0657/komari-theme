import { describe, expect, it } from "vitest";
import {
  collectRevealedIps,
  inferIpBadgeColor,
  normalizeIpProfiles,
  primaryCopyText,
  revealedIp,
  resolveNodeIpBadges,
  DEFAULT_IP_PROFILES,
  SAMPLE_IP_PROFILES,
} from "@/utils/ipProfiles";

describe("normalizeIpProfiles", () => {
  it("returns an empty list when the payload is missing (shareable default)", () => {
    expect(DEFAULT_IP_PROFILES).toEqual([]);
    expect(normalizeIpProfiles(undefined)).toEqual([]);
    expect(normalizeIpProfiles(null)).toEqual([]);
    expect(normalizeIpProfiles({})).toEqual([]);
    expect(SAMPLE_IP_PROFILES.length).toBeGreaterThan(0);
  });

  it("keeps an explicit empty list so operators can clear badges", () => {
    expect(normalizeIpProfiles([])).toEqual([]);
  });

  it("drops empty identities, fills colors, and dedupes by identity set", () => {
    const resolved = normalizeIpProfiles([
      { identities: [" node-a ", "node-a"], badges: ["广播", { label: "NAT" }] },
      { identities: [], badges: ["原生"] },
      { identities: ["node-a"], badges: ["重复"] },
      { identities: ["node-b"], badges: [] },
    ]);
    expect(resolved).toEqual([
      {
        identities: ["node-a"],
        badges: [
          { label: "广播", color: "orange" },
          { label: "NAT", color: "gray" },
        ],
      },
    ]);
  });
});

describe("resolveNodeIpBadges", () => {
  it("matches only the generic sample identities", () => {
    expect(
      resolveNodeIpBadges({ uuid: "x", name: "example-tokyo", public_remark: "" }, SAMPLE_IP_PROFILES).map(
        (badge) => badge.label,
      ),
    ).toEqual(["原生", "IDC机房"]);
    expect(
      resolveNodeIpBadges({ uuid: "example-home", name: "other", public_remark: "" }, SAMPLE_IP_PROFILES).map(
        (badge) => badge.label,
      ),
    ).toEqual(["原生", "家宽", "NAT"]);
    expect(
      resolveNodeIpBadges({ uuid: "unknown", name: "Tokyo Edge", public_remark: "" }, SAMPLE_IP_PROFILES),
    ).toEqual([]);
    expect(JSON.stringify(SAMPLE_IP_PROFILES)).not.toMatch(/\d{1,3}(\.\d{1,3}){3}/);
  });
});

describe("revealedIp", () => {
  it("rejects masked, empty, and non-address values", () => {
    expect(revealedIp("")).toBeNull();
    expect(revealedIp("-")).toBeNull();
    expect(revealedIp("1.2.*.*")).toBeNull();
    expect(revealedIp("xx.xx.xx.xx")).toBeNull();
    expect(revealedIp("unknown")).toBeNull();
    expect(revealedIp("203.0.113.10")).toBe("203.0.113.10");
    expect(revealedIp(" 2001:db8::1 ")).toBe("2001:db8::1");
  });
});

describe("copy helpers", () => {
  it("joins v4 and v6 when both are revealed", () => {
    expect(collectRevealedIps("1.2.*.*", "2001:db8::1")).toEqual({ v4: null, v6: "2001:db8::1" });
    expect(primaryCopyText({ v4: "1.1.1.1", v6: "2001:db8::1" })).toBe("1.1.1.1\n2001:db8::1");
    expect(primaryCopyText({ v4: null, v6: "2001:db8::1" })).toBe("2001:db8::1");
    expect(primaryCopyText({ v4: null, v6: null })).toBeNull();
  });

  it("maps origin and line labels to tag colors", () => {
    expect(inferIpBadgeColor("原生")).toBe("green");
    expect(inferIpBadgeColor("广播")).toBe("orange");
    expect(inferIpBadgeColor("家宽")).toBe("blue");
    expect(inferIpBadgeColor("IDC机房")).toBe("slate");
    expect(inferIpBadgeColor("CN2GIA")).toBe("blue");
  });
});
