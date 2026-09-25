import { EyeOff } from "lucide-react";
import { hideHomeCard } from "@/hooks/useHomeCardHidden";

/** 卡片标题旁的隐藏入口：点一下把这台从首页收起，地区栏「全部显示」再放回来。 */
export function NodeHideButton({
  uuid,
  name,
  size = 15,
}: {
  uuid: string;
  name: string;
  size?: number;
}) {
  const label = `隐藏 ${name}`;
  return (
    <button
      type="button"
      className="node-hide-button"
      aria-label={label}
      title={label}
      onClick={() => hideHomeCard(uuid)}
    >
      <EyeOff size={size} strokeWidth={2.1} />
    </button>
  );
}
