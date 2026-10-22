import { useMinuteClock } from "@/hooks/useClock";
import type { NodeInfo } from "@/types/komari";
import {
  findTrafficReset, trafficResetDisplay, trafficResetError,
  type NodeTrafficReset,
} from "@/utils/trafficReset";

const TIME_ZONES = ["UTC", "Asia/Shanghai", "Asia/Hong_Kong", "Asia/Tokyo", "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Berlin"];

export function TrafficResetsEditor({ nodes, rules, loading, error, onRetry, onChange }: {
  nodes: Pick<NodeInfo, "uuid" | "name" | "traffic_limit">[];
  rules: NodeTrafficReset[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onChange: (rules: NodeTrafficReset[]) => void;
}) {
  const now = useMinuteClock();
  const limited = nodes.filter((node) => node.traffic_limit > 0);
  const update = (node: typeof nodes[number], rule: NodeTrafficReset | undefined, patch: Partial<NodeTrafficReset> | null) => {
    // 修改名称匹配规则中的一台时，创建 UUID 覆盖；不改变同规则下其他节点。
    const exact = rules.find((item) => item.identities.length === 1 && item.identities[0].toLowerCase() === node.uuid.toLowerCase());
    const rest = rules.filter((item) => item !== exact);
    if (patch === null) {
      // 移除命中身份，确保取消设置后不会再回退到名称规则。
      onChange(rest.map((item) => ({ ...item, identities: item.identities.filter((id) => ![node.uuid.toLowerCase(), node.name.toLowerCase()].includes(id.toLowerCase())) })).filter((item) => item.identities.length));
      return;
    }
    onChange([...rest, {
      day: 1, time: "00:00", timeZone: "Asia/Shanghai", shortMonth: "last-day",
      ...rule, ...patch, identities: [node.uuid],
    }]);
  };
  return (
    <div className="traffic-reset-editor">
      <h3>流量重置时间</h3>
      <p>按节点设置每月周期，首页流量条下显示倒计时。未设置或无限流量时隐藏。这里仅设置显示时间，实际清零仍由探针和服务商负责。</p>
      {loading ? <p>正在读取节点…</p> : error ? <p>无法读取节点。<button type="button" className="traffic-reset-retry" onClick={onRetry}>重试</button></p> : limited.length === 0 ? <p>暂无设有流量额度的节点。</p> : (
        <div className="traffic-reset-editor-rows">
          {limited.map((node) => {
            const rule = findTrafficReset(node, rules);
            const error = rule ? trafficResetError(rule) : null;
            const preview = rule && !error ? trafficResetDisplay(rule, now) : null;
            const prefix = `traffic-reset-${node.uuid}`;
            return (
              <div className="traffic-reset-editor-row" key={node.uuid}>
                <div className="traffic-reset-editor-heading">
                  <span>{node.name}</span>
                  <label>
                    <span className="sr-only">{node.name}每月重置日</span>
                    <select value={rule?.day ?? ""} onChange={(event) => update(node, rule, event.target.value ? { day: Number(event.target.value) } : null)}>
                      <option value="">不显示重置时间</option>
                      {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>每月 {i + 1} 日</option>)}
                    </select>
                  </label>
                </div>
                {rule && (
                  <>
                    <div className="traffic-reset-editor-fields">
                      <label>重置时刻
                        <input type="time" step="1" value={rule.time} aria-label={`${node.name}重置时刻`} onChange={(event) => update(node, rule, { time: event.target.value })} />
                      </label>
                      <label>时区
                        <input value={rule.timeZone} list="traffic-reset-timezones" aria-label={`${node.name}重置时区`} aria-invalid={Boolean(error)} aria-describedby={error ? `${prefix}-error` : undefined} onChange={(event) => update(node, rule, { timeZone: event.target.value.trim() })} spellCheck={false} />
                      </label>
                      {rule.day > 28 && <label>当月没有这一天
                        <select value={rule.shortMonth} aria-label={`${node.name}短月处理`} onChange={(event) => update(node, rule, { shortMonth: event.target.value as NodeTrafficReset["shortMonth"] })}>
                          <option value="last-day">在当月最后一天重置</option>
                          <option value="next-month">顺延至次月 1 日（探针默认）</option>
                          <option value="skip">跳过这个月</option>
                        </select>
                      </label>}
                    </div>
                    {error ? <p id={`${prefix}-error`} className="traffic-reset-editor-error" role="alert">{error}</p> : preview && <p className="traffic-reset-editor-preview">{preview.countdown} · {preview.exact}</p>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      <datalist id="traffic-reset-timezones">{TIME_ZONES.map((zone) => <option key={zone} value={zone} />)}</datalist>
    </div>
  );
}
