// V4/V6 双栈标识：后端仅在登录态下发真实 ipv4/ipv6，前端只读"有没有"来亮对应标签，
// 不渲染 IP 本身。紧挨其后的 extra 是主题设置里的 IP 属性（原生/广播、家宽/IDC）。
export function IpStackBadges({
  ipv4,
  ipv6,
  extra = [],
}: {
  ipv4?: string | null;
  ipv6?: string | null;
  extra?: Array<{ label: string; color: string }>;
}) {
  if (!ipv4 && !ipv6 && extra.length === 0) return null;
  return (
    <span className="ip-stack-group">
      {ipv4 ? <span className="ip-stack-badge" data-tag="green">V4</span> : null}
      {ipv6 ? <span className="ip-stack-badge" data-tag="green">V6</span> : null}
      {extra.map((badge, index) => (
        <span
          key={`${badge.label}-${index}`}
          className="ip-stack-badge"
          data-tag={badge.color}
        >
          {badge.label}
        </span>
      ))}
    </span>
  );
}
