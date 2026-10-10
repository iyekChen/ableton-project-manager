import {
  ActionPanel,
  Action,
  Alert,
  Color,
  confirmAlert,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import fs from "node:fs";
import path from "node:path";
import { getSettings } from "./settings";
import {
  getAllProjectMetadata,
  getProjectMetadata,
  movePinnedProject,
  renameProjectMetadata,
  saveProjectMetadata,
  setProjectPinned,
} from "./project-metadata";
import { getTranslations } from "./i18n";
import { getAlsMetadata } from "./als-metadata";
import { SortBySubmenu, sortItems, sortOptionTitle, useSortOption } from "./sorting";
import type { SortOption } from "./sorting";
import { Bounces } from "./bounces";
import { stageTaxonomy, genreTaxonomy, collectionTaxonomy } from "./taxonomies";
import type { TaxonomyOption } from "./taxonomy";
import { getNotesFolder, readNoteFile, writeNoteFile, renameNoteFile, noteFilePath } from "./notes";
import { CollectionList } from "./collections-view";

const settings = getSettings();
const t = getTranslations(settings.language);

const PROJECTS_ROOT = settings.projectsFolder;
const SORT_STORAGE_KEY = "project-sort-option";
const SETS_SORT_STORAGE_KEY = "sets-sort-option";

const PROJECT_SORT_OPTIONS: SortOption[] = [
  "modified-desc",
  "modified-asc",
  "created-desc",
  "created-asc",
  "name-asc",
  "name-desc",
];

const SETS_SORT_OPTIONS: SortOption[] = [
  "modified-desc",
  "modified-asc",
  "created-desc",
  "created-asc",
  "name-asc",
  "name-desc",
];

type CachedAlsMetadata = {
  bpm: number | null;
  timeSignature: string | null;
  key: string | null;
};

type ProjectSet = CachedAlsMetadata & {
  name: string;
  path: string;
  createdAt: number;
  modifiedAt: number;
};

type AlsMetadataCacheEntry = {
  signature: string;
  metadata: CachedAlsMetadata;
};

const EMPTY_METADATA: CachedAlsMetadata = { bpm: null, timeSignature: null, key: null };

const ALS_METADATA_CACHE_LIMIT = 100;
const ALS_METADATA_STORAGE_KEY = "als-metadata-cache-v2";
const ALS_METADATA_CONCURRENCY = 3;

const ALS_PARSER_VERSION = 1;

const alsMetadataCache = new Map<string, AlsMetadataCacheEntry>();

let persistentCacheLoaded: Promise<void> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | undefined;

function fileSignature(stats: fs.Stats): string {
  return `${ALS_PARSER_VERSION}:${stats.mtimeMs}:${stats.size}`;
}

function evictOldest() {
  while (alsMetadataCache.size > ALS_METADATA_CACHE_LIMIT) {
    const oldestPath = alsMetadataCache.keys().next().value;
    if (oldestPath === undefined) break;
    alsMetadataCache.delete(oldestPath);
  }
}

async function loadPersistentAlsMetadataCache() {
  if (!persistentCacheLoaded) {
    persistentCacheLoaded = (async () => {
      try {
        const raw = await LocalStorage.getItem<string>(ALS_METADATA_STORAGE_KEY);

        if (!raw) {
          return;
        }

        const entries = JSON.parse(raw) as Record<string, AlsMetadataCacheEntry>;

        for (const [filePath, entry] of Object.entries(entries)) {
          if (typeof entry?.signature !== "string" || typeof entry?.metadata !== "object" || entry.metadata === null) {
            continue;
          }

          alsMetadataCache.set(filePath, entry);
        }

        evictOldest();
      } catch (error) {
        console.error("[Ableton Session Manager] Failed to load ALS cache:", error);
      }
    })();
  }

  await persistentCacheLoaded;
}

function schedulePersistAlsMetadataCache() {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }

  persistTimer = setTimeout(() => {
    persistTimer = undefined;

    const snapshot = Object.fromEntries(alsMetadataCache);

    void LocalStorage.setItem(ALS_METADATA_STORAGE_KEY, JSON.stringify(snapshot)).catch((error) => {
      console.error("[Ableton Session Manager] Failed to persist ALS cache:", error);
    });
  }, 200);
}

