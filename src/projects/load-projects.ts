import fs from "node:fs";
import path from "node:path";
import type { Project } from "./types";
import { countBounces, resolveBouncesFolder } from "./bounces";

export function loadProjects(projectsRoot: string): Project[] {
  const projects: Project[] = [];

  for (const folder of fs.readdirSync(projectsRoot)) {
    try {
      const folderPath = path.join(projectsRoot, folder);
      const stats = fs.statSync(folderPath);

      if (!stats.isDirectory()) {
        continue;
      }

      const setFiles = fs.readdirSync(folderPath).filter((file) => file.endsWith(".als"));

      if (setFiles.length === 0) {
        continue;
      }

      const latestSetModifiedAt = setFiles.reduce((latest, file) => {
        const setStats = fs.statSync(path.join(folderPath, file));
        return Math.max(latest, setStats.mtimeMs);
      }, 0);

      projects.push({
        id: folder,
        title: folder,
        folderPath,
        createdAt: stats.birthtimeMs,
        inode: stats.ino,
        modifiedAt: latestSetModifiedAt,
        stageId: null,
        genreIds: [],
        collectionIds: [],
        notes: "",
        pinned: false,
        pinOrder: null,
        setsCount: setFiles.length,
        bouncesCount: countBounces(resolveBouncesFolder(folderPath)),
        externalBounceFolders: [],
        externalBounceFiles: [],
      });
    } catch {
      // 跳过无法读取的条目
    }
  }

  return projects;
}
