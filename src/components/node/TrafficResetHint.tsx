import { ChevronDown, RotateCcw } from "lucide-react";
import type { TrafficResetDisplay } from "@/utils/trafficReset";

export function TrafficResetHint({ reset, dense = false, reserveSpace = false }: {
  reset?: TrafficResetDisplay | null;
  dense?: boolean;
  reserveSpace?: boolean;
}) {
  // 同一组卡片保留一致的提示行；空行不暴露文案或键盘焦点。
  const className = `traffic-reset${dense ? " is-dense" : ""}`;
  if (!reset) return reserveSpace
    ? <div className={`${className} is-empty`} aria-hidden="true" />
    : null;
  return (
    <details className={className}>
      <summary aria-label={`流量${reset.countdown}，${reset.exact}，查看重置规则`}>
        <RotateCcw size={12} aria-hidden />
        <span className="traffic-reset-countdown">{reset.countdown}</span>
        {!dense && <span className="traffic-reset-date">· {reset.date}</span>}
        <ChevronDown className="traffic-reset-chevron" size={12} aria-hidden />
      </summary>
      <div className="traffic-reset-details">
        <time dateTime={new Date(reset.at).toISOString()}>{reset.exact}</time>
        <span>{reset.rule}</span>
        <span>按配置周期预计，实际用量以服务商为准。</span>
      </div>
    </details>
  );
}
