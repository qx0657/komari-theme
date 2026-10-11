// 首页标签筛选。卡片上的 IP 属性是固定成对的维度，筛选只露出当前列表里
// 两侧都有服务器的那几对，避免一排点了等于没筛的按钮。

export interface TagFilterOptionDef {
  id: string;
  /** 筛选条上的短标签。 */
  label: string;
  /** 悬停说明。机房在卡片上写的是 IDC机房。 */
  title: string;
  /** 与卡片 data-tag 一致，用来给筛选条上色。 */
  color: string;
  aliases: readonly string[];
}

export interface TagFilterDimensionDef {
  id: string;
  /** 读屏用的这一对叫什么。 */
  label: string;
  options: readonly [TagFilterOptionDef, TagFilterOptionDef];
}

export const TAG_FILTER_DIMENSIONS: readonly TagFilterDimensionDef[] = [
  {
    id: "origin",
    label: "原生或广播",
    options: [
      { id: "native", label: "原生", title: "原生", color: "green", aliases: ["原生", "native"] },
      { id: "broadcast", label: "广播", title: "广播", color: "orange", aliases: ["广播", "broadcast"] },
    ],
  },
  {
    id: "line",
    label: "机房或家宽",
    options: [
      {
        id: "idc",
        label: "机房",
        title: "IDC机房",
        color: "slate",
        aliases: ["idc机房", "idc", "机房"],
      },
      {
        id: "home",
        label: "家宽",
        title: "家宽",
        color: "blue",
        aliases: ["家宽", "住宅", "住宅bgp"],
      },
    ],
  },
  {
    id: "isp",
    label: "ISP 或非 ISP",
    options: [
      { id: "isp", label: "ISP", title: "ISP", color: "jade", aliases: ["isp"] },
      { id: "nonisp", label: "非ISP", title: "非ISP", color: "amber", aliases: ["非isp"] },
    ],
  },
  {
    id: "link",
    label: "直连或 NAT",
    options: [
      { id: "direct", label: "直连", title: "直连", color: "mint", aliases: ["直连"] },
      { id: "nat", label: "NAT", title: "NAT", color: "gray", aliases: ["nat"] },
    ],
  },
];

export type TagFilterSelection = Partial<Record<string, string>>;

export interface TagFilterOptionView {
  id: string;
  label: string;
  title: string;
  color: string;
  /** 叠上其它已选维度之后，选中这一侧会剩下几台。 */
  count: number;
  /** 不考虑其它标签时，当前地区里有几台。两侧都大于 0 才显示这一对。 */
  baseCount: number;
}

export interface TagFilterDimensionView {
  id: string;
  label: string;
  visible: boolean;
  options: [TagFilterOptionView, TagFilterOptionView];
}

interface TagOptionHit {
  dimensionId: string;
  optionId: string;
}

const OPTION_BY_ALIAS = new Map<string, TagOptionHit>();

for (const dimension of TAG_FILTER_DIMENSIONS) {
  for (const option of dimension.options) {
    for (const alias of option.aliases) {
      OPTION_BY_ALIAS.set(normalizeTagLabel(alias), {
        dimensionId: dimension.id,
        optionId: option.id,
      });
    }
  }
}

export function normalizeTagLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, "");
}

export function lookupTagOption(label: string): TagOptionHit | null {
  return OPTION_BY_ALIAS.get(normalizeTagLabel(label)) ?? null;
}

export function labelsMatchTagSelection(
  labels: readonly string[],
  selection: TagFilterSelection,
): boolean {
  const required = activeTagEntries(selection);
  if (required.length === 0) return true;
  const matched = new Set<string>();
  for (const label of labels) {
    const hit = lookupTagOption(label);
    if (hit) matched.add(selectionKey(hit.dimensionId, hit.optionId));
  }
  return required.every(([dimensionId, optionId]) =>
    matched.has(selectionKey(dimensionId, optionId)),
  );
}

export function summarizeTagFilters(
  labelSets: readonly (readonly string[])[],
  selection: TagFilterSelection,
): TagFilterDimensionView[] {
  return TAG_FILTER_DIMENSIONS.map((dimension) => {
    const others: TagFilterSelection = { ...selection };
    delete others[dimension.id];
    const options = dimension.options.map((option) => {
      const onlyThis: TagFilterSelection = { [dimension.id]: option.id };
      const withOthers: TagFilterSelection = { ...others, [dimension.id]: option.id };
      return {
        id: option.id,
        label: option.label,
        title: option.title,
        color: option.color,
        baseCount: countMatching(labelSets, onlyThis),
        count: countMatching(labelSets, withOthers),
      };
    }) as [TagFilterOptionView, TagFilterOptionView];
    return {
      id: dimension.id,
      label: dimension.label,
      visible: options.every((option) => option.baseCount > 0),
      options,
    };
  });
}

/** 当前地区里已经没有的一侧，从选择里拿掉，避免留下看不见的筛选。 */
export function pruneTagSelection(
  selection: TagFilterSelection,
  labelSets: readonly (readonly string[])[],
): TagFilterSelection {
  const summary = summarizeTagFilters(labelSets, {});
  const allowed = new Map<string, Set<string>>();
  for (const dimension of summary) {
    if (!dimension.visible) continue;
    allowed.set(
      dimension.id,
      new Set(dimension.options.map((option) => option.id)),
    );
  }
  const next: TagFilterSelection = {};
  for (const [dimensionId, optionId] of activeTagEntries(selection)) {
    if (allowed.get(dimensionId)?.has(optionId)) next[dimensionId] = optionId;
  }
  return next;
}

export function toggleTagSelection(
  selection: TagFilterSelection,
  dimensionId: string,
  optionId: string,
): TagFilterSelection {
  if (selection[dimensionId] === optionId) {
    const next: TagFilterSelection = { ...selection };
    delete next[dimensionId];
    return next;
  }
  return { ...selection, [dimensionId]: optionId };
}

export function tagSelectionsEqual(a: TagFilterSelection, b: TagFilterSelection): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a[key] ?? "") !== (b[key] ?? "")) return false;
  }
  return true;
}

export function hasTagSelection(selection: TagFilterSelection): boolean {
  return activeTagEntries(selection).length > 0;
}

function activeTagEntries(selection: TagFilterSelection): [string, string][] {
  const entries: [string, string][] = [];
  for (const [dimensionId, optionId] of Object.entries(selection)) {
    if (optionId) entries.push([dimensionId, optionId]);
  }
  return entries;
}

function selectionKey(dimensionId: string, optionId: string): string {
  return `${dimensionId}\0${optionId}`;
}

function countMatching(
  labelSets: readonly (readonly string[])[],
  selection: TagFilterSelection,
): number {
  let count = 0;
  for (const labels of labelSets) {
    if (labelsMatchTagSelection(labels, selection)) count += 1;
  }
  return count;
}
