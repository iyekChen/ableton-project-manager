// DAW 专属的视图。和 index.ts 分开放：视图依赖 core，而 core 又引用 index.ts，放在一起会形成循环引用。
// 共用代码按 SetsView、projectFilesInfo 这两个名字引用。
import type { Project } from "@/core/projects/types";
import type { ProjectFilesInfo } from "./types";

export { SetsView } from "./ableton/sets-view";

// Live 的项目里没有「工程文件」这一层：Search Projects 按 Set 显示。
export const projectFilesInfo: (project: Pick<Project, "kind" | "folderPath">) => ProjectFilesInfo | null = () => null;
