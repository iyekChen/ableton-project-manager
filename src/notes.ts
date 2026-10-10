import { getPreferenceValues } from "@raycast/api";
import fs from "node:fs";
import path from "node:path";

// Notes Folder 偏好(选填)。留空 = 笔记存在扩展里;填了 = 存成该文件夹下的 <项目名>.md。
export function getNotesFolder(): string {
  return (getPreferenceValues<{ notesFolder?: string }>().notesFolder ?? "").trim();
}

export function noteFilePath(projectId: string): string | null {
  const folder = getNotesFolder();
  return folder ? path.join(folder, `${projectId}.md`) : null;
}

export function readNoteFile(projectId: string): string {
  const file = noteFilePath(projectId);
  if (!file) return "";
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

export function writeNoteFile(projectId: string, text: string): void {
  const file = noteFilePath(projectId);
  if (!file) return;
  fs.writeFileSync(file, text, "utf8");
}

export function renameNoteFile(oldId: string, newId: string): void {
  const folder = getNotesFolder();
  if (!folder || oldId === newId) return;

  const oldFile = path.join(folder, `${oldId}.md`);
  const newFile = path.join(folder, `${newId}.md`);

  try {
    if (fs.existsSync(oldFile)) {
      fs.renameSync(oldFile, newFile);
    }
  } catch {
    // 忽略改名失败(文件不存在等)
  }
}
