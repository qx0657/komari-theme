export const HOME_CARD_HIDDEN_STORAGE_KEY = "glow-komari:home-card-hidden";

/** 把本地存的隐藏列表收成去空、去重后的 uuid。坏数据当成没有隐藏。 */
export function parseHomeCardHidden(raw: string | null): string[] {
  if (!raw) return [];
  try {
    return normalizeHomeCardHidden(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

export function normalizeHomeCardHidden(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const uuid = item.trim();
    if (!uuid || seen.has(uuid)) continue;
    seen.add(uuid);
    result.push(uuid);
  }
  return result;
}

/** 已在列表里或 uuid 为空时返回原数组，方便调用方用引用相等跳过写入。 */
export function withHiddenUuid(uuids: readonly string[], uuid: string): readonly string[] {
  const next = uuid.trim();
  if (!next || uuids.includes(next)) return uuids;
  return [...uuids, next];
}
