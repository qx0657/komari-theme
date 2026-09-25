import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { NodeCopyIpPopover } from "@/components/node/NodeCopyIpPopover";
import { useAirportUsage } from "@/hooks/useAirportUsage";
import { useIspUsage } from "@/hooks/useIspUsage";
import { useThemeSettings } from "@/hooks/useThemeSettings";
import { formatPostedPrice } from "@/utils/billing";
import { getExpireDaysRemaining, joinDisplayParts } from "@/utils/format";
import {
  airportBoardFromAsset,
  airportLiveTotalGb,
  airportQuotaGb,
  airportTrafficFromSource,
  findAirportUsageSource,
  ispFupGb,
  ispHasLiveUsage,
  ispProviderLabel,
  ispProxyIps,
  ispRemainingGb,
  ispUsedGb,
  nextMonthlyResetDay,
  type AirportUserinfoSource,
  type ExtraAsset,
} from "@/utils/extraAssets";

type ExtraDetail = {
  uuid: string;
  name: string;
  kind: string;
  sourcePrice: number;
  sourceCurrency: string;
  billingCycleDays: number;
  expiredAt: string;
};

function formatGb(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (Math.abs(value - Math.round(value)) < 0.05) return `${Math.round(value)} GB`;
  return `${value.toFixed(value >= 10 ? 1 : 2)} GB`;
}

function expireLabel(expiredAt: string) {
  const days = getExpireDaysRemaining(expiredAt);
  if (days == null) return "";
  if (days < 0) return "已过期";
  if (days === 0) return "今日到期";
  return `${days} 天后到期`;
}

function resetLabel(resetAt: string) {
  const days = getExpireDaysRemaining(resetAt);
  if (days == null) return "";
  if (days < 0) return "";
  if (days === 0) return "今日重置";
  return `${days} 天后重置`;
}

function BillList({ items }: { items: ExtraDetail[] }) {
  if (items.length === 0) {
    return <p className="home-bill-empty">暂无记录</p>;
  }
  return (
    <ul className="home-bill-list">
      {items.map((item) => (
        <li key={item.uuid}>
          <span className="home-bill-name">{item.name}</span>
          <span className="home-bill-meta">
            <b>
              {formatPostedPrice(item.sourcePrice, item.sourceCurrency, item.billingCycleDays) ??
                "—"}
            </b>
            <em>{expireLabel(item.expiredAt) || "到期未知"}</em>
          </span>
        </li>
      ))}
    </ul>
  );
}

