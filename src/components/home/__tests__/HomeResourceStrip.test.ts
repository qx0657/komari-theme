import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const stripSource = readFileSync(new URL("../HomeResourceStrip.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../../../styles/cloud-resources.css", import.meta.url), "utf8");

describe("home resource strip contracts", () => {
  it("keeps the IProyal detail link on the ISP row, not the card header", () => {
    expect(stripSource).toContain('to="/?view=isp"');
    expect(stripSource).toContain("home-isp-actions");
    expect(stripSource).toMatch(/function IspList[\s\S]*to="\/\?view=isp"/);
    expect(stripSource).not.toMatch(
      /data-metric="isp"[\s\S]*overview-card-head[\s\S]*to="\/\?view=isp"/,
    );
  });

  it("copies ISP proxy IPs with the node-card popover instead of printing them", () => {
    expect(stripSource).toContain("NodeCopyIpPopover");
    expect(stripSource).toContain("ispProxyIps");
    expect(stripSource).not.toContain("ips.join");
  });

  it("shows the posted IProyal price on the remaining-quota row", () => {
    expect(stripSource).toMatch(/function IspList[\s\S]*formatPostedPrice\(item\.price/);
  });

  it("widens the airport card on large screens and splits its rows into two columns", () => {
    expect(css).toMatch(
      /\.home-resource-row\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*5fr\)\s*minmax\(0,\s*5\.5fr\)\s*minmax\(0,\s*8fr\)/,
    );
    expect(css).toContain(".home-bill-list.home-airport-list");
    expect(css).toMatch(
      /@media \(min-width: 1100px\)[\s\S]*\.home-bill-list\.home-airport-list[\s\S]*grid-template-columns:\s*1fr 1fr/,
    );
    expect(css).toMatch(/@media \(max-width: 900px\)[\s\S]*\.home-resource-row[\s\S]*grid-template-columns:\s*1fr/);
    expect(stripSource).toContain("home-airport-plan-inline");
    expect(stripSource).not.toContain('to="/?view=sz"');
    expect(stripSource).not.toContain("useShenzhenNodes");
  });
});
