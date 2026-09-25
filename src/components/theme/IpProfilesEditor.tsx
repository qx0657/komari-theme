import { Plus, Trash2 } from "lucide-react";
import {
  cloneSampleIpProfiles,
  inferIpBadgeColor,
  type NodeIpProfile,
} from "@/utils/ipProfiles";

function badgesToText(badges: NodeIpProfile["badges"]): string {
  return badges.map((badge) => badge.label).join(", ");
}

function textToBadges(value: string): NodeIpProfile["badges"] {
  return value.split(/[,，;；]+/).map((item) => {
    const label = item.trim();
    return { label, color: label ? inferIpBadgeColor(label) : "violet" };
  });
}

export function IpProfilesEditor({
  profiles,
  onChange,
}: {
  profiles: NodeIpProfile[];
  onChange: (next: NodeIpProfile[]) => void;
}) {
  const patchRow = (index: number, next: NodeIpProfile) => {
    onChange(profiles.map((profile, i) => (i === index ? next : profile)));
  };

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-[13px] font-medium text-[var(--text-primary)]">
          IP 属性标签
        </span>
        <span className="text-[11px] text-[var(--text-tertiary)]">
          显示在 V4/V6 后面。按节点名称或 UUID 匹配。
        </span>
      </div>
      <div className="mt-2 flex flex-col gap-2">
        {profiles.map((profile, index) => (
          <div
            key={index}
            className="surface-inset grid gap-2 px-3 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto]"
          >
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-[11px] text-[var(--text-tertiary)]">节点</span>
              <input
                value={profile.identities.join(", ")}
                onChange={(event) =>
                  patchRow(index, {
                    ...profile,
                    identities: event.target.value
                      .split(/[\n,，;；]+/)
                      .map((item) => item.trim()),
                  })
                }
                placeholder="节点名称或 UUID"
                aria-label={`第 ${index + 1} 条节点身份`}
                className="w-full bg-transparent px-0 py-1 text-[13px] outline-none"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-[11px] text-[var(--text-tertiary)]">标签</span>
              <input
                value={badgesToText(profile.badges)}
                onChange={(event) =>
                  patchRow(index, {
                    ...profile,
                    badges: textToBadges(event.target.value),
                  })
                }
                placeholder="原生, IDC机房"
                aria-label={`第 ${index + 1} 条 IP 标签`}
                className="w-full bg-transparent px-0 py-1 text-[13px] outline-none"
              />
            </label>
            <button
              type="button"
              className="self-end justify-self-end rounded-lg p-2 text-[var(--text-tertiary)] hover:bg-[var(--fill-tertiary)] hover:text-[var(--text-primary)]"
              aria-label={`删除第 ${index + 1} 条`}
              onClick={() => onChange(profiles.filter((_, i) => i !== index))}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--fill-tertiary)] hover:text-[var(--text-primary)]"
          onClick={() =>
            onChange([
              ...profiles,
              { identities: [], badges: [{ label: "原生", color: "green" }] },
            ])
          }
        >
          <Plus size={13} />
          添加节点
        </button>
        {profiles.length === 0 ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--fill-tertiary)] hover:text-[var(--text-primary)]"
            onClick={() => onChange(cloneSampleIpProfiles())}
          >
            填入示例
          </button>
        ) : null}
      </div>
    </div>
  );
}