function IspList({ items }: { items: ExtraAsset[] }) {
  const ispQuery = useIspUsage();
  if (items.length === 0) {
    return <p className="home-bill-empty">暂无记录</p>;
  }
  return (
    <ul className="home-bill-list">
      {items.map((item) => {
        const live = ispHasLiveUsage(item);
        const remaining = live ? ispRemainingGb(ispQuery.data) : null;
        const used = live ? ispUsedGb(ispQuery.data) : null;
        const limit = live ? ispFupGb(ispQuery.data) : null;
        const daysLeft = live ? ispQuery.data?.active?.days_left : null;
        const ips = live ? ispProxyIps(ispQuery.data) : [];
        const usedPct =
          remaining != null && limit != null && limit > 0
            ? Math.min(100, Math.max(0, ((limit - remaining) / limit) * 100))
            : 0;
        const showBar = live && remaining != null && limit != null && limit > 0 && !ispQuery.isError;
        let remainingLabel = "—";
        if (live && ispQuery.isLoading && remaining == null) remainingLabel = "…";
        else if (remaining != null) remainingLabel = formatGb(remaining);
        const priceLabel = formatPostedPrice(item.price, item.currency, item.billingCycle);
        const provider = ispProviderLabel(item);
        const foot = live
          ? ispQuery.isLoading && remaining == null
            ? joinDisplayParts([priceLabel, `读取 ${provider}…`])
            : ispQuery.isError
              ? joinDisplayParts([priceLabel, "用量暂时读不到"])
              : joinDisplayParts([
                  priceLabel,
                  used != null ? `${formatGb(used)} 已用` : "",
                  limit != null ? `${formatGb(limit).replace(" GB", "")} GB FUP` : "",
                  daysLeft != null ? `${Math.round(daysLeft)} 天后重置` : "",
                ])
          : joinDisplayParts([priceLabel, expireLabel(item.expiredAt)]);
        return (
          <li
            key={item.id}
            className={showBar ? "home-airport-item home-airport-live" : "home-airport-item"}
          >
            <div className="home-airport-top">
              <span className="home-bill-heading">
                <span className="home-bill-name">{provider}</span>
                {live ? (
                  <span className="home-isp-actions">
                    {ips.length > 0 ? (
                      <NodeCopyIpPopover ipv4={ips[0]} size={13} />
                    ) : null}
                    <Link
                      className="overview-card-action"
                      to="/?view=isp"
                      title={`${provider} 用量详情`}
                      aria-label={`打开 ${provider} 用量页`}
                    >
                      <ChevronRight size={15} />
                    </Link>
                  </span>
                ) : null}
              </span>
              <span className="home-airport-traffic numeric">{remainingLabel}</span>
            </div>
            {showBar ? (
              <div className="overview-bar" role="presentation">
                <span className="home-isp-used" style={{ width: `${usedPct}%` }} />
              </div>
            ) : null}
            {foot ? <p className="home-airport-foot">{foot}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

function AirportList({
  items,
  assetsById,
  sources,
}: {
  items: ExtraDetail[];
  assetsById: Map<string, ExtraAsset>;
  sources: readonly AirportUserinfoSource[];
}) {
  if (items.length === 0) {
    return <p className="home-bill-empty">暂无记录</p>;
  }
  return (
    <ul className="home-bill-list home-airport-list">
      {items.map((item) => {
        const asset = assetsById.get(item.uuid);
        const board = asset ? airportBoardFromAsset(asset) : undefined;
        const source = asset ? findAirportUsageSource(asset, sources) : undefined;
        const traffic = airportTrafficFromSource(source);
        const totalGb = traffic?.totalGb ?? airportLiveTotalGb(source) ?? airportQuotaGb(board);
        const usedUnknown = totalGb != null && traffic == null;
        const resetAt = board?.resetDay ? nextMonthlyResetDay(board.resetDay) : "";
        const priceLabel = formatPostedPrice(
          item.sourcePrice,
          item.sourceCurrency,
          item.billingCycleDays,
        );
        const expire = expireLabel(item.expiredAt);
        const reset = resetLabel(resetAt);
        const foot = totalGb != null ? joinDisplayParts([priceLabel, reset, expire]) : reset;
        return (
          <li
            key={item.uuid}
            className={traffic ? "home-airport-item home-airport-live" : "home-airport-item"}
          >
            <div className="home-airport-top">
              <span className="home-bill-heading">
                <span className="home-bill-name">{item.name}</span>
                {board?.plan ? <span className="home-airport-plan-inline">{board.plan}</span> : null}
              </span>
              {totalGb != null ? (
                <span
                  className="home-airport-traffic numeric"
                  title={usedUnknown ? "无法获取已用流量" : "已用 / 总量"}
                  aria-label={usedUnknown ? `已用未知 / ${formatGb(totalGb)}` : undefined}
                >
                  {traffic ? (
                    `${formatGb(traffic.usedGb).replace(" GB", "")} / ${formatGb(traffic.totalGb)}`
                  ) : (
                    <>
                      <span className="home-airport-unknown">未知</span>
                      {` / ${formatGb(totalGb)}`}
                    </>
                  )}
                </span>
              ) : (
                <span className="home-bill-meta">
                  <b>{priceLabel ?? "—"}</b>
                  <em>{expire || "到期未知"}</em>
                </span>
              )}
            </div>
            {traffic ? (
              <div className="overview-bar" role="presentation">
                <span className="home-isp-used" style={{ width: `${traffic.usedPct}%` }} />
              </div>
            ) : null}
            {foot ? <p className="home-airport-foot">{foot}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

export function HomeResourceStrip({
  extraDetails,
  extraAssets = [],
}: {
  extraDetails: ExtraDetail[];
  extraAssets?: ExtraAsset[];
}) {
  const themeSettings = useThemeSettings();
  const ispQuery = useIspUsage();
  const airportUsage = useAirportUsage(themeSettings.airportUsageUrl);

  const isps = extraAssets.filter((item) => item.kind === "isp");
  const domains = extraDetails.filter((item) => item.kind === "domain");
  const airports = extraDetails.filter((item) => item.kind === "airport");
  const assetsById = new Map(extraAssets.map((asset) => [asset.id, asset]));

  const showIsp = themeSettings.enableIspStrip && isps.length > 0 && !ispQuery.isError;
  const showAirport = themeSettings.enableAirportStrip && airports.length > 0;
  const showDomain = domains.length > 0;

  if (!showIsp && !showDomain && !showAirport) {
    return null;
  }

  return (
    <section className="home-resource-row" aria-label="云资源">
      {showIsp ? (
        <article className="overview-card home-isp-card home-bills-card" data-metric="isp">
          <div className="overview-card-head">
            <span className="overview-card-label">ISP IP余量</span>
          </div>
          <IspList items={isps} />
        </article>
      ) : null}

      {showDomain ? (
        <article className="overview-card home-bills-card" data-metric="domain">
          <div className="overview-card-head">
            <span className="overview-card-label">域名</span>
          </div>
          <BillList items={domains} />
        </article>
      ) : null}

      {showAirport ? (
        <article className="overview-card home-bills-card" data-metric="airport">
          <div className="overview-card-head">
            <span className="overview-card-label">机场</span>
          </div>
          <AirportList
            items={airports}
            assetsById={assetsById}
            sources={airportUsage.data ?? []}
          />
        </article>
      ) : null}
    </section>
  );
}
