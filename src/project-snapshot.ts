import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** 项目清单里的一项：名字（= 文件夹名 = 项目 id）+ 文件夹创建时间。 */
export type SnapshotEntry = { id: string; birthtimeMs: number };

export type SnapshotDiff = {
  renamed: { from: SnapshotEntry; to: SnapshotEntry }[];
  removed: SnapshotEntry[];
  guardTripped: boolean;
};

function sameBirth(a: SnapshotEntry, b: SnapshotEntry): boolean {
  return Math.abs(a.birthtimeMs - b.birthtimeMs) < 1;
}

// 对比前后两份清单：同创建时间换了名字 = 改名；消失且没有对应新名字 = 移除。
export function diffSnapshots(previous: SnapshotEntry[], current: SnapshotEntry[]): SnapshotDiff {
  const currentIds = new Set(current.map((e) => e.id));
  const previousIds = new Set(previous.map((e) => e.id));
  const appeared = current.filter((e) => !previousIds.has(e.id));
  const renamed: SnapshotDiff["renamed"] = [];
  const removed: SnapshotEntry[] = [];

  for (const entry of previous) {
    if (currentIds.has(entry.id)) continue;
    const index = appeared.findIndex((candidate) => sameBirth(candidate, entry));
    if (index >= 0) {
      renamed.push({ from: entry, to: appeared[index] });
      appeared.splice(index, 1);
    } else {
      removed.push(entry);
    }
  }

  // 外接盘未挂载、根目录被整体移走等：项目一下子全没了，或一次消失过半（且多于 3 个），多半不是真删除，不处理。
  const guardTripped =
    removed.length > 0 &&
    ((current.length === 0 && previous.length > 0) || (removed.length > 3 && removed.length > previous.length / 2));
  return { renamed, removed: guardTripped ? [] : removed, guardTripped };
}

// 项目所在卷的废纸篓：系统盘为 ~/.Trash；外接盘为 /Volumes/<盘名>/.Trashes/<uid>。第一个永远是 ~/.Trash。
export function trashDirsFor(projectsRoot: string): string[] {
  const dirs = [path.join(os.homedir(), ".Trash")];
  const volume = path.resolve(projectsRoot).match(/^\/Volumes\/[^/]+/);
  if (volume && typeof process.getuid === "function") {
    dirs.push(path.join(volume[0], ".Trashes", String(process.getuid())));
  }
  return dirs;
}

/** 读出废纸篓里各文件夹的创建时间（取整毫秒）。Finder 遇同名会给文件夹改名，所以只认创建时间。
 *  ~/.Trash 不可读（没有完全磁盘访问权限）时返回 null，交给推测模式。 */
export function readTrashBirthtimes(trashDirs: string[]): Set<number> | null {
  const births = new Set<number>();
  for (const [index, dir] of trashDirs.entries()) {
    let names: string[];
    try {
      names = fs.readdirSync(dir);
    } catch (error) {
      // 目录不存在 = 空废纸篓；~/.Trash 读不了（EPERM 等）= 没有权限。
      if (index === 0 && (error as NodeJS.ErrnoException)?.code !== "ENOENT") return null;
      continue;
    }
    for (const name of names) {
      try {
        const stats = fs.statSync(path.join(dir, name));
        if (stats.isDirectory()) births.add(Math.floor(stats.birthtimeMs));
      } catch {
        // 读不了的条目跳过。
      }
    }
  }
  return births;
}
