import type { NodeInfo } from "@/types/komari";
import { buildNodeIdentitySet, nodeMatchesIdentitySet } from "@/utils/nodeIdentity";

export interface IpBadge {
  label: string;
  color: string;
}

export interface NodeIpProfile {
  identities: string[];
  badges: IpBadge[];
}

const IP_BADGE_COLOR_BY_LABEL: Record<string, string> = {
  原生: "green",
  native: "green",
  广播: "orange",
  broadcast: "orange",
  家宽: "blue",
  住宅: "blue",
  住宅bgp: "blue",
  idc: "slate",
  idc机房: "slate",
  机房: "slate",
  nat: "gray",
  直连: "mint",
};

export function inferIpBadgeColor(label: string): string {
  const key = label.trim().toLowerCase();
  if (!key) return "violet";
  const mapped = IP_BADGE_COLOR_BY_LABEL[key];
  if (mapped) return mapped;
  if (/(cn2gia|9929|cmin2)/i.test(key)) return "blue";
  return "violet";
}

function cloneProfile(profile: NodeIpProfile): NodeIpProfile {
  return {
    identities: [...profile.identities],
    badges: profile.badges.map((badge) => ({ ...badge })),
  };
}

function normalizeBadge(raw: unknown): IpBadge | null {
  if (typeof raw === "string") {
    const label = raw.trim();
    if (!label) return null;
    return { label, color: inferIpBadgeColor(label) };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const entry = raw as Record<string, unknown>;
  const label = String(entry.label ?? "").trim();
  if (!label) return null;
  const color = String(entry.color ?? "").trim().toLowerCase();
  return { label, color: color || inferIpBadgeColor(label) };
}

function normalizeIdentities(raw: unknown): string[] {
  const values = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(/[\n,，;；]+/)
      : [];
  return Array.from(
    new Set(
      values
        .map((item) =>
          typeof item === "string" || typeof item === "number" ? String(item).trim() : "",
        )
        .filter(Boolean),
    ),
  );
}

function normalizeProfile(raw: unknown): NodeIpProfile | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const entry = raw as Record<string, unknown>;
  const identities = normalizeIdentities(entry.identities);
  if (identities.length === 0) return null;
  const badges = (Array.isArray(entry.badges) ? entry.badges : [])
    .map(normalizeBadge)
    .filter((badge): badge is IpBadge => badge !== null);
  if (badges.length === 0) return null;
  return { identities, badges };
}

/**
 * 分享包默认：空。现网标签写在 theme_settings.ipProfiles。
 * 口径（原生/广播、家宽/IDC、NAT）见 SAMPLE_IP_PROFILES 注释。
 */
export const DEFAULT_IP_PROFILES: NodeIpProfile[] = [];

/**
 * 示例（仅主题管理页在列表为空时「填入示例」，不作 runtime 缺省回落）。
 * 口径：
 * - 原生/广播：注册地是否等于使用地
 * - 家宽/IDC：线路类型
 * - NAT：公网不在网卡上
 */
export const SAMPLE_IP_PROFILES: NodeIpProfile[] = [
  {
    identities: ["example-tokyo"],
    badges: [
      { label: "原生", color: "green" },
      { label: "IDC机房", color: "slate" },
    ],
  },
  {
    identities: ["example-home"],
    badges: [
      { label: "原生", color: "green" },
      { label: "家宽", color: "blue" },
      { label: "NAT", color: "gray" },
    ],
  },
];

export function cloneSampleIpProfiles(): NodeIpProfile[] {
  return SAMPLE_IP_PROFILES.map(cloneProfile);
}

/** @deprecated 用 cloneSampleIpProfiles；保留别名以免外部旧引用炸掉。 */
export function cloneDefaultIpProfiles(): NodeIpProfile[] {
  return cloneSampleIpProfiles();
}

/**
 * 缺省/非法 → 空列表（分享友好）。
 * 空数组表示站长清空或未配置，不再套 SAMPLE。
 * 现网已保存的非空 ipProfiles 原样归一化。
 */
export function normalizeIpProfiles(value: unknown): NodeIpProfile[] {
  if (!Array.isArray(value)) return [];
  const result: NodeIpProfile[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    const profile = normalizeProfile(raw);
    if (!profile) continue;
    const key = profile.identities.join("\0").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(profile);
  }
  return result;
}

export function resolveNodeIpBadges(
  node: Pick<NodeInfo, "uuid" | "name" | "public_remark"> | null | undefined,
  profiles: NodeIpProfile[],
): IpBadge[] {
  if (!node || profiles.length === 0) return [];
  for (const profile of profiles) {
    if (nodeMatchesIdentitySet(node as NodeInfo, buildNodeIdentitySet(profile.identities))) {
      return profile.badges;
    }
  }
  return [];
}

/** 访客打码（含 * / x）或空值不算可复制的公网地址。 */
export function revealedIp(value: string | null | undefined): string | null {
  const text = String(value ?? "").trim();
  if (!text || text === "-") return null;
  if (/[*xX]/.test(text)) return null;
  if (!/\d/.test(text) || !/[:.]/.test(text)) return null;
  return text;
}

export function collectRevealedIps(ipv4?: string | null, ipv6?: string | null) {
  return {
    v4: revealedIp(ipv4),
    v6: revealedIp(ipv6),
  };
}

export function primaryCopyText(ips: { v4: string | null; v6: string | null }): string | null {
  if (ips.v4 && ips.v6) return `${ips.v4}\n${ips.v6}`;
  return ips.v4 ?? ips.v6;
}
