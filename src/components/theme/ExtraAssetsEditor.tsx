import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  cloneSampleExtraAssets,
  EXTRA_ASSET_KIND_LABEL,
  type ExtraAsset,
  type ExtraAssetKind,
} from "@/utils/extraAssets";

const KINDS: ExtraAssetKind[] = ["domain", "airport", "isp", "other"];
const CURRENCIES = ["CNY", "USD", "EUR", "TRY"];
const CYCLES = [
  { days: 30, label: "月付" },
  { days: 90, label: "季付" },
  { days: 180, label: "半年" },
  { days: 365, label: "年付" },
  { days: 730, label: "两年" },
];

function newId(kind: ExtraAssetKind) {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${kind}-${suffix}`;
}

function blankAsset(kind: ExtraAssetKind = "domain"): ExtraAsset {
  return {
    id: newId(kind),
    kind,
    name: "",
    region: "",
    price: 0,
    currency: "CNY",
    billingCycle: kind === "domain" ? 365 : 30,
    expiredAt: "",
    ...(kind === "isp" ? { provider: "IProyal", liveIspUsage: true as const } : {}),
  };
}

function withKind(asset: ExtraAsset, kind: ExtraAssetKind): ExtraAsset {
  const next: ExtraAsset = { ...asset, kind };
  delete next.plan;
  delete next.resetDayOfMonth;
  delete next.quotaGb;
  delete next.usageSourceId;
  delete next.provider;
  delete next.liveIspUsage;
  if (kind === "isp") {
    next.provider = "IProyal";
    next.liveIspUsage = true;
  }
  return next;
}

function shownNumber(value: number | undefined, blankIfZero = false) {
  if (value == null || !Number.isFinite(value)) return "";
  if (blankIfZero && value === 0) return "";
  return String(value);
}

export function ExtraAssetsEditor({
  assets,
  onChange,
}: {
  assets: ExtraAsset[];
  onChange: (next: ExtraAsset[]) => void;
}) {
  const [draftText, setDraftText] = useState<Record<string, string>>({});
  const [focusId, setFocusId] = useState<string | null>(null);
  const ispTaken = assets.some((asset) => asset.kind === "isp");

  const patchRow = (index: number, next: ExtraAsset) => {
    onChange(assets.map((asset, i) => (i === index ? next : asset)));
  };

  const fieldKey = (id: string, field: string) => `${id}:${field}`;
  const fieldValue = (id: string, field: string, value: number | undefined, blankIfZero = false) =>
    fieldKey(id, field) in draftText
      ? draftText[fieldKey(id, field)]!
      : shownNumber(value, blankIfZero);

  const editNumber = (
    id: string,
    field: string,
    raw: string,
    commit: (value: number | undefined) => void,
  ) => {
    const key = fieldKey(id, field);
    setDraftText((prev) => ({ ...prev, [key]: raw }));
    const trimmed = raw.trim();
    if (!trimmed) {
      commit(undefined);
      return;
    }
    if (!/^\d+(\.\d+)?$/.test(trimmed)) return;
    const amount = Number(trimmed);
    if (Number.isFinite(amount)) commit(amount);
  };

  const finishNumber = (id: string, field: string) => {
    const key = fieldKey(id, field);
    setDraftText((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const addRow = () => {
    const row = blankAsset("domain");
    setFocusId(row.id);
    onChange([...assets, row]);
  };

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-[13px] font-medium text-[var(--text-primary)]">域名、机场、ISP</span>
        <span className="text-[11px] text-[var(--text-tertiary)]">
          填好后出现在首页。机场的套餐和额度写在同一条里。
        </span>
      </div>

      {assets.length === 0 ? (
        <p className="mt-2 text-[12px] text-[var(--text-tertiary)]">还没有条目。</p>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          {assets.map((asset, index) => {
            const kinds = KINDS.filter((kind) => kind !== "isp" || asset.kind === "isp" || !ispTaken);
            const cycles = CYCLES.some((cycle) => cycle.days === asset.billingCycle)
              ? CYCLES
              : [{ days: asset.billingCycle, label: `${asset.billingCycle} 天` }, ...CYCLES];
            const currencies = CURRENCIES.includes(asset.currency)
              ? CURRENCIES
              : [asset.currency || "CNY", ...CURRENCIES];
            return (
              <div key={asset.id} className="surface-inset flex flex-col gap-2 px-3 py-2.5">
                <div className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-2">
                  <select
                    value={asset.kind}
                    aria-label={`第 ${index + 1} 条类型`}
                    onChange={(event) =>
                      patchRow(index, withKind(asset, event.target.value as ExtraAssetKind))
                    }
                    className="w-full bg-transparent py-1 text-[13px] text-[var(--text-primary)] outline-none"
                  >
                    {kinds.map((kind) => (
                      <option key={kind} value={kind}>
                        {EXTRA_ASSET_KIND_LABEL[kind]}
                      </option>
                    ))}
                  </select>
                  <input
                    value={asset.name}
                    autoFocus={asset.id === focusId}
                    aria-label={`第 ${index + 1} 条名称`}
                    placeholder={asset.kind === "domain" ? "example.com" : "名称"}
                    onChange={(event) => patchRow(index, { ...asset, name: event.target.value })}
                    className="w-full bg-transparent py-1 text-[13px] outline-none"
                  />
                  <button
                    type="button"
                    className="rounded-lg p-2 text-[var(--text-tertiary)] hover:bg-[var(--fill-tertiary)] hover:text-[var(--text-primary)]"
                    aria-label={`删除第 ${index + 1} 条`}
                    onClick={() => onChange(assets.filter((_, i) => i !== index))}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <input
                    value={fieldValue(asset.id, "price", asset.price, true)}
                    inputMode="decimal"
                    aria-label={`第 ${index + 1} 条价格`}
                    placeholder="价格"
                    onChange={(event) =>
                      editNumber(asset.id, "price", event.target.value, (amount) =>
                        patchRow(index, {
                          ...asset,
                          price: amount != null && amount >= 0 ? amount : 0,
                        }),
                      )
                    }
                    onBlur={() => finishNumber(asset.id, "price")}
                    className="w-full bg-transparent py-1 text-[13px] outline-none"
                  />
                  <select
                    value={asset.currency || "CNY"}
                    aria-label={`第 ${index + 1} 条币种`}
                    onChange={(event) => patchRow(index, { ...asset, currency: event.target.value })}
                    className="w-full bg-transparent py-1 text-[13px] outline-none"
                  >
                    {currencies.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                  <select
                    value={String(asset.billingCycle)}
                    aria-label={`第 ${index + 1} 条周期`}
                    onChange={(event) =>
                      patchRow(index, { ...asset, billingCycle: Number(event.target.value) })
                    }
                    className="w-full bg-transparent py-1 text-[13px] outline-none"
                  >
                    {cycles.map((cycle) => (
                      <option key={cycle.days} value={cycle.days}>
                        {cycle.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={/^\d{4}-\d{2}-\d{2}$/.test(asset.expiredAt) ? asset.expiredAt : ""}
                    aria-label={`第 ${index + 1} 条到期日`}
                    onChange={(event) => patchRow(index, { ...asset, expiredAt: event.target.value })}
                    className="w-full bg-transparent py-1 text-[13px] outline-none"
                  />
                </div>

                {asset.kind === "airport" ? (
                  <>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <input
                      value={asset.plan ?? ""}
                      aria-label={`第 ${index + 1} 条套餐`}
                      placeholder="套餐，可空"
                      onChange={(event) =>
                        patchRow(index, { ...asset, plan: event.target.value || undefined })
                      }
                      onBlur={(event) =>
                        patchRow(index, {
                          ...asset,
                          plan: event.target.value.trim() || undefined,
                        })
                      }
                      className="w-full bg-transparent py-1 text-[13px] outline-none"
                    />
                    <select
                      value={asset.resetDayOfMonth ?? ""}
                      aria-label={`第 ${index + 1} 条重置日`}
                      onChange={(event) => {
                        const raw = event.target.value;
                        patchRow(index, {
                          ...asset,
                          resetDayOfMonth: raw ? Number(raw) : undefined,
                        });
                      }}
                      className="w-full bg-transparent py-1 text-[13px] outline-none"
                    >
                      <option value="">不按月重置</option>
                      {Array.from({ length: 28 }, (_, day) => day + 1).map((day) => (
                        <option key={day} value={day}>
                          每月 {day} 日重置
                        </option>
                      ))}
                    </select>
                    <input
                      value={fieldValue(asset.id, "quota", asset.quotaGb)}
                      inputMode="decimal"
                      aria-label={`第 ${index + 1} 条每月额度`}
                      placeholder="每月额度 GB，可空"
                      onChange={(event) =>
                        editNumber(asset.id, "quota", event.target.value, (amount) =>
                          patchRow(index, {
                            ...asset,
                            quotaGb: amount != null && amount > 0 ? amount : undefined,
                          }),
                        )
                      }
                      onBlur={() => finishNumber(asset.id, "quota")}
                      className="w-full bg-transparent py-1 text-[13px] outline-none"
                    />
                    <input
                      value={asset.usageSourceId ?? ""}
                      aria-label={`第 ${index + 1} 条用量来源`}
                      placeholder="用量来源 ID，可空"
                      onChange={(event) =>
                        patchRow(index, {
                          ...asset,
                          usageSourceId: event.target.value || undefined,
                        })
                      }
                      onBlur={(event) =>
                        patchRow(index, {
                          ...asset,
                          usageSourceId: event.target.value.trim() || undefined,
                        })
                      }
                      className="w-full bg-transparent py-1 text-[13px] outline-none sm:col-span-3"
                    />
                  </div>
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    订阅能返回已用和总量时，首页直接显示。读不到已用时，仍显示每月额度作为总量。来源
                    ID 对应用量接口里的 id。订阅地址不要写在这里。
                  </p>
                  </>
                ) : null}

                {asset.kind === "isp" ? (
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    余量从 IProyal 读。Token 写在下面，不进这里。
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--fill-tertiary)] hover:text-[var(--text-primary)]"
          onClick={addRow}
        >
          <Plus size={13} />
          添加
        </button>
        {assets.length === 0 ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--fill-tertiary)] hover:text-[var(--text-primary)]"
            onClick={() => onChange(cloneSampleExtraAssets())}
          >
            填入示例
          </button>
        ) : null}
      </div>
    </div>
  );
}
