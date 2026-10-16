import { LocalStorage } from "@raycast/api";
import type { Project } from "./projects/types";
import { diffSnapshots, readTrashBirthtimes, trashDirsFor, type SnapshotEntry } from "./project-snapshot";
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

export type FinderSyncResult = { renamed: number; archived: number; guardTripped: boolean };

/** 对比上次看到的项目清单，把在 Finder 里做的改名/删除补做一遍。
 *  改名：同创建时间换了名字 → 迁移元数据、轨号、角色、文档名。
 *  删除：有完全磁盘访问权限时以废纸篓为准；没有时按"消失"推测（带外接盘保护）。
 *  skipIds：正在由扩展自己执行 Move to Trash 的项目，已归档过，不重复处理。 */
export async function syncFinderChanges(
  projects: Project[],
  projectsRoot: string,
  skipIds: Set<string>,
): Promise<FinderSyncResult> {
  const current: SnapshotEntry[] = projects.map((p) => ({ id: p.id, birthtimeMs: p.createdAt }));
  const previous = await readSnapshot();
  const result: FinderSyncResult = { renamed: 0, archived: 0, guardTripped: false };

  if (previous) {
    const diff = diffSnapshots(previous, current);
    result.guardTripped = diff.guardTripped;

    for (const { from, to } of diff.renamed) {
      await renameProjectMetadata(from.id, to.id);
      await renameProjectInAllOrders(from.id, to.id);
      await renameProjectInAllRoles(from.id, to.id);
      renameDocFiles(from.id, to.id);
      result.renamed++;
    }

    const trash = readTrashBirthtimes(trashDirsFor(projectsRoot));
    for (const entry of diff.removed) {
      if (skipIds.has(entry.id) || (await hasDeletedRecord(entry))) continue;
      // 有权限时：不在废纸篓 = 被移走而非删除，保留数据等它回来。
      if (trash && !trash.has(Math.floor(entry.birthtimeMs))) continue;
      await archiveDeletedProject({ id: entry.id, title: entry.id, createdAt: entry.birthtimeMs });
      await deleteProjectMetadata(entry.id);
      await removeProjectFromAllOrders(entry.id);
      await removeProjectFromAllRoles(entry.id);
      result.archived++;
    }

    if (trash) {
      // 废纸篓被清空（或项目被彻底删除）后已无从放回，提前作废记录；归档的文档文件保留。
      await pruneDeletedRecords(
        (record) =>
          trash.has(Math.floor(record.birthtimeMs)) ||
          current.some((c) => c.id === record.id && Math.abs(c.birthtimeMs - record.birthtimeMs) < 1),
      );
    }
  }

  // 保护触发时不覆盖旧清单，等磁盘接回来后照常对比。
  if (!result.guardTripped) await LocalStorage.setItem(SNAPSHOT_KEY, JSON.stringify(current));
  return result;
}
