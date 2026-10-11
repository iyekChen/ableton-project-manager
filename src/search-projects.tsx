import {
  ActionPanel,
  Action,
  Color,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import fs from "node:fs";
import { extname, join } from "node:path";
import { useAudioPlayer } from "./hooks/use-audio-player";
import { getSettings } from "./settings";
import { getAllProjectMetadata, movePinnedProject, setProjectPinned } from "./project-metadata";
import { getTranslations } from "./i18n";
import { SortBySubmenu, sortItems, sortOptionTitle, useSortOption } from "./sorting";
import type { SortOption } from "./sorting";
import { Bounces } from "./bounces";
import { stageTaxonomy, genreTaxonomy, collectionTaxonomy } from "./taxonomies";
import type { TaxonomyOption } from "./taxonomy";
import { getNotesFolder, readNoteFile, noteFilePath } from "./notes";
import { CollectionList } from "./collections-view";
import { EditInfo } from "./components/project/edit-info";
import { EditNote } from "./components/project/edit-note";
import { Sets } from "./components/project/sets";
import type { Project } from "./projects/types";
import { loadProjects } from "./projects/load-projects";

const settings = getSettings();
const t = getTranslations(settings.language);
const PROJECTS_ROOT = settings.projectsFolder;
const SORT_STORAGE_KEY = "project-sort-option";
const PLAYER_PATH = "/tmp/asm-audio-player";

const AUDIO_EXTENSIONS = new Set([".wav", ".aif", ".aiff", ".mp3", ".m4a", ".flac"]);

const PROJECT_SORT_OPTIONS: SortOption[] = [
  "modified-desc",
  "modified-asc",
  "created-desc",
  "created-asc",
  "name-asc",
  "name-desc",
];

const SHOW_DETAIL = getPreferenceValues<{ projectView?: string }>().projectView === "detail";

function namesFor(ids: string[], options: TaxonomyOption[]): string[] {
  return ids
    .map((id) => options.find((option) => option.id === id)?.name)
    .filter((name): name is string => name !== undefined);
}

function formatDate(ms: number): string {
  const date = new Date(ms);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * 查找项目中创建时间最新的 Bounce。
 * 扫描范围、文件格式和 Bounces 列表保持一致。
 */
function findLatestBounce(projectPath: string): string | null {
  const prefs = getPreferenceValues<{ bouncesFolderName?: string }>();
  const folderName = (prefs.bouncesFolderName ?? "").trim();
  const folderPath = folderName ? join(projectPath, folderName) : projectPath;

  let entries: string[];

  try {
    entries = fs.readdirSync(folderPath);
  } catch {
    return null;
  }

  let latestPath: string | null = null;
  let latestCreatedAt = Number.NEGATIVE_INFINITY;

  for (const entry of entries) {
    if (!AUDIO_EXTENSIONS.has(extname(entry).toLowerCase())) {
      continue;
    }

    const filePath = join(folderPath, entry);

    try {
      const stats = fs.statSync(filePath);

      if (!stats.isFile()) {
        continue;
      }

      if (stats.birthtimeMs > latestCreatedAt) {
        latestCreatedAt = stats.birthtimeMs;
        latestPath = filePath;
      }
    } catch {
      // 跳过无法读取的文件，继续检查其他 Bounce。
      continue;
    }
  }

  return latestPath;
}

export default function Command() {
  const { push } = useNavigation();

  const [stageOptions, setStageOptions] = useState<TaxonomyOption[]>([]);
  const [genreOptions, setGenreOptions] = useState<TaxonomyOption[]>([]);
  const [collectionOptions, setCollectionOptions] = useState<TaxonomyOption[]>([]);
  const [selectedStage, setSelectedStage] = useState("all");
  const [sortBy, setSortBy] = useSortOption(SORT_STORAGE_KEY, PROJECT_SORT_OPTIONS, "created-desc");
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const baseProjectsRef = useRef<Project[]>([]);

  const { playbackStatus, play, stop } = useAudioPlayer({
    playerPath: PLAYER_PATH,
  });

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
      baseProjectsRef.current = loadProjects(PROJECTS_ROOT);
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
    (project) => ({
      created: project.createdAt,
      modified: project.modifiedAt,
      name: project.title,
    }),
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
                        <List.Item.Detail.Metadata.TagList.Item key={genreName} text={genreName} />
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
            <ActionPanel.Section>
              <Action.Push title={t.viewSets} icon={Icon.Eye} target={<Sets project={item} />} />

              <Action
                title={
                  playbackStatus === "Starting" || playbackStatus === "Playing" || playbackStatus === "Stopping"
                    ? playbackStatus === "Stopping"
                      ? t.stoppingPlayback
                      : t.stopPlayback
                    : t.playLatestBounce
                }
                icon={
                  playbackStatus === "Starting" || playbackStatus === "Playing" || playbackStatus === "Stopping"
                    ? Icon.Stop
                    : Icon.Play
                }
                onAction={async () => {
                  if (playbackStatus === "Stopping") {
                    return;
                  }

                  if (playbackStatus === "Starting" || playbackStatus === "Playing") {
                    stop();
                    return;
                  }

                  const latestBouncePath = findLatestBounce(item.folderPath);

                  if (!latestBouncePath) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: t.noBounces,
                    });
                    return;
                  }

                  play(latestBouncePath, {
                    onPlaying: () => {
                      void showToast({
                        style: Toast.Style.Success,
                        title: t.playingLatestBounce,
                        message: item.title,
                      });
                    },
                    onError: (message) => {
                      void showToast({
                        style: Toast.Style.Failure,
                        title: t.playbackFailed,
                        message,
                      });
                    },
                  });
                }}
              />

              <Action
                title={t.browseBounces}
                icon={Icon.Eye}
                onAction={async () => {
                  if (item.bouncesCount === 0) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: t.noBounces,
                    });
                    return;
                  }

                  push(<Bounces projectName={item.title} projectPath={item.folderPath} />);
                }}
              />

              <Action.Push
                title={t.browseCollections}
                icon={Icon.Cd}
                target={<CollectionList projects={projects} collections={collectionOptions} />}
              />
            </ActionPanel.Section>

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

            <Action.CopyToClipboard
              content={item.title}
              title={t.copyProjectName}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />

            <Action.CopyToClipboard
              content={item.folderPath}
              title={t.copyProjectPath}
              shortcut={Keyboard.Shortcut.Common.CopyPath}
            />

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
