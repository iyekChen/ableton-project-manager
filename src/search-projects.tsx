import {
  ActionPanel,
  Action,
  Color,
  getApplications,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  open,
  showToast,
  Toast,
  useNavigation,
  type Application,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import fs from "node:fs";
import { cleanupAudioPlayer, useAudioPlayer } from "./hooks/use-audio-player";
import { ensureAudioPlayerBinary } from "./audio-player-path";
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
import { findLatestBounce, resolveBouncesFolder } from "./projects/bounces";

const settings = getSettings();
const t = getTranslations(settings.language);
const PROJECTS_ROOT = settings.projectsFolder;
const SORT_STORAGE_KEY = "project-sort-option";
const VIEW_MODE_STORAGE_KEY = "view-mode:projects";
const PLAYER_PATH = ensureAudioPlayerBinary();
const SEEK_STEP_SECONDS = 5;

const PROJECT_SORT_OPTIONS: SortOption[] = [
  "modified-desc",
  "modified-asc",
  "created-desc",
  "created-asc",
  "name-asc",
  "name-desc",
];

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

export default function Command() {
  const { push } = useNavigation();
  const [stageOptions, setStageOptions] = useState<TaxonomyOption[]>([]);
  const [genreOptions, setGenreOptions] = useState<TaxonomyOption[]>([]);
  const [collectionOptions, setCollectionOptions] = useState<TaxonomyOption[]>([]);
  const [selectedStage, setSelectedStage] = useState("all");
  const [sortBy, setSortBy] = useSortOption(SORT_STORAGE_KEY, PROJECT_SORT_OPTIONS, "created-desc");
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(true);
  const [abletonApp, setAbletonApp] = useState<Application | null>(null);
  const baseProjectsRef = useRef<Project[]>([]);

  const { playbackStatus, playingId, play, pause, resume, seek, restart } = useAudioPlayer({
    playerPath: PLAYER_PATH,
  });

  // 共享播放器：仅在命令关闭（根视图卸载）时真正停止；进入子视图（push）不打断。
  useEffect(() => () => cleanupAudioPlayer(), []);

  // 解析 Ableton Live，用于 New Live Set（取其图标 + 启动）。
  useEffect(() => {
    void getApplications().then((apps) => {
      setAbletonApp(apps.find((app) => app.name.toLowerCase().includes("ableton live")) ?? null);
    });
  }, []);

  // 常驻 Toast：播放时 title=Playing Latest Bounce / 暂停时 title=Paused，message=曲名（次级灰）。
  const toastRef = useRef<Toast | null>(null);
  const toastBusyRef = useRef(false);
  const toastActiveRef = useRef(false);

  useEffect(() => {
    void stageTaxonomy.get().then(setStageOptions);
    void genreTaxonomy.get().then(setGenreOptions);
    void collectionTaxonomy.get().then(setCollectionOptions);
  }, []);

  useEffect(() => {
    void LocalStorage.getItem<string>(VIEW_MODE_STORAGE_KEY).then((stored) => {
      if (stored === "overview") {
        setShowDetail(false);
      } else if (stored === "detail") {
        setShowDetail(true);
      }
    });
  }, []);

  const toggleDetail = useCallback(() => {
    setShowDetail((prev) => {
      const next = !prev;
      void LocalStorage.setItem(VIEW_MODE_STORAGE_KEY, next ? "detail" : "overview");
      return next;
    });
  }, []);

  const applyMetadata = useCallback(async () => {
    const metadataStore = await getAllProjectMetadata();
    const useNoteFile = getNotesFolder() !== "";
    const updatedProjects = baseProjectsRef.current.map((project) => {
      const metadata = metadataStore[project.id];
      const notes = showDetail ? (useNoteFile ? readNoteFile(project.id) : (metadata?.notes ?? "")) : "";
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

  // 根据播放状态维护常驻 Toast。
  useEffect(() => {
    const playingProject = projects.find((p) => p.id === playingId);
    const name = playingProject?.title ?? "";
    const isActive = playingId !== null && (playbackStatus === "Starting" || playbackStatus === "Playing");
    toastActiveRef.current = isActive;

    if (isActive) {
      const title = t.playingLatestBounce;
      if (toastRef.current) {
        toastRef.current.title = title;
        toastRef.current.message = name;
      } else if (!toastBusyRef.current) {
        toastBusyRef.current = true;
        void showToast({ style: Toast.Style.Animated, title, message: name }).then((toast) => {
          toastBusyRef.current = false;
          if (!toastActiveRef.current) {
            void toast.hide();
            return;
          }
          toastRef.current = toast;
        });
      }
    } else if (toastRef.current) {
      void toastRef.current.hide();
      toastRef.current = null;
    }
  }, [playbackStatus, playingId, projects]);

  const playProjectBounce = useCallback(
    (project: Project) => {
      const latestBouncePath = findLatestBounce(resolveBouncesFolder(project.folderPath));
      if (!latestBouncePath) {
        void showToast({ style: Toast.Style.Failure, title: t.noBounces });
        return;
      }
      play(project.id, latestBouncePath, {
        onError: (message) => {
          void showToast({ style: Toast.Style.Failure, title: t.playbackFailed, message });
        },
      });
    },
    [play],
  );

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

    const isThisPlaying = playingId === item.id;
    const isAnythingPlaying = playingId !== null;
    // 主操作：未播→播；播放中→暂停；暂停→续播。
    const toggleIsPause = isThisPlaying && (playbackStatus === "Playing" || playbackStatus === "Starting");
    const toggleTitle = isThisPlaying
      ? playbackStatus === "Paused"
        ? t.resumePlayback
        : playbackStatus === "Stopping"
          ? t.stoppingPlayback
          : t.pausePlayback
      : t.playLatestBounce;

    return (
      <List.Item
        key={item.id}
        icon="Project.png"
        title={item.title}
        accessories={
          showDetail
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
          showDetail ? (
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
                    <List.Item.Detail.Metadata.Label title="Stage" text="" />
                  )}
                  {genreNames.length > 0 ? (
                    <List.Item.Detail.Metadata.TagList title="Genre">
                      {genreNames.map((genreName) => (
                        <List.Item.Detail.Metadata.TagList.Item key={genreName} text={genreName} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  ) : (
                    <List.Item.Detail.Metadata.Label title="Genre" text="" />
                  )}
                  {collectionNames.length > 0 ? (
                    <List.Item.Detail.Metadata.TagList title="Collection">
                      {collectionNames.map((collectionName) => (
                        <List.Item.Detail.Metadata.TagList.Item key={collectionName} text={collectionName} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  ) : (
                    <List.Item.Detail.Metadata.Label title="Collection" text="" />
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
                title={toggleTitle}
                icon={toggleIsPause ? Icon.Pause : Icon.Play}
                onAction={() => {
                  if (isThisPlaying) {
                    if (playbackStatus === "Stopping") {
                      return;
                    }
                    if (playbackStatus === "Paused") {
                      resume();
                    } else {
                      pause();
                    }
                    return;
                  }
                  playProjectBounce(item);
                }}
              />
              <Action
                title={t.browseBounces}
                icon={Icon.Eye}
                shortcut={{ modifiers: ["opt"], key: "return" }}
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
                shortcut={{ modifiers: ["ctrl"], key: "return" }}
                target={<CollectionList projects={projects} collections={collectionOptions} stages={stageOptions} />}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
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
            </ActionPanel.Section>
            {isAnythingPlaying && (
              <ActionPanel.Section>
                <Action
                  title={t.seekBackward}
                  icon={Icon.ArrowLeft}
                  shortcut={{ modifiers: ["opt"], key: "arrowLeft" }}
                  onAction={() => seek(-SEEK_STEP_SECONDS)}
                />
                <Action
                  title={t.seekForward}
                  icon={Icon.ArrowRight}
                  shortcut={{ modifiers: ["opt"], key: "arrowRight" }}
                  onAction={() => seek(SEEK_STEP_SECONDS)}
                />
                <Action
                  title={t.restartTrack}
                  icon={Icon.ArrowCounterClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                  onAction={() => {
                    restart();
                    if (playbackStatus === "Paused") {
                      resume();
                    }
                  }}
                />
              </ActionPanel.Section>
            )}
            <ActionPanel.Section>
              <Action
                title={t.newLiveSet}
                icon={abletonApp ? { fileIcon: abletonApp.path } : Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={async () => {
                  if (!abletonApp) {
                    await showToast({ style: Toast.Style.Failure, title: t.newLiveSetFailed });
                    return;
                  }
                  try {
                    await open(abletonApp.path);
                  } catch (error) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: t.newLiveSetFailed,
                      message: error instanceof Error ? error.message : String(error),
                    });
                  }
                }}
              />
              <Action.Open
                title={t.openInFinder}
                icon={Icon.Finder}
                shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
                target={item.folderPath}
              />
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
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title={item.pinned ? t.unpinProject : t.pinProject}
                icon={item.pinned ? Icon.TackDisabled : Icon.Tack}
                shortcut={Keyboard.Shortcut.Common.Pin}
                onAction={() => handlePinToggle(item)}
              />
              {item.pinned && (
                <>
                  <Action
                    title={t.moveUp}
                    icon={Icon.ArrowUp}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                    onAction={() => handleMovePinnedProject(item, "up")}
                  />
                  <Action
                    title={t.moveDown}
                    icon={Icon.ArrowDown}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                    onAction={() => handleMovePinnedProject(item, "down")}
                  />
                </>
              )}
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title={showDetail ? t.showOverview : t.showDetail}
                icon={Icon.AppWindowSidebarRight}
                onAction={toggleDetail}
              />
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
      isShowingDetail={showDetail}
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
