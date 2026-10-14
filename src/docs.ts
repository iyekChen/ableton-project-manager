import { getPreferenceValues } from "@raycast/api";
import fs from "node:fs";
import path from "node:path";

export type DocKind = "notes" | "lyrics";

type DocPreferences = {
  notesFolder?: string;
  lyricsFolder?: string;
  notesTemplateFile?: string;
  lyricsTemplateFile?: string;
};

// 没指定自定义文件夹时，文档存进项目文件夹，用固定名。
const FIXED_FILE_NAME: Record<DocKind, string> = {
  notes: "Notes.md",
  lyrics: "Lyrics.md",
};

// 自定义文件夹相同时，用后缀区分两类，避免互相覆盖。
const COLLISION_SUFFIX: Record<DocKind, string> = {
  notes: " @Notes",
  lyrics: " @Lyrics",
};

function prefs(): DocPreferences {
  return getPreferenceValues<DocPreferences>();
}

// 该类文档的自定义保存文件夹（选填）。留空 = 存进项目文件夹。
export function getDocFolder(kind: DocKind): string {
  const value = kind === "notes" ? prefs().notesFolder : prefs().lyricsFolder;
  return (value ?? "").trim();
}

function getTemplateFile(kind: DocKind): string {
  const value = kind === "notes" ? prefs().notesTemplateFile : prefs().lyricsTemplateFile;
  return (value ?? "").trim();
}

// 规范化路径，用于判断两个自定义文件夹是否指向同一处。
function normalizeFolder(folder: string): string {
  return folder ? path.resolve(folder).replace(/\/+$/, "").toLowerCase() : "";
}

// Notes 与 Lyrics 的自定义文件夹指向同一处时需要加后缀。
function customFoldersCollide(): boolean {
  const notes = normalizeFolder(getDocFolder("notes"));
  const lyrics = normalizeFolder(getDocFolder("lyrics"));
  return notes !== "" && notes === lyrics;
}

// 清洗文件名里的非法字符（含 Obsidian 禁用的 # ^ [ ] |）。保留 @。
function sanitizeFileName(name: string): string {
  return name.replace(/[/\\:*?"<>|#^[\]]/g, "-").trim();
}

// 解析某项目某类文档的目标 .md 路径，遵循三条命名规则。
export function docFilePath(project: { title: string; folderPath: string }, kind: DocKind): string {
  const folder = getDocFolder(kind);
  if (!folder) {
    // 规则 1：项目文件夹 + 固定名。
    return path.join(project.folderPath, FIXED_FILE_NAME[kind]);
  }
  const base = sanitizeFileName(project.title);
  // 规则 3：相同文件夹 → 带类型后缀；规则 2：不同文件夹 → 纯项目名。
  const fileName = customFoldersCollide() ? `${base}${COLLISION_SUFFIX[kind]}.md` : `${base}.md`;
  return path.join(folder, fileName);
}

// 替换模板占位符。
function renderTemplate(template: string, project: { title: string }): string {
  const today = new Date().toISOString().slice(0, 10);
  return template.replaceAll("{{title}}", project.title).replaceAll("{{date}}", today);
}

// 新建文件的初始内容：有模板文件就套模板，否则空。
function initialContent(project: { title: string }, kind: DocKind): string {
  const templateFile = getTemplateFile(kind);
  if (templateFile) {
    try {
      return renderTemplate(fs.readFileSync(templateFile, "utf8"), project);
    } catch {
      // 模板读取失败则退回空内容。
    }
  }
  return "";
}

// 去掉开头的 YAML frontmatter，用于在 Detail 里只渲染正文。
export function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

// 文件是否已存在。
export function docFileExists(project: { title: string; folderPath: string }, kind: DocKind): boolean {
  return fs.existsSync(docFilePath(project, kind));
}

// 读取原始内容（不存在返回空）。
export function readDocFile(project: { title: string; folderPath: string }, kind: DocKind): string {
  try {
    return fs.readFileSync(docFilePath(project, kind), "utf8");
  } catch {
    return "";
  }
}

// 确保文件存在（不存在就按模板创建），返回路径。供 Open 使用。
export function ensureDocFile(project: { title: string; folderPath: string }, kind: DocKind): string {
  const file = docFilePath(project, kind);
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, initialContent(project, kind), "utf8");
  }
  return file;
}

// 写入正文，但保留文件原有的 frontmatter（编辑笔记时用）。
export function writeDocBody(project: { title: string; folderPath: string }, kind: DocKind, body: string): void {
  const file = docFilePath(project, kind);
  let existing = "";
  try {
    existing = fs.readFileSync(file, "utf8");
  } catch {
    // 文件不存在 = 没有 frontmatter 可保留。
  }
  const match = existing.match(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  const frontmatter = match ? match[0] : "";
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, frontmatter + body, "utf8");
}

// 项目改名时，把自定义文件夹里的文档文件一并改名；默认存项目文件夹的随文件夹改名，无需处理。
export function renameDocFiles(oldTitle: string, newTitle: string): void {
  if (oldTitle === newTitle) return;
  (["notes", "lyrics"] as DocKind[]).forEach((kind) => {
    if (!getDocFolder(kind)) return;
    const oldPath = docFilePath({ title: oldTitle, folderPath: "" }, kind);
    const newPath = docFilePath({ title: newTitle, folderPath: "" }, kind);
    try {
      if (fs.existsSync(oldPath)) fs.renameSync(oldPath, newPath);
    } catch {
      // 忽略改名失败（文件不存在等）。
    }
  });
}
