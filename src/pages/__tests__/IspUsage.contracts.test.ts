import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("../IspUsage.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../Home.tsx", import.meta.url), "utf8");
const manage = readFileSync(new URL("../ThemeManage.tsx", import.meta.url), "utf8");
const apis = readFileSync(new URL("../../services/cloudApis.ts", import.meta.url), "utf8");

describe("ISP theme contracts", () => {
  it("routes /?view=isp through Home to IspUsage", () => {
    expect(home).toContain('searchParams.get("view") === "isp"');
    expect(home).toContain("IspUsageGate");
    expect(home).toContain('import("@/pages/IspUsage")');
    expect(home).not.toContain("ShenzhenProbe");
  });

  it("IspUsage page fetches /isp/api usage and keeps Glow probe styling", () => {
    expect(page).toContain("useIspUsage");
    expect(page).toContain("isp-remain");
    expect(page).toContain("probe-page");
    expect(page).toContain("用量来自同源 /isp/api");
    expect(page).not.toContain("默认建议私用不公开");
  });

  it("ThemeManage posts tokens to admin credentials, not theme_settings", () => {
    expect(manage).toContain("ExtraAssetsEditor");
    expect(manage).not.toContain('field="enableSzProbeView"');
    expect(manage).toContain("IspCredentialsPanel");
    expect(manage).toContain("postIspCredentials");
    expect(manage).toContain("/isp/api/admin/credentials");
    expect(manage).toMatch(/不写入公开 theme_settings/);
    expect(manage).not.toMatch(/saveThemeSettings\([\s\S]*iproyal_api_token/);
  });

  it("cloudApis exposes masked credentials helpers", () => {
    expect(apis).toContain("fetchIspCredentialsStatus");
    expect(apis).toContain("postIspCredentials");
    expect(apis).toContain("/isp/api/admin/credentials");
  });
});
