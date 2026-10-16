import { LocalStorage } from "@raycast/api";
import { archiveDocFiles, restoreArchivedDoc, type ArchivedDoc } from "./docs";
import { getAllProjectMetadata, saveProjectMetadata, type ProjectMetadata } from "./project-metadata";
import { assignNumber, getProjectOrders, getTrackMap, nextNumber, setTrackMap } from "./collection-order";
import { assignRole, getProjectRoles, getRoleMap, setRoleMap } from "./collection-roles";
import { collectionTaxonomy } from "./taxonomies";
import type { Project } from "./projects/types";

const STORAGE_KEY = "deleted-projects";
// 与 Finder 的"30 天后从废纸篓中移除项目"对齐。过期只丢弃记录，归档的文档文件保留。
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

type DeletedRecord = {
  id: string;
  birthtimeMs: number; // 文件夹创建时间：用来区分"从废纸篓放回"和"新建了同名项目"
  deletedAt: number;
  metadata: ProjectMetadata | null;
  orders: Record<string, number>; // collectionId → 轨号
  roles: Record<string, string>; // collectionId → 角色
  docs: ArchivedDoc[];
};

async function getRecords(): Promise<DeletedRecord[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    const cutoff = Date.now() - RETENTION_MS;
    return Array.isArray(parsed) ? (parsed as DeletedRecord[]).filter((r) => r.deletedAt >= cutoff) : [];
  } catch {
    return [];
  }
}

async function saveRecords(records: DeletedRecord[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// 同名且创建时间一致才算"放回"：Put Back 只是把文件夹挪回原处，创建时间不变；同名新项目的创建时间是新的。
function isSameFolder(record: DeletedRecord, project: Pick<Project, "id" | "createdAt">): boolean {
  return record.id === project.id && Math.abs(record.birthtimeMs - project.createdAt) < 1;
}

/** 该文件夹（同名 + 同创建时间）是否已有删除记录，用于避免重复归档。 */
export async function hasDeletedRecord(entry: { id: string; birthtimeMs: number }): Promise<boolean> {
  const records = await getRecords();
  return records.some((r) => isSameFolder(r, { id: entry.id, createdAt: entry.birthtimeMs }));
}

/** 只保留 keep 返回 true 的记录（废纸篓被清空后提前作废用）。 */
export async function pruneDeletedRecords(
  keep: (record: { id: string; birthtimeMs: number }) => boolean,
): Promise<void> {
  const records = await getRecords();
  const kept = records.filter((record) => keep(record));
  if (kept.length !== records.length) await saveRecords(kept);
}

/** 项目移到废纸篓后、清理数据前调用：存下标签/合集轨号/角色，并把自定义文件夹里的文档移进 Deleted Projects/。 */
export async function archiveDeletedProject(project: Pick<Project, "id" | "title" | "createdAt">): Promise<void> {
  const store = await getAllProjectMetadata();
  const record: DeletedRecord = {
    id: project.id,
    birthtimeMs: project.createdAt,
    deletedAt: Date.now(),
    metadata: store[project.id] ?? null,
    orders: await getProjectOrders(project.id),
    roles: await getProjectRoles(project.id),
    docs: archiveDocFiles(project.title),
  };
  const others = (await getRecords()).filter((r) => !isSameFolder(r, project));
  await saveRecords([...others, record]);
}

// 还原元数据与映射。只往空位里写：期间若已有新数据（或合集已被删），以现状为准。
async function restoreData(record: DeletedRecord, existingCollections: Set<string>): Promise<void> {
  const store = await getAllProjectMetadata();
  if (record.metadata && !(record.id in store)) {
    await saveProjectMetadata(record.id, {
      ...record.metadata,
      collectionIds: (record.metadata.collectionIds ?? []).filter((id) => existingCollections.has(id)),
    });
  }

  for (const [collectionId, number] of Object.entries(record.orders)) {
    if (!existingCollections.has(collectionId)) continue;
    const map = await getTrackMap(collectionId);
    if (record.id in map) continue;
    // 原轨号已被别的曲目占用就排到末尾，避免重号。
    const taken = Object.values(map).includes(number);
    await setTrackMap(collectionId, assignNumber(map, record.id, taken ? nextNumber(map) : number));
  }

  for (const [collectionId, role] of Object.entries(record.roles)) {
    if (!existingCollections.has(collectionId)) continue;
    const map = await getRoleMap(collectionId);
    if (!(record.id in map)) await setRoleMap(collectionId, assignRole(map, record.id, role));
  }
}

export type RestoreResult = { restored: string[]; docConflicts: string[] };

/** 扫描到的项目里，若有从废纸篓放回的，还原其数据与文档。每次加载项目列表时调用。 */
export async function restorePutBackProjects(projects: Project[]): Promise<RestoreResult> {
  const result: RestoreResult = { restored: [], docConflicts: [] };
  const records = await getRecords();
  if (records.length === 0) return result;

  const remaining: DeletedRecord[] = [];
  let existingCollections: Set<string> | null = null;

  for (const record of records) {
    const project = projects.find((p) => isSameFolder(record, p));
    if (!project) {
      remaining.push(record);
      continue;
    }

    existingCollections ??= new Set((await collectionTaxonomy.get()).map((c) => c.id));
    await restoreData(record, existingCollections);

    const docStatuses = record.docs.map((doc) => restoreArchivedDoc(project, doc));
    if (docStatuses.includes("conflict")) result.docConflicts.push(project.title);
    result.restored.push(project.title);
  }

  if (remaining.length !== records.length) await saveRecords(remaining);
  return result;
}
