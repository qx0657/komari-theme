import { createContext, useContext, type ReactNode } from "react";
import type { TagFilterDimensionView, TagFilterSelection } from "@/utils/tagFilters";

export interface TagFilterContextValue {
  isSelectable: (label: string) => boolean;
  isActive: (label: string) => boolean;
  toggle: (label: string) => void;
}

const TagFilterContext = createContext<TagFilterContextValue | null>(null);

export function TagFilterProvider({
  value,
  children,
}: {
  value: TagFilterContextValue;
  children: ReactNode;
}) {
  return <TagFilterContext.Provider value={value}>{children}</TagFilterContext.Provider>;
}

export function useOptionalTagFilter(): TagFilterContextValue | null {
  return useContext(TagFilterContext);
}

export function TagFilterGroups({
  dimensions,
  selection,
  onToggle,
  align,
}: {
  dimensions: TagFilterDimensionView[];
  selection: TagFilterSelection;
  onToggle: (dimensionId: string, optionId: string) => void;
  align: "start" | "end";
}) {
  const visible = dimensions.filter((dimension) => dimension.visible);
  if (visible.length === 0) return null;

  return (
    <div className="home-tag-filters" data-align={align} role="group" aria-label="标签筛选">
      {visible.map((dimension) => (
        <div key={dimension.id} className="home-tag-pair" role="group" aria-label={dimension.label}>
          {dimension.options.map((option) => {
            const active = selection[dimension.id] === option.id;
            const disabled = !active && option.count === 0;
            const title = active
              ? `取消「${option.title}」`
              : disabled
                ? `当前没有「${option.title}」`
                : `只看「${option.title}」`;
            return (
              <button
                key={option.id}
                type="button"
                className="home-tag-option"
                data-tag={option.color}
                data-active={active ? "true" : "false"}
                aria-pressed={active}
                disabled={disabled}
                title={title}
                onClick={() => onToggle(dimension.id, option.id)}
              >
                <span className="home-tag-dot" aria-hidden="true" />
                <span>{option.label}</span>
                <span className="home-region-chip-count">{option.count}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
