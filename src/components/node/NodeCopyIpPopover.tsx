import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type FocusEvent,
} from "react";
import { createPortal } from "react-dom";
import { Check, Copy } from "lucide-react";
import { useFineHover } from "@/hooks/useMediaQuery";
import { writeClipboard } from "@/utils/clipboard";
import {
  collectRevealedIps,
  primaryCopyText,
} from "@/utils/ipProfiles";
import {
  consumeTriggerFocusSuppression,
  INITIAL_NODE_TODAY_TRAFFIC_POPOVER_STATE,
  isNodeTodayTrafficPopoverOpen,
  nodeTodayTrafficPopoverReducer,
} from "./nodeTodayTrafficPopoverState";

const POPOVER_WIDTH = 228;
const POPOVER_GAP = 8;
const VIEWPORT_PADDING = 8;
const HOVER_CLOSE_DELAY_MS = 160;
const COPIED_HOLD_MS = 1600;

/**
 * 卡片标题旁的复制 IP 入口：默认只显示图标，悬停弹出地址（与今日流量同一套
 * portal 弹层），点击把可复制的地址写入剪贴板。
 */
export function NodeCopyIpPopover({
  ipv4,
  ipv6,
  size = 15,
}: {
  ipv4?: string | null;
  ipv6?: string | null;
  size?: number;
}) {
  const ips = collectRevealedIps(ipv4, ipv6);
  const copyText = primaryCopyText(ips);
  const fineHover = useFineHover();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const focusCheckFrameRef = useRef<number | null>(null);
  const copiedHoldTimerRef = useRef<number | null>(null);
  const focusPopoverOnOpenRef = useRef(false);
  const suppressNextTriggerFocusRef = useRef(false);
  const [state, dispatch] = useReducer(
    nodeTodayTrafficPopoverReducer,
    INITIAL_NODE_TODAY_TRAFFIC_POPOVER_STATE,
  );
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const hoverOpen = isNodeTodayTrafficPopoverOpen(state);
  const open = hoverOpen || copied;

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const cancelFocusCheck = useCallback(() => {
    if (focusCheckFrameRef.current != null) {
      window.cancelAnimationFrame(focusCheckFrameRef.current);
      focusCheckFrameRef.current = null;
    }
  }, []);

  const clearCopiedHold = useCallback(() => {
    if (copiedHoldTimerRef.current != null) {
      window.clearTimeout(copiedHoldTimerRef.current);
      copiedHoldTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => {
      dispatch({ type: "hover-close" });
    }, HOVER_CLOSE_DELAY_MS);
  }, [cancelClose]);

  const openOnHover = useCallback(() => {
    cancelClose();
    dispatch({ type: "hover-open" });
  }, [cancelClose]);

  const scheduleFocusCheck = useCallback(() => {
    cancelFocusCheck();
    focusCheckFrameRef.current = window.requestAnimationFrame(() => {
      focusCheckFrameRef.current = null;
      const active = document.activeElement;
      const stillInside =
        active != null &&
        (triggerRef.current?.contains(active) || popoverRef.current?.contains(active));
      dispatch({ type: stillInside ? "focus-enter" : "focus-leave" });
    });
  }, [cancelFocusCheck]);

  const handleTriggerFocus = useCallback((event: FocusEvent<HTMLButtonElement>) => {
    if (consumeTriggerFocusSuppression(suppressNextTriggerFocusRef)) return;
    if (!event.currentTarget.matches(":focus-visible")) return;
    cancelClose();
    focusPopoverOnOpenRef.current = true;
    dispatch({ type: "focus-enter" });
  }, [cancelClose]);

  const handlePopoverFocus = useCallback(() => {
    cancelClose();
    dispatch({ type: "focus-enter" });
  }, [cancelClose]);

  const markCopied = useCallback(() => {
    setCopied(true);
    setCopyFailed(false);
    clearCopiedHold();
    copiedHoldTimerRef.current = window.setTimeout(() => {
      copiedHoldTimerRef.current = null;
      setCopied(false);
    }, COPIED_HOLD_MS);
  }, [clearCopiedHold]);

  const copyValue = useCallback(
    async (text: string | null) => {
      if (!text) return;
      const ok = await writeClipboard(text);
      if (ok) markCopied();
      else setCopyFailed(true);
    },
    [markCopied],
  );

  const handleClick = useCallback(() => {
    cancelClose();
    focusPopoverOnOpenRef.current = false;
    // 触屏没有 hover：点按既打开弹层也复制，失败时至少还能看见地址。
    dispatch({ type: "hover-open" });
    void copyValue(copyText);
  }, [cancelClose, copyText, copyValue]);

  useEffect(
    () => () => {
      cancelClose();
      cancelFocusCheck();
      clearCopiedHold();
    },
    [cancelClose, cancelFocusCheck, clearCopiedHold],
  );

  useEffect(() => {
    if (!open || !focusPopoverOnOpenRef.current) return;
    focusPopoverOnOpenRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      popoverRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const trigger = triggerRef.current;
    if (!trigger) return;
    const update = () => {
      const rect = trigger.getBoundingClientRect();
      const width = popoverRef.current?.offsetWidth || POPOVER_WIDTH;
      const height = popoverRef.current?.offsetHeight ?? 0;
      const belowTop = rect.bottom + POPOVER_GAP;
      const top =
        belowTop + height > window.innerHeight - VIEWPORT_PADDING
          ? Math.max(VIEWPORT_PADDING, rect.top - height - POPOVER_GAP)
          : belowTop;
      const left = Math.min(
        Math.max(VIEWPORT_PADDING, rect.left + rect.width / 2 - width / 2),
        Math.max(VIEWPORT_PADDING, window.innerWidth - width - VIEWPORT_PADDING),
      );
      setPosition({ top, left });
    };
    update();
    const frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [copied, copyFailed, ips.v4, ips.v6, open]);

  useEffect(() => {
    if (!open) return;
    const handleClose = () => {
      cancelClose();
      clearCopiedHold();
      setCopied(false);
      focusPopoverOnOpenRef.current = false;
      dispatch({ type: "close-all" });
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        target &&
        (triggerRef.current?.contains(target) || popoverRef.current?.contains(target))
      ) {
        return;
      }
      handleClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const restoreTriggerFocus = popoverRef.current?.contains(document.activeElement);
      handleClose();
      if (restoreTriggerFocus) {
        suppressNextTriggerFocusRef.current = true;
        window.requestAnimationFrame(() => {
          const trigger = triggerRef.current;
          if (!trigger) {
            suppressNextTriggerFocusRef.current = false;
            return;
          }
          trigger.focus();
        });
      }
    };
    window.addEventListener("resize", handleClose);
    window.addEventListener("scroll", handleClose, { capture: true, passive: true });
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", handleClose);
      window.removeEventListener("scroll", handleClose, { capture: true });
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [cancelClose, clearCopiedHold, open]);

  if (!copyText) return null;

  const triggerLabel = copied ? "已复制 IP" : "复制 IP";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`node-traffic-trigger${copied ? " is-copied" : ""}`}
        aria-label={triggerLabel}
        title={triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={handleClick}
        onPointerEnter={fineHover ? openOnHover : undefined}
        onPointerLeave={fineHover ? scheduleClose : undefined}
        onFocus={handleTriggerFocus}
        onBlur={scheduleFocusCheck}
      >
        {copied ? (
          <Check size={size} strokeWidth={2.2} />
        ) : (
          <Copy size={size} strokeWidth={2.1} />
        )}
      </button>
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="node-traffic-popover node-ip-popover"
            role="dialog"
            aria-label="公网 IP"
            tabIndex={-1}
            style={
              position
                ? { top: position.top, left: position.left }
                : { top: 0, left: 0, visibility: "hidden" }
            }
            onFocusCapture={handlePopoverFocus}
            onBlurCapture={scheduleFocusCheck}
            onPointerEnter={fineHover ? openOnHover : undefined}
            onPointerLeave={fineHover ? scheduleClose : undefined}
          >
            <div className="node-traffic-popover-head">
              <span>公网 IP</span>
              <span className="node-traffic-popover-badge">
                {copied ? "已复制" : "点击复制"}
              </span>
            </div>
            <div className="node-traffic-popover-rows">
              {ips.v4 && (
                <IpRow
                  label="V4"
                  value={ips.v4}
                  copied={copied}
                  onCopy={() => void copyValue(ips.v4)}
                />
              )}
              {ips.v6 && (
                <IpRow
                  label="V6"
                  value={ips.v6}
                  copied={copied}
                  onCopy={() => void copyValue(ips.v6)}
                />
              )}
            </div>
            <div className="node-traffic-popover-foot">
              <span>{copyFailed ? "复制失败，请手动选中" : "点击按钮复制"}</span>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function IpRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="node-traffic-popover-row node-ip-row">
      <span className="node-traffic-popover-label">{label}</span>
      <button
        type="button"
        className="node-ip-value"
        title={`复制 ${label}`}
        onClick={onCopy}
      >
        <strong className="tabular">{value}</strong>
        {copied ? <Check size={11} strokeWidth={2.4} /> : <Copy size={11} strokeWidth={2.2} />}
      </button>
    </div>
  );
}
