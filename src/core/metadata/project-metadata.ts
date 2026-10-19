import { LocalStorage } from "@raycast/api";
import { isCorruptJson, StorageUnreadableError } from "@/storage";

export type ProjectMetadata = {
  stageId: string | null;
  genreIds: string[];
  collectionIds: string[];
  pinned: boolean;
  pinOrder: number | null;
  notes: string;
  // 外部 bounce 来源（绝对路径）：叠加在默认 Bounces 文件夹之上，不替换它。
  externalBounceFolders: string[];
  externalBounceFiles: string[];
};

const PROJECT_METADATA_STORAGE_KEY = "project-metadata";

type ProjectMetadataStore = Record<string, ProjectMetadata>;

const EMPTY_PROJECT_METADATA: ProjectMetadata = {
  stageId: null,
  genreIds: [],
  collectionIds: [],
  pinned: false,
  pinOrder: null,
  notes: "",
  externalBounceFolders: [],
  externalBounceFiles: [],
};

async function getStore(): Promise<ProjectMetadataStore> {
  const storedMetadata = await LocalStorage.getItem<string>(PROJECT_METADATA_STORAGE_KEY);

  if (!storedMetadata) {
    return {};
  }

  try {
    return JSON.parse(storedMetadata) as ProjectMetadataStore;
  } catch {
    // 损坏：读取时宽容返回空（仅供展示），不在此处覆盖——写入由 saveStore 拦截。
    return {};
  }
}

async function saveStore(store: ProjectMetadataStore): Promise<void> {
  const existing = await LocalStorage.getItem<string>(PROJECT_METADATA_STORAGE_KEY);
  if (isCorruptJson(existing)) {
    // 原数据虽损坏仍可能可人工恢复，绝不用新内容覆盖。
    throw new StorageUnreadableError();
  }
  await LocalStorage.setItem(PROJECT_METADATA_STORAGE_KEY, JSON.stringify(store));
}

// 用 EMPTY 兜底展开,保证老数据缺的字段也有默认值。
export async function getProjectMetadata(projectId: string): Promise<ProjectMetadata> {
  const store = await getStore();

  return { ...EMPTY_PROJECT_METADATA, ...(store[projectId] ?? {}) };
}

export async function saveProjectMetadata(projectId: string, metadata: ProjectMetadata): Promise<void> {
  const store = await getStore();

  store[projectId] = metadata;

  await saveStore(store);
}

export async function getAllProjectMetadata(): Promise<ProjectMetadataStore> {
  return getStore();
}

// 覆盖式写入某项目的外部 bounce 来源（去重、去空白）。随 ProjectMetadata 一起在改名/移动时迁移。
export async function setExternalBounces(
  projectId: string,
  externalBounceFolders: string[],
  externalBounceFiles: string[],
): Promise<void> {
  const store = await getStore();
  const dedupe = (paths: string[]) => Array.from(new Set(paths.map((p) => p.trim()).filter((p) => p !== "")));
  store[projectId] = {
    ...(store[projectId] ?? { ...EMPTY_PROJECT_METADATA }),
    externalBounceFolders: dedupe(externalBounceFolders),
    externalBounceFiles: dedupe(externalBounceFiles),
  };
  await saveStore(store);
}

// 删除某项目的元数据（移到废纸篓时清理，避免重建同名项目复活旧标签）。
export async function deleteProjectMetadata(projectId: string): Promise<void> {
  const store = await getStore();
  if (!(projectId in store)) {
    return;
  }
  delete store[projectId];
  await saveStore(store);
}

// 删除某个 Stage 后，清空所有引用它的项目的 stageId（一次读—改—写回，避免并发覆盖）。
export async function removeStageEverywhere(stageId: string): Promise<void> {
  const store = await getStore();
  let changed = false;
  for (const id of Object.keys(store)) {
    if (store[id].stageId === stageId) {
      store[id] = { ...store[id], stageId: null };
      changed = true;
    }
  }
  if (changed) await saveStore(store);
}

// 删除某个 Genre 后，从所有项目的 genreIds 里移除它（一次读—改—写回）。
export async function removeGenreEverywhere(genreId: string): Promise<void> {
  const store = await getStore();
  let changed = false;
  for (const id of Object.keys(store)) {
    if (store[id].genreIds?.includes(genreId)) {
      store[id] = { ...store[id], genreIds: store[id].genreIds.filter((g) => g !== genreId) };
      changed = true;
    }
  }
  if (changed) await saveStore(store);
}

// 项目文件夹改名后,把它的 metadata 从旧名字迁到新名字,避免丢失。
export async function renameProjectMetadata(oldId: string, newId: string): Promise<void> {
  if (oldId === newId) {
    return;
  }

  const store = await getStore();
  const existing = store[oldId];

  if (!existing) {
    return;
  }

  delete store[oldId];
  store[newId] = existing;

  await saveStore(store);
}

export async function setProjectPinned(projectId: string, pinned: boolean): Promise<void> {
  const store = await getStore();

  if (!pinned) {
    store[projectId] = {
      ...(store[projectId] ?? { ...EMPTY_PROJECT_METADATA }),
      pinned: false,
      pinOrder: null,
    };

    await saveStore(store);
    return;
  }

  const pinnedProjects = Object.values(store).filter((metadata) => metadata.pinned);

  const nextPinOrder = pinnedProjects.reduce((maxOrder, metadata) => Math.max(maxOrder, metadata.pinOrder ?? 0), 0) + 1;

  store[projectId] = {
    ...(store[projectId] ?? { ...EMPTY_PROJECT_METADATA }),
    pinned: true,
    pinOrder: nextPinOrder,
  };

  await saveStore(store);
}

export async function movePinnedProject(projectId: string, direction: "up" | "down"): Promise<void> {
  const store = await getStore();

  const pinnedProjects = Object.entries(store)
    .filter(([, metadata]) => metadata.pinned)
    .sort(([, a], [, b]) => (a.pinOrder ?? Number.MAX_SAFE_INTEGER) - (b.pinOrder ?? Number.MAX_SAFE_INTEGER));

  const currentIndex = pinnedProjects.findIndex(([id]) => id === projectId);

  if (currentIndex === -1) {
    return;
  }

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= pinnedProjects.length) {
    return;
  }

  const [currentEntry] = pinnedProjects.splice(currentIndex, 1);

  pinnedProjects.splice(targetIndex, 0, currentEntry);

  pinnedProjects.forEach(([id], index) => {
    store[id] = {
      ...store[id],
      pinOrder: index + 1,
    };
  });

  await saveStore(store);
}
