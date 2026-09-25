export type ExtraAssetKind = "isp" | "domain" | "airport" | "other";

/**
 * 额外账单条目（域名 / 机场 / ISP 等）。
 *
 * 分享包默认列表为空；现网数据只存在服务器 theme_configurations.theme_settings.extraAssets。
 * 机场套餐、重置日、每月额度写在条目上。ISP 条目固定走 IProyal 实况。
 */
export interface ExtraAsset {
  id: string;
  kind: ExtraAssetKind;
  name: string;
  region: string;
  price: number;
  currency: string;
  billingCycle: number;
  expiredAt: string;
  /** 机场套餐名，显示在名称后 */
  plan?: string;
  /** 每月流量重置日（1–28） */
  resetDayOfMonth?: number;
  /** 每月额度 GB。订阅没有返回已用或总量时，首页仍显示这个总额。 */
  quotaGb?: number;
  /**
   * 用量接口里的 source id。只接受短 id，不接受订阅 URL。
   * 订阅地址留在你自己的用量服务里，不要写进公开的 theme_settings。
   */
  usageSourceId?: string;
  /** ISP 展示名。kind 为 isp 时归一化成 IProyal。 */
  provider?: string;
  /** kind 为 isp 时为 true，从 /isp/api/usage 读价格、到期和余量。 */
  liveIspUsage?: boolean;
}

export const EXTRA_ASSET_KIND_LABEL: Record<ExtraAssetKind, string> = {
  isp: "ISP",
  domain: "域名",
  airport: "机场",
  other: "其他",
};

/**
 * 分享包 / 未配置站点：空列表。
 * 现网依赖 DB 里已保存的 extraAssets；normalizeExtraAssets 在缺省或空数组时
 * **不再**回落到个人账单，避免别人装主题后看到 Glow 私有域名/机场。
 */
export const DEFAULT_EXTRA_ASSETS: ExtraAsset[] = [];

/**
 * 仅主题管理页在列表为空时「填入示例」使用，不作为 runtime 缺省回落。
 */
export const SAMPLE_EXTRA_ASSETS: ExtraAsset[] = [
  {
    id: "isp-example",
    kind: "isp",
    name: "Example ISP Dedicated",
    region: "US",
    price: 4,
    currency: "USD",
    billingCycle: 30,
    expiredAt: "2030-01-01",
    provider: "ExampleISP",
    liveIspUsage: true,
  },
  {
    id: "domain-example",
    kind: "domain",
    name: "example.com",
    region: "",
    price: 12,
    currency: "USD",
    billingCycle: 365,
    expiredAt: "2030-01-01",
  },
  {
    id: "airport-example",
    kind: "airport",
    name: "Example Airport",
    region: "",
    price: 100,
    currency: "CNY",
    billingCycle: 365,
    expiredAt: "2030-01-01",
    plan: "Standard",
    resetDayOfMonth: 1,
    quotaGb: 100,
  },
];

export function cloneSampleExtraAssets(): ExtraAsset[] {
  return SAMPLE_EXTRA_ASSETS.map((asset) => ({ ...asset }));
}

/** 看板用的机场展示字段（由 ExtraAsset 派生）。 */
export type AirportBoard = {
  plan?: string;
  resetDay?: number;
  quotaGb?: number;
};

export function airportBoardFromAsset(
  asset: Pick<ExtraAsset, "plan" | "resetDayOfMonth" | "quotaGb">,
): AirportBoard {
  return {
    plan: asset.plan,
    resetDay: asset.resetDayOfMonth,
    quotaGb: asset.quotaGb,
  };
}

const KINDS = new Set<ExtraAssetKind>(["isp", "domain", "airport", "other"]);

function isKind(value: unknown): value is ExtraAssetKind {
  return typeof value === "string" && KINDS.has(value as ExtraAssetKind);
}

