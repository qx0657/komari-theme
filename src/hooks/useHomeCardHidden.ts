import { useSyncExternalStore } from "react";
import {
  HOME_CARD_HIDDEN_STORAGE_KEY,
  parseHomeCardHidden,
  withHiddenUuid,
} from "@/utils/homeCardHidden";

export interface HomeCardHiddenSnapshot {
  uuids: readonly string[];
  hidden: ReadonlySet<string>;
}

const EMPTY_UUIDS: readonly string[] = [];
const EMPTY: HomeCardHiddenSnapshot = { uuids: EMPTY_UUIDS, hidden: new Set() };

const listeners = new Set<() => void>();
let snapshot: HomeCardHiddenSnapshot = EMPTY;
let loaded = false;

function readStored(): string[] {
  try {
    return parseHomeCardHidden(localStorage.getItem(HOME_CARD_HIDDEN_STORAGE_KEY));
  } catch {
    return [];
  }
}

function writeStored(uuids: readonly string[]) {
  try {
    if (uuids.length === 0) localStorage.removeItem(HOME_CARD_HIDDEN_STORAGE_KEY);
    else localStorage.setItem(HOME_CARD_HIDDEN_STORAGE_KEY, JSON.stringify(uuids));
  } catch {
    // 隐私模式写不进时只保留本次内存态。
  }
}

function snapshotFrom(uuids: readonly string[]): HomeCardHiddenSnapshot {
  if (uuids.length === 0) return EMPTY;
  return { uuids, hidden: new Set(uuids) };
}

function emit() {
  for (const listener of listeners) listener();
}

function ensureLoaded() {
  if (loaded || typeof localStorage === "undefined") return;
  loaded = true;
  snapshot = snapshotFrom(readStored());
}

function commit(uuids: readonly string[]) {
  snapshot = snapshotFrom(uuids);
  writeStored(snapshot.uuids);
  emit();
}

export function hideHomeCard(uuid: string) {
  ensureLoaded();
  const next = withHiddenUuid(snapshot.uuids, uuid);
  if (next === snapshot.uuids) return;
  commit(next);
}

export function showAllHomeCards() {
  ensureLoaded();
  if (snapshot.uuids.length === 0) return;
  commit(EMPTY_UUIDS);
}

let storageBound = false;

function bindStorage() {
  if (storageBound || typeof window === "undefined") return;
  storageBound = true;
  window.addEventListener("storage", (event) => {
    if (event.key !== HOME_CARD_HIDDEN_STORAGE_KEY && event.key !== null) return;
    loaded = true;
    snapshot = snapshotFrom(parseHomeCardHidden(event.newValue));
    emit();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  bindStorage();
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  ensureLoaded();
  return snapshot;
}

function getServerSnapshot() {
  return EMPTY;
}

/** 首页卡片的本机隐藏列表。只影响这台浏览器的首页卡片，不改主题设置。 */
export function useHomeCardHidden() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** 测试里换掉 localStorage 后重新读一遍。 */
export function reloadHomeCardHidden() {
  loaded = false;
  snapshot = EMPTY;
  ensureLoaded();
  emit();
}
