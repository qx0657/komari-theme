import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { useIspUsage } from "@/hooks/useIspUsage";
import type { IspUsageResponse } from "@/services/cloudApis";

type Days = 7 | 14 | 30;

function relTime(iso: string | undefined) {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return iso;
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return `${seconds} 秒前`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} 分钟前`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} 小时前`;
  return new Date(iso).toLocaleString();
}

function fmtGb(value: number | null | undefined, digits = 2) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Number(value).toFixed(digits)} GB`;
}

function chartPts(
  vals: number[],
  w: number,
  h: number,
  padL: number,
  padR: number,
  padT: number,
  padB: number,
  yMin: number,
  yMax: number,
) {
  const n = vals.length;
  const span = yMax - yMin || 1;
  return vals.map((v, i) => ({
    x: padL + i * ((w - padL - padR) / Math.max(n - 1, 1)),
    y: padT + ((yMax - v) / span) * (h - padT - padB),
  }));
}

function splineTo(c: CanvasRenderingContext2D, pts: Array<{ x: number; y: number }>) {
  if (!pts.length) return;
  c.moveTo(pts[0].x, pts[0].y);
  if (pts.length === 1) return;
  if (pts.length === 2) {
    c.lineTo(pts[1].x, pts[1].y);
    return;
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    c.bezierCurveTo(
      p1.x + (p2.x - p0.x) / 6,
      p1.y + (p2.y - p0.y) / 6,
      p2.x - (p3.x - p1.x) / 6,
      p2.y - (p3.y - p1.y) / 6,
      p2.x,
      p2.y,
    );
  }
}

function UsageChart({
  payload,
  accent,
  muted,
  line,
}: {
  payload: IspUsageResponse | undefined;
  accent: string;
  muted: string;
  line: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hi, setHi] = useState(-1);
  const series = payload?.usage?.series_mb || {};
  const keys = useMemo(() => Object.keys(series), [series]);
  const vals = useMemo(() => keys.map((k) => series[k] ?? 0), [keys, series]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const c = canvas.getContext("2d");
    if (!c) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    if (!keys.length) {
      c.fillStyle = muted;
      c.font = "13px Inter, system-ui, sans-serif";
      c.fillText(
        payload?.usage && payload.usage.ok === false ? "用量接口当前不可用" : "暂无用量点",
        16,
        36,
      );
      return;
    }
    const padL = 48;
    const padR = 12;
    const padT = 16;
    const padB = 28;
    const lo = Math.min(...vals);
    const hiVal = Math.max(...vals);
    const padY = Math.max((hiVal - lo) * 0.22, hiVal * 0.04, 40);
    const yMin = Math.max(0, lo - padY);
    const yMax = hiVal + padY;
    const pts = chartPts(vals, w, h, padL, padR, padT, padB, yMin, yMax);
    const n = pts.length;
    const base = h - padB;
    c.strokeStyle = line;
    for (let i = 0; i < 4; i++) {
      const y = padT + ((base - padT) * i) / 3;
      c.beginPath();
      c.moveTo(padL, y);
      c.lineTo(w - padR, y);
      c.stroke();
    }
    c.fillStyle = muted;
    c.font = "11px ui-monospace, monospace";
    c.fillText(yMax.toFixed(0), 6, padT + 10);
    c.fillText(yMin.toFixed(0), 6, base);
    // canvas fill: use explicit accent (CSS vars are unreliable on canvas)
    const accentFill = accent.startsWith("#") ? accent : "#5ec8c5";
    const g2 = c.createLinearGradient(0, padT, 0, base);
    g2.addColorStop(0, `${accentFill}47`);
    g2.addColorStop(1, `${accentFill}00`);
    c.beginPath();
    splineTo(c, pts);
    c.lineTo(pts[n - 1].x, base);
    c.lineTo(pts[0].x, base);
    c.closePath();
    c.fillStyle = g2;
    c.fill();
    c.beginPath();
    splineTo(c, pts);
    c.strokeStyle = accentFill;
    c.lineWidth = 2.25;
    c.lineJoin = "round";
    c.lineCap = "round";
    c.stroke();
    pts.forEach((p, i) => {
      c.beginPath();
      c.arc(p.x, p.y, i === hi ? 4 : 2.2, 0, Math.PI * 2);
      c.fillStyle = i === hi ? "#e7eef5" : accentFill;
      c.fill();
    });
    if (hi >= 0 && hi < n) {
      c.strokeStyle = "rgba(231,238,245,.35)";
      c.beginPath();
      c.moveTo(pts[hi].x, padT);
      c.lineTo(pts[hi].x, base);
      c.stroke();
    }
    c.fillStyle = muted;
    const ticks = [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i);
    ticks.forEach((i) => {
      const label = (keys[i] || "").slice(5).replace("-", "/");
      c.fillText(label, Math.max(padL, pts[i].x - 14), h - 8);
    });
  }, [keys, vals, hi, payload, accent, muted, line]);

  const onMove = (event: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || keys.length < 2) {
      setHi(-1);
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const padL = 48;
    const padR = 12;
    const span = rect.width - padL - padR;
    const idx = Math.round(((x - padL) / Math.max(span, 1)) * (keys.length - 1));
    setHi(Math.max(0, Math.min(keys.length - 1, idx)));
  };

  const tip =
    hi >= 0 && hi < keys.length
      ? { day: keys[hi], mb: vals[hi] }
      : null;

  return (
    <div className="isp-chart-wrap">
      <canvas
        ref={canvasRef}
        className="isp-chart"
        role="img"
        aria-label="每日用量"
        onMouseMove={onMove}
        onMouseLeave={() => setHi(-1)}
      />
      {tip ? (
        <div className="probe-tip isp-chart-tip" role="status">
          <div className="probe-tip-time">{tip.day}</div>
          <div className="probe-tip-row">
            <span>用量</span>
            <b>{Number(tip.mb).toFixed(2)} MB</b>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function IspUsage() {
  const [days, setDays] = useState<Days>(7);
  const query = useIspUsage(days);
  const payload = query.data;
  const active = payload?.active;
  const err = payload?.errors?.orders || payload?.errors?.balance;
  const remain = payload?.remaining_gb;
  const fup = payload?.fup_gb || 100;
  const remainPct =
    remain == null || !fup ? 0 : Math.max(0, Math.min(100, (remain / fup) * 100));
  const reset = active?.expire_date ? String(active.expire_date).slice(0, 10) : "—";
  const renew = active?.renews_at || (active?.expire_date || "").toString().slice(0, 10) || "—";
  const price = active?.renew_price != null ? `$${active.renew_price}` : "";
  const plan = active?.renew_plan || active?.plan || "";
  const pay =
    active?.renew_pay === "balance" ? "余额" : active?.renew_pay ? String(active.renew_pay) : "";
  const subDetail = active?.auto_extend
    ? [price, plan, pay ? `${pay}扣` : "", renew !== "—" ? `下次 ${renew}` : ""]
        .filter(Boolean)
        .join(" · ")
    : active
      ? "未自动续"
      : "—";
  const ips = (active?.proxies || []).map((p) => p?.ip).filter(Boolean).join(" / ") || "—";

  return (
    <div className="probe-page isp-page">
      <div className="probe-toolbar">
        <Link to="/" className="control-button inline-flex items-center gap-1 px-3 py-2 text-[13px]">
          <ChevronLeft size={16} />
          首页
        </Link>
        <div className="isp-brand">
          <span className="isp-mark">ISP</span>
          <h1 className="isp-title">IProyal 流量</h1>
          {active?.auto_extend ? (
            <span className="probe-pill is-ok">已订阅</span>
          ) : active ? (
            <span className="probe-pill is-warn">未订阅</span>
          ) : null}
        </div>
        <div className="probe-meta">
          <span className={`probe-dot${err || query.isError ? " is-warn" : " is-ok"}`} />
          <b>{err || query.isError ? "拉取失败" : query.isLoading ? "加载中" : "在线"}</b>
          <span>
            更新 <b>{relTime(payload?.timestamp)}</b>
          </span>
          <span>
            余额 <b>${payload?.balance_usd ?? "—"}</b>
          </span>
          {payload?.session_expires_at ? (
            <span>登录态至 {new Date(payload.session_expires_at).toLocaleDateString()}</span>
          ) : null}
        </div>
      </div>

      {query.isLoading && !payload ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner size={24} />
        </div>
      ) : (
        <>
          <section className="isp-remain" aria-label="剩余流量">
            <div className="isp-remain-k">剩余流量</div>
            <div className="isp-remain-n numeric">{fmtGb(remain)}</div>
            <div className="isp-remain-s">
              {payload?.used_gb != null ? `本周期已用 ${fmtGb(payload.used_gb)} · ` : ""}
              额度 {fup} GB · 重置 {reset}
            </div>
            <div className="isp-remain-bar" role="presentation">
              <i style={{ width: `${remainPct}%` }} />
            </div>
          </section>

          <section className="isp-stats" aria-label="订阅摘要">
            {[
              ["订阅", subDetail],
              ["位置", active?.location || "—"],
              ["剩余天数", active?.days_left == null ? "—" : `${active.days_left} 天`],
              ["IP", ips],
            ].map(([k, v]) => (
              <article key={k} className="isp-stat-card">
                <div className="k">{k}</div>
                <div className={`v${k === "IP" ? " numeric" : ""}`}>{v}</div>
              </article>
            ))}
          </section>

          <section className="probe-panel">
            <h2>
              用量
              <span>悬停看当天 MB · 控制台说明最近一天可能延迟 24 小时</span>
            </h2>
            <div className="probe-filters" role="tablist" aria-label="用量区间">
              {([7, 14, 30] as Days[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  className="probe-chip"
                  data-active={days === d ? "true" : "false"}
                  onClick={() => setDays(d)}
                >
                  近 {d} 天
                </button>
              ))}
            </div>
            <UsageChart
              payload={payload}
              accent="#5ec8c5"
              muted="#8b9aab"
              line="#24303b"
            />
            {payload?.usage && payload.usage.ok === false ? (
              <p className="probe-note" style={{ marginTop: 12 }}>
                用量接口 {payload.usage.usage_status ?? "—"}。控制台登录态过期后需要再贴一次
                Bearer（IProyal 没有长期 refresh，JWT 约 60 天）。在 ThemeManage → IProyal
                凭据更新，勿写入公开 theme_settings。
              </p>
            ) : null}
          </section>

          <section className="probe-panel">
            <h2>订单</h2>
            <div className="probe-table-wrap">
              <table className="probe-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>状态</th>
                    <th>位置</th>
                    <th>套餐</th>
                    <th>到期</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {(payload?.orders || []).map((o) => (
                    <tr key={String(o.id)}>
                      <td className="numeric">{o.id}</td>
                      <td>{o.status}</td>
                      <td>{o.location}</td>
                      <td>
                        {o.plan}
                        {o.auto_extend ? " · 已订阅" : ""}
                      </td>
                      <td>{(o.expire_date || "").toString().slice(0, 10)}</td>
                      <td className="numeric">
                        {(o.proxies || []).map((p) => p?.ip).filter(Boolean).join(" / ") || "—"}
                      </td>
                    </tr>
                  ))}
                  {(payload?.orders || []).length === 0 ? (
                    <tr>
                      <td colSpan={6}>暂无订单</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <p className="probe-foot">
            用量来自同源 /isp/api。不展示代理密码。旧入口{" "}
            <a href="/isp/" className="theme-manage-inline-link">
              /isp/
            </a>{" "}
            仍可用。
          </p>
        </>
      )}
    </div>
  );
}
