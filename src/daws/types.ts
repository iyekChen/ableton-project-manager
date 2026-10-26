/** 一个 DAW 的标识。 */
export type DawId = "ableton" | "logic";

/** 从 Set 解析出的音乐元数据。 */
export type ProjectFileMetadata = {
  bpm: number | null;
  timeSignature: string | null;
  key: string | null;
};

/** 项目在磁盘上的形态：普通文件夹，或 macOS 包（如 Logic 的 .logicx，Finder 里显示成一个文件）。 */
export type ProjectKind = "folder" | "package";

/** detectProject 认出的项目。 */
export type DetectedProject = {
  id: string;
  /** 项目条目本身的路径（文件夹或包）：Finder、复制、改名、bounce 都用它。 */
  folderPath: string;
  kind: ProjectKind;
};

/** 项目里的一个 Set（Ableton 的 .als 文件、Logic 的 Alternative）。 */
export type DawSet = {
  name: string;
  /** 打开、在 Finder 里显示时用的路径。 */
  path: string;
  /** 存元数据的文件：用它的修改时间和大小判断缓存是否有效，也作为缓存的键。 */
  metadataFile: string;
  createdAt: number;
  modifiedAt: number;
  /** DAW 有「当前版本」时标出它（如 Logic 的 Active Alternative）；没有时按修改时间取最新的。 */
  active?: boolean;
};

/**
 * DAW 适配器：把各家 DAW 真正不同的部分收到一处。核心逻辑（元数据、合集、文档、
 * bounce 聚合、播放等）与具体 DAW 无关，扫描项目、列出 Set、解析元数据都只经由本接口。
 * DAW 专属的视图放在 ui.ts。
 */
export interface DawAdapter {
  /** DAW 标识。 */
  readonly id: DawId;

  /** 匹配 DAW 桌面应用的名称子串（小写），供 getApplications 查找，如 "ableton live"。 */
  readonly appNameMatch: string;

  /** 磁盘上的条目名 → 项目 id（也是显示名）。须满足 projectIdForEntry(entryNameFor(id, kind)) === id。 */
  projectIdForEntry(entryName: string): string;

  /** 项目 id → 磁盘上的条目名。改名、复制项目时用。 */
  entryNameFor(title: string, kind: ProjectKind): string;

  /** Projects Folder 下的一个条目是不是项目，不是则返回 null。这里还不检查有没有 Set。 */
  detectProject(entryPath: string, entryName: string): DetectedProject | null;

  /** 列出项目里的 Set，读不到的跳过。 */
  listSets(project: { folderPath: string; kind: ProjectKind }): DawSet[];

  /** 解析一个 Set 的音乐元数据（BPM / 拍号 / 调）。读不到时各字段为 null。 */
  parseSet(set: DawSet): Promise<ProjectFileMetadata>;
}
