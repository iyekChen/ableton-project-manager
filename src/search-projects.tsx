import {
  ActionPanel,
  Action,
  Clipboard,
  Color,
  getApplications,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  open,
  showToast,
  Toast,
  trash,
  useNavigation,
  Alert,
  confirmAlert,
  type Application,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import fs from "node:fs";
import { useAudioPlayer } from "./hooks/use-audio-player";
import { ensureAudioPlayerBinary } from "./audio-player-path";
import { getSettings } from "./settings";
import { deleteProjectMetadata, getAllProjectMetadata, movePinnedProject, setProjectPinned } from "./project-metadata";
import { removeProjectFromAllOrders } from "./collection-order";
import { removeProjectFromAllRoles } from "./collection-roles";
import { getTranslations } from "./i18n";
import { SortBySubmenu, sortItems, sortOptionTitle, useSortOption } from "./sorting";
import type { SortOption } from "./sorting";
import { Bounces } from "./bounces";
import { stageTaxonomy, genreTaxonomy, collectionTaxonomy } from "./taxonomies";
import type { TaxonomyOption } from "./taxonomy";
import { displayDoc, readDocFile, setKnownProjectTitles, stripFrontmatter } from "./docs";
import { docPlaceholder, openDoc } from "./doc-actions";
import { archiveDeletedProject, restorePutBackProjects } from "./deleted-projects";
import { syncFinderChanges } from "./finder-sync";
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
const DETAIL_DOC_STORAGE_KEY = "detail-doc:projects";
const PLAYER_PATH = ensureAudioPlayerBinary();
const SEEK_STEP_SECONDS = 5;
// 正在由扩展执行 Move to Trash 的项目：已归档，目录监听触发的重载不要再当成 Finder 删除处理。
const trashingIds = new Set<string>();

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

function formatTime(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = Math.floor(safe % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function Command() {
  const { push } = useNavigation();
  const [stageOptions, setStageOptions] = useState<TaxonomyOption[]>([]);
  const [genreOptions, setGenreOptions] = useState<TaxonomyOption[]>([]);
  const [collectionOptions, setCollectionOptions] = useState<TaxonomyOption[]>([]);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [sortBy, setSortBy] = useSortOption(SORT_STORAGE_KEY, PROJECT_SORT_OPTIONS, "created-desc");
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(true);
  const [detailDoc, setDetailDoc] = useState<"notes" | "lyrics">("notes");
  const [abletonApp, setAbletonApp] = useState<Application | null>(null);
  const baseProjectsRef = useRef<Project[]>([]);

  const { playbackStatus, playingId, positionSeconds, durationSeconds, play, pause, resume, stop, seek, restart } =
    useAudioPlayer({
      playerPath: PLAYER_PATH,
    });

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

  useEffect(() => {
    void LocalStorage.getItem<string>(DETAIL_DOC_STORAGE_KEY).then((stored) => {
      if (stored === "lyrics") {
        setDetailDoc("lyrics");
      } else if (stored === "notes") {
        setDetailDoc("notes");
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

  const toggleDetailDoc = useCallback(() => {
    setDetailDoc((prev) => {
      const next = prev === "notes" ? "lyrics" : "notes";
      void LocalStorage.setItem(DETAIL_DOC_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const applyMetadata = useCallback(async () => {
    const metadataStore = await getAllProjectMetadata();
    const updatedProjects = baseProjectsRef.current.map((project) => {
      const metadata = metadataStore[project.id];
      const notes = showDetail ? stripFrontmatter(readDocFile(project, "notes")) : "";
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
      // 预先算好哪些项目会共用同一个笔记/歌词文件，读写时据此拦截。
      setKnownProjectTitles(baseProjectsRef.current.map((p) => p.title));
      // 先补做在 Finder 里做的改名/删除，再处理放回、套用元数据。
      const { guardTripped, ambiguous } = await syncFinderChanges(baseProjectsRef.current, PROJECTS_ROOT, trashingIds);
      if (guardTripped) {
        await showToast({ style: Toast.Style.Failure, title: t.manyProjectsMissing });
      } else if (ambiguous > 0) {
        await showToast({ style: Toast.Style.Failure, title: t.ambiguousFinderChanges });
      }
      // 先还原从废纸篓放回的项目（标签/轨号/角色/文档），再套用元数据。
      const { restored, docConflicts } = await restorePutBackProjects(baseProjectsRef.current);
      await applyMetadata();
      if (docConflicts.length > 0) {
        await showToast({ style: Toast.Style.Failure, title: t.restoreDocConflict, message: docConflicts.join(", ") });
      } else if (restored.length > 0) {
        await showToast({ style: Toast.Style.Success, title: t.projectsRestored, message: restored.join(", ") });
      }
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

  // 监听项目根目录（fs.watch 为 Node 内置，底层走 FSEvents）：Finder 里新建、删除、改名或从废纸篓放回项目时自动重载。
  // 去抖 0.5 秒，合并 Finder 连续触发的多次事件。
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let watcher: fs.FSWatcher | null = null;
    try {
      watcher = fs.watch(PROJECTS_ROOT, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => void reloadProjects(), 500);
      });
      watcher.on("error", () => watcher?.close());
    } catch {
      // 根目录不存在等：不监听，照常在打开时加载。
    }
    return () => {
      if (timer) clearTimeout(timer);
      watcher?.close();
    };
  }, [reloadProjects]);

  // 根据播放状态维护常驻 Toast。
  useEffect(() => {
    const playingProject = projects.find((p) => p.id === playingId);
    const name = playingProject?.title ?? "";
    const isActive = playingId !== null && (playbackStatus === "Starting" || playbackStatus === "Playing");
    toastActiveRef.current = isActive;

    if (isActive) {
      const title = t.playingLatestBounce;
      const time = durationSeconds > 0 ? `${formatTime(positionSeconds)} / ${formatTime(durationSeconds)}` : "";
      const message = time ? `${name} ${time}` : name;
      if (toastRef.current) {
        toastRef.current.title = title;
        toastRef.current.message = message;
      } else if (!toastBusyRef.current) {
        toastBusyRef.current = true;
        void showToast({ style: Toast.Style.Animated, title, message }).then((toast) => {
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
  }, [playbackStatus, playingId, projects, positionSeconds, durationSeconds]);

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
  const copyLatestBounce = useCallback(async (project: Project) => {
    const latestBouncePath = findLatestBounce(resolveBouncesFolder(project.folderPath));
    if (!latestBouncePath) {
      await showToast({ style: Toast.Style.Failure, title: t.noBounces });
      return;
    }
    await Clipboard.copy({ file: latestBouncePath });
    await showToast({
      style: Toast.Style.Success,
      title: t.bounceCopied,
      message: latestBouncePath.split("/").pop() ?? "",
    });
  }, []);

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

  const handleTrashProject = async (project: Project) => {
    const confirmed = await confirmAlert({
      title: t.moveToTrash,
      icon: Icon.Trash,
      message: `${t.trashProjectHint}\n${project.title}`,
      primaryAction: { title: t.moveToTrash, style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    trashingIds.add(project.id);
    await trash(project.folderPath);
    // 先存档（标签/轨号/角色，并把自定义文件夹里的文档移进 Deleted Projects/），再清理残留数据。
    // 30 天内从废纸篓放回，下次加载会按「同名 + 同创建时间」识别并还原；同名新项目不受影响。
    await archiveDeletedProject(project);
    await deleteProjectMetadata(project.id);
    await removeProjectFromAllOrders(project.id);
    await removeProjectFromAllRoles(project.id);
    trashingIds.delete(project.id);
    await reloadProjects();
    await showToast({ style: Toast.Style.Success, title: t.movedToTrash, message: project.title });
  };

  const filteredProjects = (() => {
    if (selectedFilter === "all") return projects;
    const separator = selectedFilter.indexOf(":");
    const dimension = selectedFilter.slice(0, separator);
    const id = selectedFilter.slice(separator + 1);
    if (dimension === "stage") return projects.filter((project) => project.stageId === id);
    if (dimension === "genre") return projects.filter((project) => project.genreIds.includes(id));
    return projects;
  })();

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
    const detailBody = !showDetail
      ? ""
      : detailDoc === "notes"
        ? item.notes
        : stripFrontmatter(readDocFile(item, "lyrics"));
    const detailPlaceholder = docPlaceholder(detailDoc, item.title);

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
        icon="icon.png"
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
              markdown={detailBody.trim() ? displayDoc(detailBody) : detailPlaceholder}
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
                onPop={() => {
                  // 在合集里改过的名字、标签、成员，以及新建/改名的合集，返回时一并刷新。
                  void reloadProjects();
                  void collectionTaxonomy.get().then(setCollectionOptions);
                }}
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
                shortcut={{ modifiers: ["cmd", "opt"], key: "n" }}
                target={<EditNote project={item} onSaved={reloadProjects} />}
              />
              <Action
                title={t.openNote}
                icon={Icon.Document}
                shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                onAction={async () => {
                  await openDoc(item, "notes");
                }}
              />
              <Action
                title={t.openLyrics}
                icon={Icon.Music}
                shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                onAction={async () => {
                  await openDoc(item, "lyrics");
                }}
              />
            </ActionPanel.Section>
            {isAnythingPlaying && (
              <ActionPanel.Section>
                <Action
                  title={t.stopPlayback}
                  icon={Icon.Stop}
                  shortcut={{ modifiers: ["cmd"], key: "-" }}
                  onAction={stop}
                />
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
              <Action
                title={t.copyLatestBounce}
                icon={Icon.CopyClipboard}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                onAction={() => copyLatestBounce(item)}
              />
              <Action.CopyToClipboard
                content={item.title}
                title={t.copyProjectName}
                shortcut={Keyboard.Shortcut.Common.CopyName}
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
                title={t.moveToTrash}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => handleTrashProject(item)}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title={showDetail ? t.showOverview : t.showDetail}
                icon={Icon.AppWindowSidebarRight}
                onAction={toggleDetail}
              />
              {showDetail && (
                <Action
                  title={detailDoc === "notes" ? t.showLyrics : t.showNotes}
                  icon={Icon.Text}
                  onAction={toggleDetailDoc}
                />
              )}
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
        <List.Dropdown tooltip={t.filter} value={selectedFilter} onChange={setSelectedFilter}>
          <List.Dropdown.Section title="">
            <List.Dropdown.Item title={t.all} value="all" icon={Icon.CircleProgress100} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title={t.stage}>
            {stageOptions.map((option) => (
              <List.Dropdown.Item
                key={`stage:${option.id}`}
                title={option.name}
                value={`stage:${option.id}`}
                keywords={["stage", "stages", t.stage]}
                icon={option.color ? { source: Icon.Circle, tintColor: option.color } : Icon.Circle}
              />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title={t.genre}>
            {genreOptions.map((option) => (
              <List.Dropdown.Item
                key={`genre:${option.id}`}
                title={option.name}
                value={`genre:${option.id}`}
                keywords={["genre", "genres", t.genre]}
                icon={option.color ? { source: Icon.Circle, tintColor: option.color } : Icon.Tag}
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
