import { getPreferenceValues } from "@raycast/api";
import fs from "node:fs";
import path from "node:path";
import type { Project } from "./types";

const AUDIO_EXTENSIONS = new Set([".wav", ".aif", ".aiff", ".mp3", ".m4a", ".flac"]);

function countBounces(folderPath: string): number {
  try {
    return fs.readdirSync(folderPath).filter((file) => AUDIO_EXTENSIONS.has(path.extname(file).toLowerCase())).length;
  } catch {
    return 0;
  }
}

export function loadProjects(projectsRoot: string): Project[] {
  const projects: Project[] = [];

  const bouncesFolderName = (getPreferenceValues<{ bouncesFolderName?: string }>().bouncesFolderName ?? "").trim();

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

      const bouncesPath = bouncesFolderName ? path.join(folderPath, bouncesFolderName) : folderPath;

      projects.push({
        id: folder,
        title: folder,
        folderPath,
        createdAt: stats.birthtimeMs,
        modifiedAt: latestSetModifiedAt,
        stageId: null,
        genreIds: [],
        collectionIds: [],
        notes: "",
        pinned: false,
        pinOrder: null,
        setsCount: setFiles.length,
        bouncesCount: countBounces(bouncesPath),
      });
    } catch {
      // 跳过无法读取的条目
    }
  }

  return projects;
}
