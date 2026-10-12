import fs from "node:fs";
import path from "node:path";
import type { Project } from "./types";
import { findLatestBounce, resolveBouncesFolder } from "./bounces";
import { analyzeAudio } from "./audio-analysis";
import {
  audioFileSignature,
  cacheAudioAnalysis,
  getCachedAudioAnalysisEntry,
  loadPersistentAudioAnalysisCache,
} from "./audio-cache";
import { getAlsMetadata } from "../als-metadata";
import {
  cacheAlsMetadata,
  fileSignature,
  getCachedAlsMetadataEntry,
  loadPersistentAlsMetadataCache,
} from "./als-cache";
import type { CachedAlsMetadata } from "./als-cache";

export type TrackInfo = {
  duration: number | null; // 秒，来自最新 bounce
  rms: number | null; // 0..1，能量近似
  bpm: number | null;
  key: string | null;
  timeSignature: string | null;
};

/** 找项目文件夹里最近修改的 .als */
function latestAlsFile(folderPath: string): string | null {
  let entries: string[];
  try {
    entries = fs.readdirSync(folderPath);
  } catch {
    return null;
  }

  let latestPath: string | null = null;
  let latestMtime = Number.NEGATIVE_INFINITY;

  for (const entry of entries) {
    if (!entry.endsWith(".als")) continue;
    const full = path.join(folderPath, entry);
    try {
      const stats = fs.statSync(full);
      if (!stats.isFile()) continue;
      if (stats.mtimeMs > latestMtime) {
        latestMtime = stats.mtimeMs;
        latestPath = full;
      }
    } catch {
      continue;
    }
  }

  return latestPath;
}

async function loadAudioPart(project: Project): Promise<{ duration: number | null; rms: number | null }> {
  const bouncePath = findLatestBounce(resolveBouncesFolder(project.folderPath));
  if (!bouncePath) return { duration: null, rms: null };

  await loadPersistentAudioAnalysisCache();

  let signature: string;
  try {
    signature = audioFileSignature(fs.statSync(bouncePath));
  } catch {
    return { duration: null, rms: null };
  }

  const cached = getCachedAudioAnalysisEntry(bouncePath);
  if (cached && cached.signature === signature) {
    return { duration: cached.analysis.duration, rms: cached.analysis.rms };
  }

  try {
    const analysis = await analyzeAudio(bouncePath);
    try {
      if (audioFileSignature(fs.statSync(bouncePath)) === signature) {
        cacheAudioAnalysis(bouncePath, signature, analysis);
      }
    } catch {
      // 缓存校验失败不影响返回结果
    }
    return { duration: analysis.duration, rms: analysis.rms };
  } catch (error) {
    console.error(`[Ableton Session Manager] Failed to analyze bounce: ${bouncePath}`, error);
    return { duration: null, rms: null };
  }
}

async function loadAlsPart(
  project: Project,
): Promise<{ bpm: number | null; key: string | null; timeSignature: string | null }> {
  const alsPath = latestAlsFile(project.folderPath);
  if (!alsPath) return { bpm: null, key: null, timeSignature: null };

  await loadPersistentAlsMetadataCache();

  let signature: string;
  try {
    signature = fileSignature(fs.statSync(alsPath));
  } catch {
    return { bpm: null, key: null, timeSignature: null };
  }

  const cached = getCachedAlsMetadataEntry(alsPath);
  if (cached && cached.signature === signature) {
    return { bpm: cached.metadata.bpm, key: cached.metadata.key, timeSignature: cached.metadata.timeSignature };
  }

  try {
    const metadata = await getAlsMetadata(alsPath);
    const normalized: CachedAlsMetadata = {
      bpm: metadata.bpm,
      timeSignature: metadata.timeSignature,
      key: metadata.inKey === false ? null : metadata.key,
    };
    try {
      if (fileSignature(fs.statSync(alsPath)) === signature) {
        cacheAlsMetadata(alsPath, signature, normalized);
      }
    } catch {
      // 缓存校验失败不影响返回结果
    }
    return { bpm: normalized.bpm, key: normalized.key, timeSignature: normalized.timeSignature };
  } catch (error) {
    console.error(`[Ableton Session Manager] Failed to parse ALS: ${alsPath}`, error);
    return { bpm: null, key: null, timeSignature: null };
  }
}

/** 给一个项目加载它的 TrackInfo（最新 bounce + 最近 .als），全部走缓存。 */
export async function loadTrackInfo(project: Project): Promise<TrackInfo> {
  const [audio, als] = await Promise.all([loadAudioPart(project), loadAlsPart(project)]);
  return {
    duration: audio.duration,
    rms: audio.rms,
    bpm: als.bpm,
    key: als.key,
    timeSignature: als.timeSignature,
  };
}

/** 批量加载：限并发、可取消、每首算完即回调。 */
export async function loadTrackInfos(
  projects: Project[],
  onResult: (projectId: string, info: TrackInfo) => void,
  shouldCancel: () => boolean,
  concurrency = 3,
): Promise<void> {
  let nextIndex = 0;

  async function worker() {
    while (!shouldCancel()) {
      const index = nextIndex++;
      if (index >= projects.length) return;

      const project = projects[index];
      const info = await loadTrackInfo(project);

      if (shouldCancel()) return;
      onResult(project.id, info);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, projects.length) }, () => worker()));
}

/** 把 rms 按本专辑 min/max 线性映射到 1–5 档。 */
export function energyLevel(rms: number, min: number, max: number): number {
  if (!(max > min)) return 3;
  const level = Math.round(1 + ((rms - min) / (max - min)) * 4);
  return Math.max(1, Math.min(5, level));
}
