import type { NodeInfo } from "@/types/komari";
import { buildNodeIdentitySet, nodeMatchesIdentitySet, normalizeNodeIdentityList } from "./nodeIdentity";

export interface NodeTrafficReset {
  identities: string[];
  day: number;
  time: string;
  timeZone: string;
  shortMonth: "last-day" | "next-month" | "skip";
}

export interface TrafficResetDisplay {
  at: number;
  countdown: string;
  date: string;
  exact: string;
  rule: string;
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string) {
  let value = formatters.get(timeZone);
  if (!value) {
    value = new Intl.DateTimeFormat("en-GB", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    });
    formatters.set(timeZone, value);
  }
  return value;
}

export function trafficResetError(value: NodeTrafficReset): string | null {
  if (!Number.isInteger(value.day) || value.day < 1 || value.day > 31) return "请选择 1–31 日";
  if (!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value.time)) return "请填写有效的重置时间";
  try { formatter(value.timeZone).format(0); }
  catch { return "时区无效，请使用 Asia/Shanghai、UTC 等 IANA 时区"; }
  if (!["last-day", "next-month", "skip"].includes(value.shortMonth)) return "请选择短月处理方式";
  return null;
}

export function normalizeTrafficResets(value: unknown): NodeTrafficReset[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const identities = normalizeNodeIdentityList(raw.identities);
    const entry: NodeTrafficReset = {
      identities, day: raw.day,
      time: typeof raw.time === "string" ? raw.time.trim() : "00:00",
      timeZone: typeof raw.timeZone === "string" ? raw.timeZone.trim() : "UTC",
      shortMonth: raw.shortMonth ?? "last-day",
    };
    return identities.length && !trafficResetError(entry) ? [entry] : [];
  });
}

export function findTrafficReset(
  node: Pick<NodeInfo, "uuid" | "name">,
  rules: NodeTrafficReset[],
): NodeTrafficReset | undefined {
  // UUID 优先于名称，避免改名或同名规则覆盖明确配置。
  return rules.find((rule) => rule.identities.some((id) => id.toLowerCase() === node.uuid.toLowerCase()))
    ?? rules.find((rule) => nodeMatchesIdentitySet(node as NodeInfo, buildNodeIdentitySet(rule.identities)));
}

function parts(at: number, timeZone: string) {
  const result: Record<string, number> = {};
  for (const part of formatter(timeZone).formatToParts(at)) {
    if (part.type !== "literal") result[part.type] = Number(part.value);
  }
  return result;
}

function wallTimestamp(at: number, timeZone: string) {
  const p = parts(at, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

// 用重置节点的时区转成真实时间，与访问者电脑的时区无关。
// DST 重复时刻取第一次；不存在的时刻向后平移至有效时刻。
function zonedTimestamp(wall: number, timeZone: string): number {
  const offsets = new Set([-36, 0, 36].map((hours) => {
    const sample = wall + hours * 3_600_000;
    return wallTimestamp(sample, timeZone) - sample;
  }));
  const candidates = [...offsets].map((offset) => wall - offset).sort((a, b) => a - b);
  return candidates.find((at) => wallTimestamp(at, timeZone) === wall)
    ?? candidates.filter((at) => wallTimestamp(at, timeZone) > wall)
      .sort((a, b) => wallTimestamp(a, timeZone) - wallTimestamp(b, timeZone))[0];
}

export function nextTrafficReset(rule: NodeTrafficReset, now: number): number | null {
  if (!Number.isFinite(now) || trafficResetError(rule)) return null;
  const current = parts(now, rule.timeZone);
  const [hour, minute, second = 0] = rule.time.split(":").map(Number);
  // 顺延规则可能把上月的重置放到本月 1 日，需从上个月开始找。
  for (let offset = -1; offset < 14; offset++) {
    const month = new Date(Date.UTC(current.year, current.month - 1 + offset, 1));
    const year = month.getUTCFullYear();
    const index = month.getUTCMonth();
    const lastDay = new Date(Date.UTC(year, index + 1, 0)).getUTCDate();
    if (rule.day > lastDay && rule.shortMonth === "skip") continue;
    const day = rule.day > lastDay
      ? rule.shortMonth === "next-month" ? lastDay + 1 : lastDay
      : rule.day;
    const at = zonedTimestamp(Date.UTC(year, index, day, hour, minute, second), rule.timeZone);
    if (at > now) return at;
  }
  return null;
}

export function trafficResetDisplay(rule: NodeTrafficReset, now: number): TrafficResetDisplay | null {
  const at = nextTrafficReset(rule, now);
  if (at === null) return null;
  const remaining = at - now;
  const countdown = remaining >= 86_400_000
    ? `${Math.floor(remaining / 86_400_000)} 天后重置`
    : remaining >= 3_600_000
      ? `${Math.floor(remaining / 3_600_000)} 小时后重置`
      : remaining >= 60_000
        ? `${Math.ceil(remaining / 60_000)} 分钟后重置`
        : "即将重置";
  const p = parts(at, rule.timeZone);
  const date = `${p.month} 月 ${p.day} 日`;
  const clock = `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`
    + (rule.time.length > 5 ? `:${String(p.second).padStart(2, "0")}` : "");
  const shortMonthLabel = { "last-day": "在月末重置", "next-month": "顺延至次月 1 日", skip: "跳过" };
  const shortMonth = rule.day > 28 ? `；短月${shortMonthLabel[rule.shortMonth]}` : "";
  return {
    at, countdown, date,
    exact: `${p.year} 年 ${date} ${clock}（${rule.timeZone}）`,
    rule: `每月 ${rule.day} 日 ${rule.time} · ${rule.timeZone}${shortMonth}`,
  };
}

export function resolveNodeTrafficReset(
  node: Pick<NodeInfo, "uuid" | "name" | "traffic_limit">,
  rules: NodeTrafficReset[],
  now: number,
): TrafficResetDisplay | null {
  if (!(node.traffic_limit > 0)) return null;
  const rule = findTrafficReset(node, rules);
  return rule ? trafficResetDisplay(rule, now) : null;
}