function cacheAlsMetadata(filePath: string, signature: string, metadata: CachedAlsMetadata) {
  alsMetadataCache.delete(filePath);
  alsMetadataCache.set(filePath, { signature, metadata });

  evictOldest();
  schedulePersistAlsMetadataCache();
}

export type Project = {
  id: string;
  title: string;
  folderPath: string;
  createdAt: number;
  modifiedAt: number;
  stageId: string | null;
  genreIds: string[];
  collectionIds: string[];
  notes: string;
  pinned: boolean;
  pinOrder: number | null;
  setsCount: number;
  bouncesCount: number;
};

const AUDIO_EXTENSIONS = new Set([".wav", ".aif", ".aiff", ".mp3", ".m4a", ".flac"]);

const SHOW_DETAIL = getPreferenceValues<{ projectView?: string }>().projectView === "detail";

function countBounces(folderPath: string): number {
  try {
    return fs.readdirSync(folderPath).filter((file) => AUDIO_EXTENSIONS.has(path.extname(file).toLowerCase())).length;
  } catch {
    return 0;
  }
}

function namesFor(ids: string[], options: TaxonomyOption[]): string[] {
  return ids.map((id) => options.find((o) => o.id === id)?.name).filter((n): n is string => n !== undefined);
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadProjects(): Project[] {
  const projects: Project[] = [];

  const bouncesFolderName = (getPreferenceValues<{ bouncesFolderName?: string }>().bouncesFolderName ?? "").trim();

  for (const folder of fs.readdirSync(PROJECTS_ROOT)) {
    try {
      const folderPath = path.join(PROJECTS_ROOT, folder);
      const stats = fs.statSync(folderPath);

      if (!stats.isDirectory()) {
        continue;
      }

      const setFiles = fs.readdirSync(folderPath).filter((file) => file.endsWith(".als"));

      if (setFiles.length === 0) {
        continue;
      }

      const latestSetModifiedAt = setFiles.reduce((latest, file) => {
        const setStats = fs.statSync(path.join(folderPath, file));
        return Math.max(latest, setStats.mtimeMs);
      }, 0);

      const bouncesPath = bouncesFolderName ? path.join(folderPath, bouncesFolderName) : folderPath;

      projects.push({
        id: folder,
        title: folder,
        folderPath,
        createdAt: stats.birthtimeMs,
        modifiedAt: latestSetModifiedAt,
        stageId: null,
        genreIds: [],
        collectionIds: [],
        notes: "",
        pinned: false,
        pinOrder: null,
        setsCount: setFiles.length,
        bouncesCount: countBounces(bouncesPath),
      });
    } catch {
      // 跳过无法读取的条目
    }
  }

  return projects;
}

function Sets({ project }: { project: Project }) {
  const [sets, setSets] = useState<ProjectSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useSortOption(SETS_SORT_STORAGE_KEY, SETS_SORT_OPTIONS, "created-desc");

  useEffect(() => {
    let cancelled = false;

    type PendingSet = {
      set: ProjectSet;
      signature: string;
      cached: boolean;
    };

    async function loadSets() {
      try {
        await loadPersistentAlsMetadataCache();

        if (cancelled) return;

        const files = fs.readdirSync(project.folderPath).filter((file) => file.endsWith(".als"));

        const pendingSets: PendingSet[] = files.map((file) => {
          const setPath = path.join(project.folderPath, file);
          const stats = fs.statSync(setPath);
          const signature = fileSignature(stats);
          const cachedEntry = alsMetadataCache.get(setPath);
          const cacheIsValid = cachedEntry !== undefined && cachedEntry.signature === signature;

          return {
            set: {
              name: path.basename(file, ".als"),
              path: setPath,
              createdAt: stats.birthtimeMs,
              modifiedAt: stats.mtimeMs,
              ...(cacheIsValid ? cachedEntry.metadata : EMPTY_METADATA),
            },
            signature,
            cached: cacheIsValid,
          };
        });

        const missing = pendingSets.filter((item) => !item.cached);

        async function parseSet(item: PendingSet) {
          try {
            const metadata = await getAlsMetadata(item.set.path);

            if (cancelled) return;

            if (fileSignature(fs.statSync(item.set.path)) !== item.signature) return;

            const normalizedMetadata: CachedAlsMetadata = {
              bpm: metadata.bpm,
              timeSignature: metadata.timeSignature,
              key: metadata.inKey === false ? null : metadata.key,
            };

            cacheAlsMetadata(item.set.path, item.signature, normalizedMetadata);

            item.set.bpm = normalizedMetadata.bpm;
            item.set.timeSignature = normalizedMetadata.timeSignature;
            item.set.key = normalizedMetadata.key;
          } catch (error) {
            console.error(`[Ableton Session Manager] Failed to load ALS metadata: ${item.set.path}`, error);
          }
        }

        let nextIndex = 0;

        async function worker() {
          while (!cancelled) {
            const index = nextIndex++;
            if (index >= missing.length) return;

            await parseSet(missing[index]);
          }
        }

        await Promise.all(
          Array.from({ length: Math.min(ALS_METADATA_CONCURRENCY, missing.length) }, () => worker()),
        );

        if (cancelled) return;

        setSets(pendingSets.map((item) => item.set));
      } catch (error) {
        if (!cancelled) {
          console.error("[Ableton Session Manager] Failed to load Sets:", error);
          setSets([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSets();

    return () => {
      cancelled = true;
    };
  }, [project.folderPath]);

  const sortedSets = sortItems(sets, sortBy, (set) => ({
    created: set.createdAt,
    modified: set.modifiedAt,
    name: set.name,
  }));

  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle={project.title}>
      <List.Section title={sortOptionTitle(sortBy)}>
        {sortedSets.map((set) => (
          <List.Item
            key={set.path}
            icon="Set.png"
            title={set.name}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item. Detail.Metadata.Label title="Key" text={set.key ?? "—"} />
                    <List.Item.Detail.Metadata.Label title="BPM" text={set.bpm === null ? "—" : String(set.bpm)} />
                    <List.Item.Detail.Metadata.Label title="Time Signature" text={set.timeSignature ?? "—"} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Open title={t.openInAbletonLive} target={set.path} />
                <Action.ShowInFinder path={set.path} title={t.showInFinder} />
                <Action.CopyToClipboard content={set.path.split("/").pop() ?? ""} title={t.copySetName} shortcut={{ modifiers: ["cmd"], key: "c" }} />
                <Action.CopyToClipboard content={set.path} title={t.copySetPath} shortcut={Keyboard.Shortcut.Common.CopyPath} />
                <ActionPanel.Section>
                  <SortBySubmenu allowed={SETS_SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function EditInfo({ project, onSaved }: { project: Project; onSaved: () => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState(project.title);

  const [stageOptions, setStageOptions] = useState<TaxonomyOption[]>([]);
  const [genreOptions, setGenreOptions] = useState<TaxonomyOption[]>([]);
  const [collectionOptions, setCollectionOptions] = useState<TaxonomyOption[]>([]);

  const [stageId, setStageId] = useState("none");
  const [genreIds, setGenreIds] = useState<string[]>([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const [stages, genres, collections, metadata] = await Promise.all([
        stageTaxonomy.get(),
        genreTaxonomy.get(),
        collectionTaxonomy.get(),
        getProjectMetadata(project.id),
      ]);

      setStageOptions(stages);
      setGenreOptions(genres);
      setCollectionOptions(collections);
      setStageId(metadata.stageId ?? "none");
      setGenreIds(metadata.genreIds);
      setCollectionIds(metadata.collectionIds);
    }

    void load();
  }, [project.id]);

  async function handleSubmit() {
    const trimmedName = name.trim();
    const nameChanged = trimmedName !== "" && trimmedName !== project.title;

    let targetId = project.id;

    if (nameChanged) {
      if (trimmedName.includes("/") || trimmedName.includes(":")) {
        await showToast({ style: Toast.Style.Failure, title: t.invalidName });
        return;
      }

      const newPath = path.join(path.dirname(project.folderPath), trimmedName);

      if (fs.existsSync(newPath)) {
        await showToast({ style: Toast.Style.Failure, title: t.nameExists });
        return;
      }

      const confirmed = await confirmAlert({
        icon: { source: Icon.Warning, tintColor: Color.Yellow },
        title: t.renameConfirmTitle,
        message: t.renameConfirmMessage,
        primaryAction: { title: t.rename, style: Alert.ActionStyle.Default },
      });

      if (!confirmed) {
        return;
      }

      try {
        fs.renameSync(project.folderPath, newPath);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: t.renameFailed,
          message: error instanceof Error ? error.message : String(error),
        });
        return;
      }

      await renameProjectMetadata(project.id, trimmedName);
      renameNoteFile(project.id, trimmedName);
      targetId = trimmedName;
    }

    const metadata = await getProjectMetadata(targetId);
    await saveProjectMetadata(targetId, {
      ...metadata,
      stageId: stageId === "none" ? null : stageId,
      genreIds,
      collectionIds,
    });

    onSaved();

    await showToast({
      style: Toast.Style.Success,
      title: t.infoUpdated,
    });

    pop();
  }

  return (
    <Form
      navigationTitle={`${t.editInfo} — ${project.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.save} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={t.name} value={name} onChange={setName} />

      <Form.Dropdown id="stage" title={t.stage} value={stageId} onChange={setStageId}>
        <Form.Dropdown.Item value="none" title={t.none} icon={Icon.Circle} />
        {stageOptions.map((option) => (
          <Form.Dropdown.Item
            key={option.id}
            value={option.id}
            title={option.name}
            icon={option.color ? { source: Icon.Circle, tintColor: option.color } : Icon.Circle}
          />
        ))}
      </Form.Dropdown>

      <Form.TagPicker id="genre" title={t.genre} value={genreIds} onChange={setGenreIds}>
        {genreOptions.map((option) => (
          <Form.TagPicker.Item key={option.id} value={option.id} title={option.name} />
        ))}
      </Form.TagPicker>

      <Form.TagPicker id="collection" title={t.collection} value={collectionIds} onChange={setCollectionIds}>
        {collectionOptions.map((option) => (
          <Form.TagPicker.Item key={option.id} value={option.id} title={option.name} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

function EditNote({ project, onSaved }: { project: Project; onSaved: () => void }) {
  const { pop } = useNavigation();
  const [note, setNote] = useState("");

  useEffect(() => {
    async function load() {
      if (getNotesFolder()) {
        setNote(readNoteFile(project.id));
      } else {
        const metadata = await getProjectMetadata(project.id);
        setNote(metadata.notes);
      }
    }

    void load();
  }, [project.id]);

  async function handleSubmit() {
    if (getNotesFolder()) {
      writeNoteFile(project.id, note);
    } else {
      const metadata = await getProjectMetadata(project.id);
      await saveProjectMetadata(project.id, { ...metadata, notes: note });
    }

    onSaved();

    await showToast({
      style: Toast.Style.Success,
      title: t.infoUpdated,
    });

    pop();
  }

  return (
    <Form
      navigationTitle={`${t.editNote} — ${project.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.save} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="note" title={t.notes} value={note} onChange={setNote} />
    </Form>
  );
}

export default function Command() {
  const [stageOptions, setStageOptions] = useState<TaxonomyOption[]>([]);
  const [genreOptions, setGenreOptions] = useState<TaxonomyOption[]>([]);
  const [collectionOptions, setCollectionOptions] = useState<TaxonomyOption[]>([]);
  const [selectedStage, setSelectedStage] = useState("all");
  const [sortBy, setSortBy] = useSortOption(SORT_STORAGE_KEY, PROJECT_SORT_OPTIONS, "created-desc");
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const baseProjectsRef = useRef<Project[]>([]);

  useEffect(() => {
    void stageTaxonomy.get().then(setStageOptions);
    void genreTaxonomy.get().then(setGenreOptions);
    void collectionTaxonomy.get().then(setCollectionOptions);
  }, []);

  const applyMetadata = useCallback(async () => {
    const metadataStore = await getAllProjectMetadata();
    const useNoteFile = getNotesFolder() !== "";

    const updatedProjects = baseProjectsRef.current.map((project) => {
      const metadata = metadataStore[project.id];
      const notes = SHOW_DETAIL ? (useNoteFile ? readNoteFile(project.id) : (metadata?.notes ?? "")) : "";

      return {
        ...project,
        stageId: metadata?.stageId ?? null,
        genreIds: metadata?.genreIds ?? [],
        collectionIds: metadata?.collectionIds ?? [],
        notes,
        pinned: metadata?.pinned ?? false,
        pinOrder: metadata?.pinOrder ?? null,
      };
    });

    setProjects(updatedProjects);
  }, []);

  const reloadProjects = useCallback(async () => {
    try {
      baseProjectsRef.current = loadProjects();
      await applyMetadata();
    } catch (error) {
      console.error("[Ableton Session Manager] Failed to load projects:", error);
      setProjects([]);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load projects",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [applyMetadata]);

  useEffect(() => {
    async function load() {
      await reloadProjects();
      setIsLoading(false);
    }

    void load();
  }, [reloadProjects]);

  const handlePinToggle = async (project: Project) => {
    await setProjectPinned(project.id, !project.pinned);
    await applyMetadata();

    await showToast({
      style: Toast.Style.Success,
      title: project.pinned ? t.projectUnpinned : t.projectPinned,
    });
  };

  const handleMovePinnedProject = async (project: Project, direction: "up" | "down") => {
    await movePinnedProject(project.id, direction);
    await applyMetadata();
  };

  const filteredProjects =
    selectedStage === "all" ? projects : projects.filter((project) => project.stageId === selectedStage);

  const pinnedProjects = filteredProjects
    .filter((project) => project.pinned)
    .sort((a, b) => (a.pinOrder ?? Number.MAX_SAFE_INTEGER) - (b.pinOrder ?? Number.MAX_SAFE_INTEGER));

  const unpinnedProjects = sortItems(
    filteredProjects.filter((project) => !project.pinned),
    sortBy,
    (project) => ({ created: project.createdAt, modified: project.modifiedAt, name: project.title }),
  );

  const renderProject = (item: Project) => {
    const stage = stageOptions.find((option) => option.id === item.stageId);
    const genreNames = namesFor(item.genreIds, genreOptions);
    const collectionNames = namesFor(item.collectionIds, collectionOptions);
    const stagePill = stage ? [{ tag: { value: stage.name, color: stage.color ?? Color.SecondaryText } }] : [];

    const noteFile = noteFilePath(item.id);
    const canOpenNote = noteFile !== null && fs.existsSync(noteFile);

    return (
      <List.Item
        key={item.id}
        icon="Project.png"
        title={item.title}
        accessories={
          SHOW_DETAIL
            ? []
            : [
                ...stagePill,
                { text: String(item.setsCount), tooltip: `${item.setsCount} Sets` },
                { icon: Icon.Document, tooltip: `${item.setsCount} Sets` },
                { text: String(item.bouncesCount), tooltip: `${item.bouncesCount} Bounces` },
                { icon: Icon.Music, tooltip: `${item.bouncesCount} Bounces` },
              ]
        }
        detail={
          SHOW_DETAIL ? (
            <List.Item.Detail
              markdown={item.notes.trim() ? item.notes : "_No notes yet_"}
              metadata={
                <List.Item.Detail.Metadata>
                  {stage ? (
                    <List.Item.Detail.Metadata.TagList title="Stage">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={stage.name}
                        color={stage.color ?? Color.SecondaryText}
                      />
                    </List.Item.Detail.Metadata.TagList>
                  ) : (
                    <List.Item.Detail.Metadata.Label title="Stage" text="—" />
                  )}

                  {genreNames.length > 0 ? (
                    <List.Item.Detail.Metadata.TagList title="Genre">
                      {genreNames.map((genreName) => (
                        <List. Item.Detail.Metadata.TagList.Item key={genreName} text={genreName} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  ) : (
                    <List.Item.Detail.Metadata.Label title="Genre" text="—" />
                  )}

                  {collectionNames.length > 0 ? (
                    <List.Item.Detail.Metadata.TagList title="Collection">
                      {collectionNames.map((collectionName) => (
                        <List.Item.Detail.Metadata.TagList.Item key={collectionName} text={collectionName} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  ) : (
                    <List.Item.Detail.Metadata.Label title="Collection" text="—" />
                  )}

                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label title="Bounces" text={String(item.bouncesCount)} />
                  <List.Item.Detail.Metadata.Label title="Sets" text={String(item.setsCount)} />

                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label title="Created" text={formatDate(item.createdAt)} />
                  <List.Item.Detail.Metadata.Label title="Modified" text={formatDate(item.modifiedAt)} />
                </List.Item.Detail.Metadata>
              }
            />
          ) : undefined
        }
        actions={
          <ActionPanel>
            <Action.Push title={t.viewSets} icon={Icon.Eye} target={<Sets project={item} />} />

            <Action.Push
              title={t.previewBounces}
              icon={Icon. Eye}
              target={<Bounces projectName={item.title} projectPath={item.folderPath} />}
            />

            <Action.Push
              title={t.editInfo}
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={<EditInfo project={item} onSaved={reloadProjects} />}
            />

            <Action.Push
              title={t.editNote}
              icon={Icon.Pencil}
              target={<EditNote project={item} onSaved={reloadProjects} />}
            />

            {canOpenNote && <Action.Open title={t.openNote} icon={Icon.Document} target={noteFile} />}
            
            <Action.Open title={t.openInFinder} icon={Icon.Finder} target={item.folderPath} />

            <Action
              title={item.pinned ? t.unpinProject : t.pinProject}
              icon={item.pinned ? Icon.TackDisabled : Icon.Tack}
              shortcut={Keyboard.Shortcut.Common.Pin}
              onAction={() => handlePinToggle(item)}
            />

            {item.pinned && (
              <>
                <Action title={t.moveUp} icon={Icon.ArrowUp} onAction={() => handleMovePinnedProject(item, "up")} />
                <Action
                  title={t.moveDown}
                  icon={Icon.ArrowDown}
                  onAction={() => handleMovePinnedProject(item, "down")}
                />
              </>
            )}

            <Action.CopyToClipboard content={item.title} title={t.copyProjectName} shortcut={{ modifiers: ["cmd"], key: "c" }} />
            <Action.CopyToClipboard content={item.folderPath} title={t.copyProjectPath} shortcut={Keyboard.Shortcut.Common.CopyPath} />

            <ActionPanel.Section>
              <Action.Push
                title={t.browseCollections}
                icon={Icon.Cd}
                target={<CollectionList projects={projects} collections={collectionOptions} />}
              />
            </ActionPanel.Section>

            <ActionPanel.Section>
              <SortBySubmenu allowed={PROJECT_SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  const currentSortTitle = sortOptionTitle(sortBy);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={SHOW_DETAIL}
      searchBarPlaceholder={t.searchProjects}
      searchBarAccessory={
        <List.Dropdown tooltip={t.filterByStage} value={selectedStage} onChange={setSelectedStage}>
          <List.Dropdown.Section title="">
            <List.Dropdown.Item title={t.allStages} value="all" icon={Icon.CircleProgress100} />
          </List.Dropdown.Section>

          <List.Dropdown.Section title="">
            {stageOptions.map((option) => (
              <List.Dropdown.Item
                key={option.id}
                title={option.name}
                value={option.id}
                icon={option.color ? { source: Icon.Circle, tintColor: option.color } : Icon.Circle}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {pinnedProjects.length > 0 && <List.Section title={t.pinned}>{pinnedProjects.map(renderProject)}</List.Section>}

      <List.Section title={currentSortTitle}>{unpinnedProjects.map(renderProject)}</List.Section>
    </List>
  );
}