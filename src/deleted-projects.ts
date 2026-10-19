import { LocalStorage } from "@raycast/api";
import { isCorruptJson, StorageUnreadableError } from "./storage";
import { archiveDocFiles, restoreArchivedDoc, type ArchivedDoc } from "@/core/docs/docs";
import { getAllProjectMetadata, saveProjectMetadata, type ProjectMetadata } from "@/core/metadata/project-metadata";
import { assignNumber, getProjectOrders, getTrackMap, nextNumber, setTrackMap } from "@/core/metadata/collection-order";
import { assignRole, getProjectRoles, getRoleMap, setRoleMap } from "@/core/metadata/collection-roles";
import { collectionTaxonomy } from "@/core/metadata/taxonomies";
import { sameFolder, type FolderIdentity } from "./project-snapshot";
import type { Project } from "./projects/types";

const STORAGE_KEY = "deleted-projects";
// 与 Finder 的"30 天后从废纸篓中移除项目"对齐。过期只丢弃记录，归档的文档文件保留。
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

type DeletedRecord = FolderIdentity & {
  id: string;
  deletedAt: number;
  metadata: ProjectMetadata | null;
  orders: Record<string, number>; // collectionId → 轨号
  roles: Record<string, string>; // collectionId → 角色
  docs: ArchivedDoc[];
  dataRestored?: boolean; // 已放回、数据已还原，只剩文档在等文件夹可用后重试
};

/** 用来匹配记录的文件夹信息：名字 + 创建时间 + inode（旧数据可能没有）。 */
type FolderRef = { id: string; createdAt: number; inode?: number };

async function getRecords(): Promise<DeletedRecord[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    const cutoff = Date.now() - RETENTION_MS;
    return Array.isArray(parsed) ? (parsed as DeletedRecord[]).filter((r) => r.deletedAt >= cutoff) : [];
  } catch {
    // 损坏：读取时宽容返回空；写入由 saveRecords 拦截，不覆盖。
    return [];
  }
}

async function saveRecords(records: DeletedRecord[]): Promise<void> {
  const existing = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (isCorruptJson(existing)) {
    // 损坏的删除记录仍可能可恢复，绝不覆盖。
    throw new StorageUnreadableError();
  }
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// 同名且是同一个文件夹（创建时间 + inode）才算"放回"：Put Back 只是挪回原处；同名新项目或复制品都对不上。
function isSameFolder(record: DeletedRecord, folder: FolderRef): boolean {
  return record.id === folder.id && sameFolder(record, { birthtimeMs: folder.createdAt, inode: folder.inode });
}

/** 该文件夹是否已有删除记录，用于避免重复归档。 */
export async function hasDeletedRecord(entry: { id: string; birthtimeMs: number; inode?: number }): Promise<boolean> {
  const records = await getRecords();
  return records.some((r) => isSameFolder(r, { id: entry.id, createdAt: entry.birthtimeMs, inode: entry.inode }));
}

/** 只保留 keep 返回 true 的记录（废纸篓被清空后提前作废用）。 */
export async function pruneDeletedRecords(
  keep: (record: { id: string; birthtimeMs: number; inode?: number }) => boolean,
): Promise<void> {
  const records = await getRecords();
  const kept = records.filter((record) => keep(record));
  if (kept.length !== records.length) await saveRecords(kept);
}

/** 项目移到废纸篓后、清理数据前调用：存下标签/合集轨号/角色，并把自定义文件夹里的文档移进 Deleted Projects/。 */
export async function archiveDeletedProject(project: FolderRef & { title: string }): Promise<void> {
  const store = await getAllProjectMetadata();
  const records = await getRecords();
  const previous = records.find((r) => isSameFolder(r, project));
  const record: DeletedRecord = {
    id: project.id,
    birthtimeMs: project.createdAt,
    inode: project.inode,
    deletedAt: Date.now(),
    metadata: store[project.id] ?? null,
    orders: await getProjectOrders(project.id),
    roles: await getProjectRoles(project.id),
    // 上次放回时还没还原成功的文档，继续跟着这条记录。
    docs: [...archiveDocFiles(project.title), ...(previous?.docs ?? [])],
  };
  await saveRecords([...records.filter((r) => r !== previous), record]);
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

/** 扫描到的项目里，若有从废纸篓放回的，还原其数据与文档。每次加载项目列表时调用。
 *  文档文件夹暂时不可用时，数据照常还原，记录里只留下待还原的文档，下次加载再试。 */
export async function restorePutBackProjects(projects: Project[]): Promise<RestoreResult> {
  const result: RestoreResult = { restored: [], docConflicts: [] };
  const records = await getRecords();
  if (records.length === 0) return result;

  const next: DeletedRecord[] = [];
  let changed = false;
  let existingCollections: Set<string> | null = null;

  for (const record of records) {
    const project = projects.find((p) => isSameFolder(record, p));
    if (!project) {
      next.push(record);
      continue;
    }
    changed = true;

    if (!record.dataRestored) {
      existingCollections ??= new Set((await collectionTaxonomy.get()).map((c) => c.id));
      await restoreData(record, existingCollections);
      result.restored.push(project.title);
    }

    const pendingDocs: ArchivedDoc[] = [];
    for (const doc of record.docs) {
      const status = restoreArchivedDoc(project, doc);
      if (status === "unavailable") pendingDocs.push(doc);
      if (status === "conflict" && !result.docConflicts.includes(project.title)) {
        result.docConflicts.push(project.title);
      }
    }

    if (pendingDocs.length > 0) {
      // 数据已还原、清空，下次重试只处理文档，不会把用户之后的改动改回去。
      next.push({ ...record, dataRestored: true, metadata: null, orders: {}, roles: {}, docs: pendingDocs });
    }
  }

  if (changed) await saveRecords(next);
  return result;
}