function finitePrice(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

function cycleDays(value: unknown) {
  const days = Number(value);
  return Number.isFinite(days) && days > 0 ? days : 365;
}

function optionalPositiveNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

function optionalResetDay(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const day = Number(value);
  if (!Number.isInteger(day) || day < 1 || day > 28) return undefined;
  return day;
}

function optionalTrimmed(value: unknown): string | undefined {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

/** 用量来源 id。拒绝 URL、查询串和路径，避免把订阅地址写进公开设置。 */
export function optionalUsageSourceId(value: unknown): string | undefined {
  const text = optionalTrimmed(value);
  if (!text || text.length > 64) return undefined;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(text)) return undefined;
  return text;
}

/**
 * 机场用量接口必须是同源路径。
 * 订阅 URL 会带令牌，不能进 theme_settings，也不要从浏览器直接去拉。
 */
export function normalizeAirportUsagePath(value: unknown): string {
  const text = optionalTrimmed(value) ?? "";
  if (!text.startsWith("/") || text.startsWith("//") || text.includes("\\") || text.includes("..")) {
    return "";
  }
  if (text.includes("://") || text.includes("?") || text.includes("#") || /\s/.test(text)) {
    return "";
  }
  return text.length > 200 ? "" : text;
}

/**
 * 规范化额外账单。
 * - missing / 非数组 / 空数组 → []（分享友好；不再回落个人默认）
 * - 显式保存的非空列表 → 只使用保存值
 * - kind 为 isp 的条目固定为 IProyal 实况，不按 id 补字段
 */
export function normalizeExtraAssets(value: unknown): ExtraAsset[] {
  if (!Array.isArray(value)) return [];
  const result: ExtraAsset[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const entry = raw as Record<string, unknown>;
    const id = String(entry.id ?? "").trim();
    const name = String(entry.name ?? "").trim();
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    const asset: ExtraAsset = {
      id,
      kind: isKind(entry.kind) ? entry.kind : "other",
      name,
      region: String(entry.region ?? "").trim(),
      price: finitePrice(entry.price),
      currency: String(entry.currency ?? "CNY").trim() || "CNY",
      billingCycle: cycleDays(entry.billingCycle ?? entry.billing_cycle),
      expiredAt: String(entry.expiredAt ?? entry.expired_at ?? "").trim(),
    };
    const plan = optionalTrimmed(entry.plan);
    if (plan) asset.plan = plan;
    const resetDay = optionalResetDay(
      entry.resetDayOfMonth ?? entry.reset_day_of_month ?? entry.resetDay,
    );
    if (resetDay != null) asset.resetDayOfMonth = resetDay;
    const quota = optionalPositiveNumber(entry.quotaGb ?? entry.quota_gb);
    if (quota != null) asset.quotaGb = quota;
    if (asset.kind === "airport") {
      const usageSourceId = optionalUsageSourceId(
        entry.usageSourceId ?? entry.usage_source_id,
      );
      if (usageSourceId) asset.usageSourceId = usageSourceId;
    }
    if (asset.kind === "isp") {
      asset.provider = "IProyal";
      asset.liveIspUsage = true;
    }
    result.push(asset);
  }
  return result;
}

export interface IspActiveOrder {
  expire_date?: string | null;
  renews_at?: string | null;
  renew_price?: number | null;
  days_left?: number | null;
  product?: string | null;
  plan?: string | null;
  location?: string | null;
  proxies?: Array<{ ip?: string | null }> | null;
}

export interface IspUsageSnapshot {
  remaining_gb?: number | null;
  used_gb?: number | null;
  fup_gb?: number | null;
  balance_usd?: number | null;
  active?: IspActiveOrder | null;
  usage?: {
    remaining?: { gb_balance?: number; gb_used?: number; gb_limit?: number } | null;
  };
}

function finiteGb(value: unknown): number | null {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

export function ispProviderLabel(asset: Pick<ExtraAsset, "name" | "provider">) {
  return asset.provider || asset.name;
}

export function ispHasLiveUsage(asset: Pick<ExtraAsset, "liveIspUsage">) {
  return asset.liveIspUsage === true;
}

export function ispProxyIps(isp?: IspUsageSnapshot | null): string[] {
  const proxies = isp?.active?.proxies;
  if (!Array.isArray(proxies)) return [];
  const seen = new Set<string>();
  const ips: string[] = [];
  for (const proxy of proxies) {
    const ip = String(proxy?.ip ?? "").trim();
    if (!ip || seen.has(ip)) continue;
    seen.add(ip);
    ips.push(ip);
  }
  return ips;
}

export function ispRemainingGb(isp?: IspUsageSnapshot | null): number | null {
  return finiteGb(isp?.remaining_gb ?? isp?.usage?.remaining?.gb_balance);
}

export function ispUsedGb(isp?: IspUsageSnapshot | null): number | null {
  return finiteGb(isp?.used_gb ?? isp?.usage?.remaining?.gb_used);
}

export function ispFupGb(isp?: IspUsageSnapshot | null, fallback = 100): number {
  return finiteGb(isp?.fup_gb ?? isp?.usage?.remaining?.gb_limit) ?? fallback;
}

function parseExpireDay(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const day = text.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : text;
}

export function overlayIspAsset(
  assets: ExtraAsset[],
  isp: IspUsageSnapshot | null | undefined,
): ExtraAsset[] {
  const active = isp?.active;
  if (!active) return assets;
  return assets.map((asset) => {
    if (!ispHasLiveUsage(asset)) return asset;
    const expire = parseExpireDay(active.expire_date || active.renews_at);
    const price = Number(active.renew_price);
    const productName = active.product
      ? `${ispProviderLabel(asset)} ${active.product}`.trim()
      : asset.name;
    return {
      ...asset,
      name: productName,
      region: active.location === "United States" ? "US" : asset.region,
      price: Number.isFinite(price) && price > 0 ? price : asset.price,
      expiredAt: expire || asset.expiredAt,
    };
  });
}

export function airportQuotaGb(board: AirportBoard | undefined): number | null {
  const quota = board?.quotaGb;
  if (quota == null || !Number.isFinite(quota) || quota <= 0) return null;
  return quota;
}

const GIB = 1073741824;

export interface AirportUserinfoSource {
  id: string;
  upload?: string | number | null;
  download?: string | number | null;
  total?: string | number | null;
}

export interface AirportTraffic {
  usedGb: number;
  totalGb: number;
  usedPct: number;
}

function parseUserinfoBytes(value: unknown): number | null {
  if (value == null || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function readUsageList(payload: unknown): unknown[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const root = payload as Record<string, unknown>;
  if (Array.isArray(root.sources)) return root.sources;
  if (Array.isArray(root.items)) return root.items;
  const probe = root.probe;
  if (probe && typeof probe === "object" && !Array.isArray(probe)) {
    const nested = probe as Record<string, unknown>;
    if (Array.isArray(nested.sources)) return nested.sources;
    if (Array.isArray(nested.items)) return nested.items;
  }
  return [];
}

/** 从用量接口 JSON 取出订阅头字段。忽略节点列表和其他未知字段。 */
export function extractAirportUsageSources(payload: unknown): AirportUserinfoSource[] {
  const sources: AirportUserinfoSource[] = [];
  for (const raw of readUsageList(payload)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const entry = raw as Record<string, unknown>;
    const id = optionalUsageSourceId(entry.id);
    if (!id) continue;
    const source: AirportUserinfoSource = { id };
    if (entry.upload != null && entry.upload !== "") source.upload = entry.upload as string | number;
    if (entry.download != null && entry.download !== "") {
      source.download = entry.download as string | number;
    }
    if (entry.total != null && entry.total !== "") source.total = entry.total as string | number;
    sources.push(source);
  }
  return sources;
}

export function findAirportUsageSource(
  asset: { id: string; usageSourceId?: string },
  sources: readonly AirportUserinfoSource[],
): AirportUserinfoSource | undefined {
  const key = asset.usageSourceId || asset.id;
  return sources.find((source) => source.id === key);
}

/** 订阅头里的总量（GiB）。没有 total 时返回 null，不拿每月额度冒充。 */
export function airportLiveTotalGb(
  source: AirportUserinfoSource | null | undefined,
): number | null {
  const total = parseUserinfoBytes(source?.total);
  if (total == null || total <= 0) return null;
  return total / GIB;
}

/** 订阅头同时给出已用和总量时返回流量；缺已用时返回 null，让界面改显示总额。 */
export function airportTrafficFromSource(
  source: AirportUserinfoSource | null | undefined,
): AirportTraffic | null {
  const totalGb = airportLiveTotalGb(source);
  if (totalGb == null || !source) return null;
  const upload = parseUserinfoBytes(source.upload);
  const download = parseUserinfoBytes(source.download);
  if (upload == null && download == null) return null;
  const usedGb = ((upload ?? 0) + (download ?? 0)) / GIB;
  return {
    usedGb,
    totalGb,
    usedPct: Math.min(100, Math.max(0, (usedGb / totalGb) * 100)),
  };
}

export function nextMonthlyResetDay(dayOfMonth: number, now = new Date()): string {
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 28) return "";
  const year = now.getFullYear();
  const month = now.getMonth();
  const date =
    now.getDate() <= dayOfMonth
      ? new Date(year, month, dayOfMonth)
      : new Date(year, month + 1, dayOfMonth);
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function overlayLiveExtraAssets(
  assets: ExtraAsset[],
  isp?: IspUsageSnapshot | null,
) {
  return overlayIspAsset(assets, isp);
}
