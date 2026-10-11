import { getPreferenceValues } from "@raycast/api";
import fs from "node:fs";
import path from "node:path";

export const AUDIO_EXTENSIONS = new Set([".wav", ".aif", ".aiff", ".mp3", ".m4a", ".flac"]);

export type Bounce = {
  name: string;
  path: string;
  createdAt: number;
  modifiedAt: number;
  size: number;
};

/** 按后缀判断是否为音频文件。 */
export function isAudioFile(fileName: string): boolean {
  return AUDIO_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

/** 根据偏好里的 Bounces 子文件夹名，解析某个项目的 bounces 所在目录。 */
export function resolveBouncesFolder(projectPath: string): string {
  const folderName = (getPreferenceValues<{ bouncesFolderName?: string }>().bouncesFolderName ?? "").trim();
  return folderName ? path.join(projectPath, folderName) : projectPath;
}

/**
 * 列出某目录「顶层」的全部 bounce，不递归子文件夹。
 * statSync 会跟随 symlink，所以链接到外部文件夹的 bounce 也能读到。
 */
export function listBounces(folderPath: string): Bounce[] {
  let entries: string[];
  try {
    entries = fs.readdirSync(folderPath);
  } catch {
    return [];
  }

  const bounces: Bounce[] = [];
  for (const entry of entries) {
    if (!isAudioFile(entry)) continue;
    const fullPath = path.join(folderPath, entry);
    try {
      const stats = fs.statSync(fullPath); // follows symlinks
      if (!stats.isFile()) continue;
      bounces.push({
        name: entry,
        path: fullPath,
        createdAt: stats.birthtimeMs,
        modifiedAt: stats.mtimeMs,
        size: stats.size,
      });
    } catch {
      continue;
    }
  }
  return bounces;
}

/** 统计某目录下的 bounce 数量（仅按后缀，不读取文件状态）。 */
export function countBounces(folderPath: string): number {
  try {
    return fs.readdirSync(folderPath).filter(isAudioFile).length;
  } catch {
    return 0;
  }
}

/** 返回某目录下创建时间最新的 bounce 路径，没有则返回 null。 */
export function findLatestBounce(folderPath: string): string | null {
  let latestPath: string | null = null;
  let latestCreatedAt = Number.NEGATIVE_INFINITY;

  for (const bounce of listBounces(folderPath)) {
    if (bounce.createdAt > latestCreatedAt) {
      latestCreatedAt = bounce.createdAt;
      latestPath = bounce.path;
    }
  }

  return latestPath;
}
