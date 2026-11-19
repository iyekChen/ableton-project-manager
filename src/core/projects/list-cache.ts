import { Cache } from "@raycast/api";
import type { Project } from "./types";

// 项目列表的冷启动缓存：先显示上次读到的列表，扫描完再替换。
// 只存列表本身；Set 元数据另有缓存（project-file-cache）。

const CACHE_VERSION = 1;
const cache = new Cache({ namespace: "project-list-cache" });

type ProjectListPayload = {
  version: number;
  projects: Project[];
};

function cacheKey(projectsRoot: string): string {
  return `project-list-v1:${projectsRoot}`;
}

export function serializeProjectList(projects: Project[]): string {
  const payload: ProjectListPayload = { version: CACHE_VERSION, projects };
  return JSON.stringify(payload);
}

/** 解析缓存内容。空、JSON 损坏、版本不对、projects 不是数组都返回 undefined。 */
export function parseProjectList(raw: string | undefined): Project[] | undefined {
  if (!raw) return undefined;
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (typeof payload !== "object" || payload === null) return undefined;
  const { version, projects } = payload as Partial<ProjectListPayload>;
  if (version !== CACHE_VERSION) return undefined;
  if (!Array.isArray(projects)) return undefined;
  return projects as Project[];
}

export function readProjectListCache(projectsRoot: string): Project[] | undefined {
  return parseProjectList(cache.get(cacheKey(projectsRoot)));
}

/** 写缓存失败时静默忽略：缓存只是加速，不能影响列表显示。 */
export function writeProjectListCache(projectsRoot: string, projects: Project[]): void {
  try {
    cache.set(cacheKey(projectsRoot), serializeProjectList(projects));
  } catch {
    // 忽略
  }
}
