import { getPreferenceValues } from "@raycast/api";
import { createHash } from "node:crypto";
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

// 文件名里的非法字符（含 Windows 非法字符与 Obsidian 禁用的 # ^ [ ] |）。保留 @。
const ILLEGAL_FILE_CHARS = /[/\\:*?"<>|#^[\]]/g;

// 清洗文件名里的非法字符。
function sanitizeFileName(name: string): string {
  return name.replace(ILLEGAL_FILE_CHARS, "-").trim();
}

// 文档文件的基础名：清洗没改动名字时就用原名；改动了则追加原名的短哈希，
// 让 Song?A 与 Song-A 落到不同文件。哈希只取决于原名，同一名字永远得到同一路径。
function docBaseName(title: string): string {
  const base = sanitizeFileName(title);
  if (base === title) return base;
  const hash = createHash("sha1").update(title).digest("hex").slice(0, 6);
  return `${base} ~${hash}`;
}

// 设了自定义文档文件夹时，返回名字里会被替换掉的字符（去重），供表单提示；否则返回空。
export function alteredDocChars(title: string): string[] {
  if (!getDocFolder("notes") && !getDocFolder("lyrics")) return [];
  return [...new Set(title.match(ILLEGAL_FILE_CHARS) ?? [])];
}
// 解析某项目某类文档的目标 .md 路径，遵循三条命名规则。
export function docFilePath(project: { title: string; folderPath: string }, kind: DocKind): string {
  const folder = getDocFolder(kind);
  if (!folder) {
    // 规则 1：项目文件夹 + 固定名。
    return path.join(project.folderPath, FIXED_FILE_NAME[kind]);
  }
  const base = docBaseName(project.title);
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

export type DocRenameResult = { conflicts: DocKind[]; failures: DocKind[] };

// 项目改名时，把自定义文件夹里的文档文件一并改名；默认存项目文件夹的随文件夹改名，无需处理。
// 用 link + unlink 做"原子不覆盖"改名：目标已存在时绝不覆盖（抛 EEXIST），避免丢失他人文档。
// 返回每类文档的冲突/失败，交由调用方如实提示用户。
export function renameDocFiles(oldTitle: string, newTitle: string): DocRenameResult {
  const result: DocRenameResult = { conflicts: [], failures: [] };
  if (oldTitle === newTitle) return result;

  (["notes", "lyrics"] as DocKind[]).forEach((kind) => {
    if (!getDocFolder(kind)) return;
    const oldPath = docFilePath({ title: oldTitle, folderPath: "" }, kind);
    const newPath = docFilePath({ title: newTitle, folderPath: "" }, kind);
    if (!fs.existsSync(oldPath)) return; // 没有源文件，无需改名

    try {
      fs.linkSync(oldPath, newPath); // 原子不覆盖：目标存在则抛 EEXIST
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "EEXIST") {
        result.conflicts.push(kind);
      } else {
        result.failures.push(kind);
      }
      return;
    }

    try {
      fs.unlinkSync(oldPath); // 删除旧链接，完成改名
    } catch {
      // 新文件已就位、旧文件删除失败：内容未丢，留下旧副本即可。
    }
  });

  return result;
}
