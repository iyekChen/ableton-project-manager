import { LocalStorage } from "@raycast/api";

const STORAGE_KEY = "collection-pins";

// 读取被 Pin 的 collection id 列表。
export async function getPinnedCollections(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

async function setPinnedCollections(ids: string[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

// 切换某 collection 的 Pin 状态，返回更新后的列表。
export async function togglePinnedCollection(id: string): Promise<string[]> {
  const current = await getPinnedCollections();
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  await setPinnedCollections(next);
  return next;
}

// 从置顶列表移除某 collection（合集被删时清理），返回更新后的列表。
export async function removePinnedCollection(id: string): Promise<string[]> {
  const current = await getPinnedCollections();
  if (!current.includes(id)) return current;
  const next = current.filter((x) => x !== id);
  await setPinnedCollections(next);
  return next;
}

// 在置顶列表内上/下移一位（到边界则不动）。
export async function movePinnedCollection(id: string, direction: "up" | "down"): Promise<string[]> {
  const current = await getPinnedCollections();
  const index = current.indexOf(id);
  if (index === -1) return current;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= current.length) return current;
  const next = [...current];
  [next[index], next[target]] = [next[target], next[index]];
  await setPinnedCollections(next);
  return next;
}
