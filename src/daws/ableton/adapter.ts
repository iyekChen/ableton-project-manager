import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getAlsMetadata } from "./als-metadata";
import type { DawAdapter, DawSet } from "../types";

/** Ableton 的 Set 文件后缀。 */
export const SET_EXTENSION = ".als";

/** Ableton Live 适配器：项目是一个文件夹，里面每个 .als 文件是一个 Set，元数据来自压缩的 ALS XML。 */
export const abletonAdapter: DawAdapter = {
  id: "ableton",
  appNameMatch: "ableton live",

  // 文件夹名就是 id，不需要换算。
  projectIdForEntry: (entryName) => entryName,
  entryNameFor: (title) => title,

  detectProject(entryPath, entryName) {
    try {
      if (!fs.statSync(entryPath).isDirectory()) return null;
    } catch {
      return null;
    }
    return { id: entryName, folderPath: entryPath, kind: "folder" };
  },

  listSets({ folderPath }) {
    let entries: string[];
    try {
      entries = fs.readdirSync(folderPath);
    } catch {
      return [];
    }

    const sets: DawSet[] = [];
    for (const entry of entries) {
      if (!entry.endsWith(SET_EXTENSION)) continue;
      const file = path.join(folderPath, entry);
      try {
        const stats = fs.statSync(file);
        if (!stats.isFile()) continue;
        sets.push({
          name: path.basename(entry, SET_EXTENSION),
          path: file,
          metadataFile: file,
          createdAt: stats.birthtimeMs,
          modifiedAt: stats.mtimeMs,
        });
      } catch {
        continue;
      }
    }
    return sets;
  },

  async parseSet(set) {
    const metadata = await getAlsMetadata(set.metadataFile);
    return {
      bpm: metadata.bpm,
      timeSignature: metadata.timeSignature,
      // inKey=false 表示工程未启用音阶，此时调性无意义，归一化为 null。
      key: metadata.inKey === false ? null : metadata.key,
    };
  },

  // Live 自己的模板位置。
  defaultTemplatesFolder: () => path.join(os.homedir(), "Music", "Ableton", "User Library", "Templates"),

  // 模板就是一个 .als 文件。
  isTemplate(entryPath, entryName) {
    if (!entryName.endsWith(SET_EXTENSION)) return false;
    try {
      return fs.statSync(entryPath).isFile();
    } catch {
      return false;
    }
  },

  createFromTemplate(templatePath, projectsRoot, name) {
    const target = path.join(projectsRoot, abletonAdapter.entryNameFor(name, "folder"));
    // 目标已存在时报错，不覆盖。
    if (fs.existsSync(target)) {
      const error = new Error(`Target already exists: ${target}`) as NodeJS.ErrnoException;
      error.code = "EEXIST";
      throw error;
    }
    // 项目是文件夹，Set 是里面的 .als：模板复制成 <名字>.als。
    fs.mkdirSync(target);
    fs.copyFileSync(templatePath, path.join(target, `${name}${SET_EXTENSION}`));
    return target;
  },
};
