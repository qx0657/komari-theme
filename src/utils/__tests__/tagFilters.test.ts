import { describe, expect, it } from "vitest";
import {
  hasTagSelection,
  labelsMatchTagSelection,
  lookupTagOption,
  pruneTagSelection,
  summarizeTagFilters,
  tagSelectionsEqual,
  toggleTagSelection,
} from "@/utils/tagFilters";

const FLEET: string[][] = [
  ["广播", "IDC机房", "AS42960", "非ISP", "直连"],
  ["原生", "IDC机房", "AS140227", "非ISP", "直连"],
  ["原生", "IDC机房", "AS979", "非ISP", "NAT"],
  ["原生", "家宽", "AS9908", "ISP", "直连"],
  ["原生", "IDC机房", "AS979", "非ISP", "直连", "CN2GIA"],
  ["原生", "家宽", "AS2914", "ISP", "直连"],
  ["原生", "IDC机房", "AS37963", "非ISP", "NAT"],
  ["广播", "IDC机房", "AS979", "非ISP", "NAT"],
];

describe("lookupTagOption", () => {
  it("maps card labels onto the paired dimensions and ignores ASN or line names", () => {
    expect(lookupTagOption("IDC机房")).toEqual({ dimensionId: "line", optionId: "idc" });
    expect(lookupTagOption(" 住宅 BGP ")).toEqual({ dimensionId: "line", optionId: "home" });
    expect(lookupTagOption("Native")).toEqual({ dimensionId: "origin", optionId: "native" });
    expect(lookupTagOption("非ISP")).toEqual({ dimensionId: "isp", optionId: "nonisp" });
    expect(lookupTagOption("ISP")).toEqual({ dimensionId: "isp", optionId: "isp" });
    expect(lookupTagOption("AS979")).toBeNull();
    expect(lookupTagOption("CN2GIA")).toBeNull();
    expect(lookupTagOption("V4")).toBeNull();
  });
});

describe("summarizeTagFilters", () => {
  it("shows a pair only when both sides exist and counts the other filters in", () => {
    const summary = summarizeTagFilters(FLEET, { line: "home" });
    const byId = new Map(summary.map((dimension) => [dimension.id, dimension]));

    expect(byId.get("origin")?.visible).toBe(true);
    expect(byId.get("origin")?.options.map((option) => [option.id, option.baseCount, option.count])).toEqual([
      ["native", 6, 2],
      ["broadcast", 2, 0],
    ]);
    expect(byId.get("line")?.options.map((option) => [option.id, option.count])).toEqual([
      ["idc", 6],
      ["home", 2],
    ]);
    expect(byId.get("isp")?.options.find((option) => option.id === "isp")?.count).toBe(2);
    expect(byId.get("link")?.visible).toBe(true);

    const onlyNative = summarizeTagFilters(
      FLEET.filter((labels) => labels[0] === "原生"),
      {},
    );
    expect(onlyNative.find((dimension) => dimension.id === "origin")?.visible).toBe(false);
    expect(onlyNative.find((dimension) => dimension.id === "line")?.visible).toBe(true);
  });
});

describe("labelsMatchTagSelection", () => {
  it("requires every selected dimension and ignores tags outside the pairs", () => {
    expect(labelsMatchTagSelection(["原生", "家宽", "ISP", "直连"], { origin: "native", line: "home" })).toBe(
      true,
    );
    expect(labelsMatchTagSelection(["原生", "IDC机房", "非ISP", "直连"], { line: "home" })).toBe(false);
    expect(labelsMatchTagSelection(["AS979"], { origin: "native" })).toBe(false);
    expect(labelsMatchTagSelection([], {})).toBe(true);
  });
});

describe("selection helpers", () => {
  it("toggles a side off and drops a side that the current list no longer has", () => {
    expect(toggleTagSelection({ line: "home" }, "origin", "native")).toEqual({
      line: "home",
      origin: "native",
    });
    expect(toggleTagSelection({ line: "home", origin: "native" }, "origin", "native")).toEqual({
      line: "home",
    });

    const homeOnly = FLEET.filter((labels) => labels.includes("家宽"));
    expect(pruneTagSelection({ line: "idc", origin: "broadcast" }, homeOnly)).toEqual({});
    // 这一侧已经是全部服务器时，这一对不再显示，选择也一并拿掉。
    expect(pruneTagSelection({ line: "home" }, homeOnly)).toEqual({});
    expect(hasTagSelection(pruneTagSelection({ line: "idc" }, homeOnly))).toBe(false);
    expect(tagSelectionsEqual({ line: "home" }, { line: "home" })).toBe(true);
    expect(tagSelectionsEqual({ line: "home" }, {})).toBe(false);
  });
});
