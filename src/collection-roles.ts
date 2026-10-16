import { LocalStorage } from "@raycast/api";

const KEY_PREFIX = "collection-roles:";

/** 每个 collection 存一张 { 项目id -> 角色 } 映射；角色只在该 collection 内生效 */
export type RoleMap = Record<string, string>;

/** 读取某个 collection 的角色映射 */
export async function getRoleMap(collectionId: string): Promise<RoleMap> {
  const raw = await LocalStorage.getItem<string>(KEY_PREFIX + collectionId);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: RoleMap = {};
    for (const [id, role] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof role === "string" && role.trim() !== "") out[id] = role;
    }
    return out;
  } catch {
    return {};
  }
}

/** 保存某个 collection 的角色映射 */
export async function setRoleMap(collectionId: string, map: RoleMap): Promise<void> {
  await LocalStorage.setItem(KEY_PREFIX + collectionId, JSON.stringify(map));
}

/** 删除某个 collection 的角色映射（合集被删时清理） */
export async function removeRoleMap(collectionId: string): Promise<void> {
  await LocalStorage.removeItem(KEY_PREFIX + collectionId);
}

/** 从所有 collection 的角色映射里移除某项目（项目被删时清理） */
export async function removeProjectFromAllRoles(projectId: string): Promise<void> {
  const all = await LocalStorage.allItems();
  for (const key of Object.keys(all)) {
    if (!key.startsWith(KEY_PREFIX)) continue;
    const collectionId = key.slice(KEY_PREFIX.length);
    const map = await getRoleMap(collectionId);
    if (projectId in map) {
      delete map[projectId];
      await setRoleMap(collectionId, map);
    }
  }
}

/** 把所有 collection 角色映射里的 oldId 改成 newId（项目改名时迁移，保留原角色） */
export async function renameProjectInAllRoles(oldId: string, newId: string): Promise<void> {
  if (oldId === newId) return;
  const all = await LocalStorage.allItems();
  for (const key of Object.keys(all)) {
    if (!key.startsWith(KEY_PREFIX)) continue;
    const collectionId = key.slice(KEY_PREFIX.length);
    const map = await getRoleMap(collectionId);
    if (!(oldId in map)) continue;
    // newId 下若有残留（同名旧项目的孤儿数据），以迁移过来的值为准。
    map[newId] = map[oldId];
    delete map[oldId];
    await setRoleMap(collectionId, map);
  }
}

/** 收集某项目在各 collection 里的角色 { collectionId -> 角色 }（删项目时存档用） */
export async function getProjectRoles(projectId: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const all = await LocalStorage.allItems();
  for (const key of Object.keys(all)) {
    if (!key.startsWith(KEY_PREFIX)) continue;
    const collectionId = key.slice(KEY_PREFIX.length);
    const map = await getRoleMap(collectionId);
    if (projectId in map) out[collectionId] = map[projectId];
  }
  return out;
}

/** 给某项目设角色;返回新映射 */ export function assignRole(map: RoleMap, id: string, role: string): RoleMap {
  return { ...map, [id]: role };
}

/** 清掉某项目的角色;返回新映射 */
export function clearRole(map: RoleMap, id: string): RoleMap {
  const next = { ...map };
  delete next[id];
  return next;
}

/** 把所有 collection 里值为 oldName 的角色改成 newName（Role 重命名时同步） */
export async function renameRoleEverywhere(oldName: string, newName: string): Promise<void> {
  if (oldName === newName) return;
  const all = await LocalStorage.allItems();
  for (const key of Object.keys(all)) {
    if (!key.startsWith(KEY_PREFIX)) continue;
    const collectionId = key.slice(KEY_PREFIX.length);
    const map = await getRoleMap(collectionId);
    let changed = false;
    for (const [id, role] of Object.entries(map)) {
      if (role === oldName) {
        map[id] = newName;
        changed = true;
      }
    }
    if (changed) await setRoleMap(collectionId, map);
  }
}

/** 从所有 collection 里移除值为 name 的角色（Role 删除时同步） */
export async function deleteRoleEverywhere(name: string): Promise<void> {
  const all = await LocalStorage.allItems();
  for (const key of Object.keys(all)) {
    if (!key.startsWith(KEY_PREFIX)) continue;
    const collectionId = key.slice(KEY_PREFIX.length);
    const map = await getRoleMap(collectionId);
    let changed = false;
    for (const [id, role] of Object.entries(map)) {
      if (role === name) {
        delete map[id];
        changed = true;
      }
    }
    if (changed) await setRoleMap(collectionId, map);
  }
}
