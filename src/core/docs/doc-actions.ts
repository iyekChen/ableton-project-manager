import { docSharedWith, missingDocFolder, type DocKind } from "./docs";
import { strings } from "@/strings";

/** 详情面板没有内容时的占位：文件夹失效则显示警告，否则显示"还没有笔记/歌词"。 */
export function docPlaceholder(kind: DocKind, title?: string, missingFolder?: string | null): string {
  const others = title ? docSharedWith(title, kind) : [];
  if (others.length > 0) {
    return `**${strings.docShared}**\n\n${strings.docSharedHint.replace("{names}", others.join(", "))}`;
  }
  // 调用方可以预先算好（每次渲染只查一次）；没传时照旧现查。
  const missing = missingFolder === undefined ? missingDocFolder(kind) : missingFolder;
  if (missing) {
    return `**⚠️ ${strings.docFolderMissing}**\n\n\`${missing}\`\n\n${strings.docFolderMissingHint}`;
  }
  return kind === "notes" ? strings.noNotesYet : strings.noLyricsYet;
}
