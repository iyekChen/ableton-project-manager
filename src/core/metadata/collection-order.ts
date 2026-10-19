import { LocalStorage } from "@raycast/api";

const KEY_PREFIX = "collection-order:";

/** 每个 collection 存一张 { 项目id -> 轨号 } 映射 */
export type TrackMap = Record<string, number>;

/** 读取某个 collection 的轨号映射 */
export async function getTrackMap(collectionId: string): Promise<TrackMap> {
  const raw = await LocalStorage.getItem<string>(KEY_PREFIX + collectionId);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: TrackMap = {};
    for (const [id, n] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof n === "number" && Number.isFinite(n) && n >= 1) out[id] = Math.floor(n);
    }
    return out;
  } catch {
    return {};
  }
}

/** 保存某个 collection 的轨号映射 */
export async function setTrackMap(collectionId: string, map: TrackMap): Promise<void> {
  await LocalStorage.setItem(KEY_PREFIX + collectionId, JSON.stringify(map));
}

/** 删除某个 collection 的轨号映射（合集被删时清理） */
export async function removeTrackMap(collectionId: string): Promise<void> {
  await LocalStorage.removeItem(KEY_PREFIX + collectionId);
}

/** 从所有 collection 的轨号映射里移除某项目（项目被删时清理） */
export async function removeProjectFromAllOrders(projectId: string): Promise<void> {
  const all = await LocalStorage.allItems();
  for (const key of Object.keys(all)) {
    if (!key.startsWith(KEY_PREFIX)) continue;
    const collectionId = key.slice(KEY_PREFIX.length);
    const map = await getTrackMap(collectionId);
    if (projectId in map) {
      delete map[projectId];
      await setTrackMap(collectionId, map);
    }
  }
}

/** 把所有 collection 轨号映射里的 oldId 改成 newId（项目改名时迁移，保留原轨号） */
export async function renameProjectInAllOrders(oldId: string, newId: string): Promise<void> {
  if (oldId === newId) return;
  const all = await LocalStorage.allItems();
  for (const key of Object.keys(all)) {
    if (!key.startsWith(KEY_PREFIX)) continue;
    const collectionId = key.slice(KEY_PREFIX.length);
    const map = await getTrackMap(collectionId);
    if (!(oldId in map)) continue;
    // newId 下若有残留（同名旧项目的孤儿数据），以迁移过来的值为准。
    map[newId] = map[oldId];
    delete map[oldId];
    await setTrackMap(collectionId, map);
  }
}

/** 收集某项目在各 collection 里的轨号 { collectionId -> 轨号 }（删项目时存档用） */
export async function getProjectOrders(projectId: string): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const all = await LocalStorage.allItems();
  for (const key of Object.keys(all)) {
    if (!key.startsWith(KEY_PREFIX)) continue;
    const collectionId = key.slice(KEY_PREFIX.length);
    const map = await getTrackMap(collectionId);
    if (projectId in map) out[collectionId] = map[projectId];
  }
  return out;
}

/** 给某项目设轨号(n>=1);返回新映射 */ export function assignNumber(map: TrackMap, id: string, n: number): TrackMap {
  return { ...map, [id]: Math.floor(n) };
}

/** 清掉某项目的轨号;返回新映射 */
export function removeNumber(map: TrackMap, id: string): TrackMap {
  const next = { ...map };
  delete next[id];
  return next;
}

/** 对调两个项目的轨号;返回新映射 */
export function swapNumbers(map: TrackMap, a: string, b: string): TrackMap {
  const next = { ...map };
  const tmp = next[a];
  next[a] = next[b];
  next[b] = tmp;
  return next;
}

/** 当前最大号 + 1(空则为 1) */
export function nextNumber(map: TrackMap): number {
  const values = Object.values(map);
  return values.length === 0 ? 1 : Math.max(...values) + 1;
}
