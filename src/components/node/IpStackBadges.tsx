import { useOptionalTagFilter } from "@/components/node/TagFilter";

// V4/V6 双栈标识：后端仅在登录态下发真实 ipv4/ipv6，前端只读"有没有"来亮对应标签，
// 不渲染 IP 本身。紧挨其后的 extra 按固定顺序：原生/广播、IDC/家宽、ASN、ISP/非ISP、直连/NAT。
// 首页筛选打开时，对得上的那几对可以点，效果和地区栏上的筛选相同。
export function IpStackBadges({
  ipv4,
  ipv6,
  extra = [],
}: {
  ipv4?: string | null;
  ipv6?: string | null;
  extra?: Array<{ label: string; color: string }>;
}) {
  const tagFilter = useOptionalTagFilter();
  if (!ipv4 && !ipv6 && extra.length === 0) return null;
  return (
    <span className="ip-stack-group">
      {ipv4 ? <span className="ip-stack-badge" data-tag="green">V4</span> : null}
      {ipv6 ? <span className="ip-stack-badge" data-tag="green">V6</span> : null}
      {extra.map((badge, index) => {
        const selectable = tagFilter?.isSelectable(badge.label) ?? false;
        const active = selectable && tagFilter?.isActive(badge.label) === true;
        if (!selectable || !tagFilter) {
          return (
            <span
              key={`${badge.label}-${index}`}
              className="ip-stack-badge"
              data-tag={badge.color}
            >
              {badge.label}
            </span>
          );
        }
        return (
          <button
            key={`${badge.label}-${index}`}
            type="button"
            className="ip-stack-badge"
            data-tag={badge.color}
            data-active={active ? "true" : "false"}
            aria-pressed={active}
            title={active ? `取消「${badge.label}」` : `只看「${badge.label}」`}
            onClick={() => tagFilter.toggle(badge.label)}
          >
            {badge.label}
          </button>
        );
      })}
    </span>
  );
}
