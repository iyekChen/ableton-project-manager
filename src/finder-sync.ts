import { LocalStorage } from "@raycast/api";
import type { Project } from "./projects/types";
import {
  diffSnapshots,
  isConfirmedInTrash,
  readTrashFolders,
  sameFolder,
  trashDirsFor,
  type SnapshotEntry,
} from "./project-snapshot";
import { deleteProjectMetadata, renameProjectMetadata } from "./project-metadata";
import { removeProjectFromAllOrders, renameProjectInAllOrders } from "./collection-order";
import { removeProjectFromAllRoles, renameProjectInAllRoles } from "./collection-roles";
import { renameDocFiles } from "./docs";
import { archiveDeletedProject, hasDeletedRecord, pruneDeletedRecords } from "./deleted-projects";

const SNAPSHOT_KEY = "project-snapshot";

async function readSnapshot(): Promise<SnapshotEntry[] | null> {
  const raw = await LocalStorage.getItem<string>(SNAPSHOT_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SnapshotEntry[]) : null;
  } catch {
    return null;
  }
}

export type FinderSyncResult = {
  renamed: number;
  archived: number;
  ambiguous: number;
  guardTripped: boolean;
  trashUnavailable: boolean;
};

/** 对比上次看到的项目清单，把在 Finder 里做的改名/删除补做一遍。
 *  改名：同一文件夹（创建时间 + inode）换了名字 → 迁移元数据、轨号、角色、文档名。
 *  删除：有完全磁盘访问权限时以废纸篓为准；没有时按"消失"推测（带外接盘保护）。
 *  歧义（多个候选）不自动处理。skipIds：正在由扩展自己执行 Move to Trash 的项目，已归档过。 */
export async function syncFinderChanges(
  projects: Project[],
  projectsRoot: string,
  skipIds: Set<string>,
): Promise<FinderSyncResult> {
  const current: SnapshotEntry[] = projects.map((p) => ({ id: p.id, birthtimeMs: p.createdAt, inode: p.inode }));
  const previous = await readSnapshot();
  const result: FinderSyncResult = {
    renamed: 0,
    archived: 0,
    ambiguous: 0,
    guardTripped: false,
    trashUnavailable: false,
  };

  if (previous) {
    const diff = diffSnapshots(previous, current);
    result.guardTripped = diff.guardTripped;
    result.ambiguous = diff.ambiguous.length;

    for (const { from, to } of diff.renamed) {
      await renameProjectMetadata(from.id, to.id);
      await renameProjectInAllOrders(from.id, to.id);
      await renameProjectInAllRoles(from.id, to.id);
      renameDocFiles(from.id, to.id);
      result.renamed++;
    }

    const trash = readTrashFolders(trashDirsFor(projectsRoot));
    if (!trash && diff.removed.length > 0) result.trashUnavailable = true;
    for (const entry of diff.removed) {
      if (skipIds.has(entry.id) || (await hasDeletedRecord(entry))) continue;
      // 只有能读到废纸篓、且确认该项目确实在废纸篓里，才按「删除」归档清理。
      // 读不到废纸篓（无完全磁盘访问权限），或旧快照缺 inode 无法可靠匹配时，一律不动数据，交给手动清理。
      if (!isConfirmedInTrash(entry, trash)) continue;
      await archiveDeletedProject({
        id: entry.id,
        title: entry.id,
        createdAt: entry.birthtimeMs,
        inode: entry.inode,
      });
      await deleteProjectMetadata(entry.id);
      await removeProjectFromAllOrders(entry.id);
      await removeProjectFromAllRoles(entry.id);
      result.archived++;
    }

    if (trash) {
      // 废纸篓被清空（或项目被彻底删除）后已无从放回，提前作废记录；归档的文档文件保留。
      await pruneDeletedRecords(
        (record) =>
          trash.some((folder) => sameFolder(folder, record)) ||
          current.some((c) => c.id === record.id && sameFolder(c, record)),
      );
    }
  }

  // 保护触发时不覆盖旧清单，等磁盘接回来后照常对比。
  if (!result.guardTripped) await LocalStorage.setItem(SNAPSHOT_KEY, JSON.stringify(current));
  return result;
}
