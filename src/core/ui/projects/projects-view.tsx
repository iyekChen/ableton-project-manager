import {
  ActionPanel,
  Action,
  Clipboard,
  closeMainWindow,
  Color,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  environment,
  open,
  showToast,
  Toast,
  trash,
  useNavigation,
  Alert,
  confirmAlert,
  openExtensionPreferences,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import fs from "node:fs";
import { useAudioPlayer } from "@/core/ui/hooks/use-audio-player";
import { usePlaybackToast } from "@/core/ui/projects/use-playback-toast";
import { useCurrentSets } from "@/core/ui/projects/use-current-sets";
import { ONBOARDING_ASKED_KEY, ONBOARDING_UNMATCHED_KEY, useOnboarding } from "@/core/ui/projects/use-onboarding";
import { refreshDocFile, useDocWatcher } from "@/core/ui/hooks/use-doc-watcher";
import { ensureAudioPlayerBinary } from "@/core/audio/audio-player-path";
import { getSettings } from "@/settings";
import { deleteProjectMetadata, movePinnedProject, setProjectPinned } from "@/core/metadata/project-metadata";
import { removeProjectFromAllOrders } from "@/core/metadata/collection-order";
import { removeProjectFromAllRoles } from "@/core/metadata/collection-roles";
import { strings } from "@/strings";
import { PlayToggleAction } from "@/core/ui/actions/play-toggle";
import { PlaybackControlsSection } from "@/core/ui/actions/playback-controls";
import { DocActions } from "@/core/ui/actions/doc-actions";
import { CopyProjectSection } from "@/core/ui/actions/copy-project-section";
import { OpenProjectInFinderAction } from "@/core/ui/actions/open-project-in-finder";
import { ViewToggleSection } from "@/core/ui/actions/view-toggle";
import { SortBySubmenu } from "@/core/ui/actions/sort-by-submenu";
import { useSortOption } from "@/core/ui/hooks/use-sort-option";
import { useDetailView } from "@/core/ui/hooks/use-detail-view";
import { sortItems, sortOptionTitle } from "@/core/ui/shared/sorting";
import type { SortOption } from "@/core/ui/shared/sorting";
import { GroupBySubmenu } from "@/core/ui/actions/group-by-submenu";
import { useGroupOption } from "@/core/ui/hooks/use-group-option";
import { groupItems } from "@/core/ui/shared/grouping";
import { Bounces, UnmatchedBounces } from "@/core/ui/bounces";
import { displayDoc, missingDocFolder } from "@/core/docs/docs";
import { docPlaceholder } from "@/core/docs/doc-actions";
import { archiveDeletedProject, assertDeletionWritable } from "@/core/fs/deleted-projects";
import { showFailure } from "@/core/ui/shared/toast";
import { CollectionList } from "@/core/ui/collections";
import { CleanUpRemovedProjects } from "@/core/ui/cleanup";
import { EditInfo } from "@/core/ui/components/edit-info";
import { DuplicateProject } from "@/core/ui/projects/duplicate-project";
import { ManageExternalBounces } from "@/core/ui/components/manage-external-bounces";
import type { Project } from "@/core/projects/types";
import {
  readProjectListCache,
  sameFsFields,
  serializeProjectList,
  writeProjectListCache,
} from "@/core/projects/list-cache";
import { applyProjectMetadata, reloadProjectData } from "@/core/ui/shared/reload-projects";
import { findLatestProjectBounce, resolveSharedBouncesFolder } from "@/core/projects/bounces";
import { daw } from "@/daws";
import { SetsView, projectFilesInfo } from "@/daws/ui";
import { labels } from "@/daws/labels";
import { projectIcon } from "@/daws/icons";
import { openWithDaw } from "@/core/daw-app";
import { useDawApp } from "@/core/ui/hooks/use-daw-app";
import { useTaxonomies } from "@/core/ui/projects/use-taxonomies";
import { LOG_PREFIX } from "@/core/log";
import { optionKeywords } from "@/core/ui/shared/search-keywords";
import { findCurrentSet } from "@/core/projects/current-set";
import { formatDate } from "@/core/ui/shared/format";
import { itemLimit, limitGroups } from "@/core/ui/shared/progressive-list";
import { useProgressiveList } from "@/core/ui/hooks/use-progressive-list";
import {
  createdYears,
  filterByDropdown,
  matchProject,
  parseTagSearch,
  projectKeyWords,
  projectSearchTerms,
  splitPinned,
  tagNames,
} from "@/core/ui/projects/project-filter";

const settings = getSettings();
const PROJECTS_ROOT = settings.projectsFolder;
const SORT_STORAGE_KEY = "project-sort-option";
const GROUP_STORAGE_KEY = "project-group-option";
const VIEW_MODE_STORAGE_KEY = "view-mode:projects";
const DETAIL_DOC_STORAGE_KEY = "detail-doc:projects";
const PLAYER_PATH = ensureAudioPlayerBinary();

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

export function ProjectsView() {
  const { push } = useNavigation();
  const { stageOptions, genreOptions, collectionOptions, reloadCollections } = useTaxonomies();
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useSortOption(SORT_STORAGE_KEY, PROJECT_SORT_OPTIONS, "created-desc");
  const [groupBy, setGroupBy] = useGroupOption(GROUP_STORAGE_KEY, "created");
  // 冷启动先显示上次读到的列表，扫描完再替换。
  const [initialCache] = useState(() => readProjectListCache(PROJECTS_ROOT));
  const [projects, setProjects] = useState<Project[]>(() => initialCache ?? []);
  // 先渲染前 INITIAL_ITEM_COUNT 项，首帧之后补全；一打字也立刻补全。
  const { showAll, showAllNow } = useProgressiveList(projects.length);
  // 读到缓存时先不显示加载：扫描完发现没变化就什么都不做。
  const [isLoading, setIsLoading] = useState(initialCache === undefined);
  // 静默启动刷新：只在读到缓存的那一次刷新里为 true，结束后复位。
  const silentStartupRef = useRef(initialCache !== undefined);
  // 上次写进缓存的列表：打开时刚读出来的那份不重复写。
  const lastWrittenRef = useRef(initialCache);
  const [orphanIds, setOrphanIds] = useState<string[]>([]);
  // 默认 Detail；只有记过 Overview 才进 Overview。
  const { showDetail, toggleDetail, detailDoc, toggleDetailDoc } = useDetailView({
    viewModeKey: VIEW_MODE_STORAGE_KEY,
    detailDocKey: DETAIL_DOC_STORAGE_KEY,
    defaultMode: "detail",
  });
  const dawApp = useDawApp();
  const baseProjectsRef = useRef<Project[]>([]);
  // 每次渲染都更新：load() 的闭包里拿不到最新的 projects state。
  const projectsRef = useRef<Project[]>(projects);
  projectsRef.current = projects;
  // 每个项目「工程文件」这一层的信息（由 DAW 提供，没有这一层时为 null）。只在列表变化时重算，不在每次渲染时读磁盘。
  const projectFiles = useMemo(
    () => new Map(projects.map((project) => [project.id, projectFilesInfo(project)])),
    [projects],
  );
  // 残留数据提示每次打开只弹一次（fs.watch 触发的重载不再重复提示）。
  const leftoverToastShownRef = useRef(false);

  // 外部编辑器改了笔记 / 歌词：只重读那一份，详情面板马上跟着变。
  useDocWatcher(PROJECTS_ROOT, (file) => setProjects((prev) => refreshDocFile(prev, file)));

  const { playbackStatus, playingId, positionSeconds, durationSeconds, play, pause, resume, stop, seek, restart } =
    useAudioPlayer({
      playerPath: PLAYER_PATH,
    });

  const { isPlaybackToastActive } = usePlaybackToast(projects, {
    playbackStatus,
    playingId,
    positionSeconds,
    durationSeconds,
  });
  const { currentSets, readingSets, refreshCurrentSets } = useCurrentSets({ isPlaybackToastActive });

  // 静默启动刷新：内容没变就保留原引用，不触发重渲染，也不重写缓存。
  const commitProjects = useCallback((updated: Project[]) => {
    setProjects((prev) =>
      silentStartupRef.current && serializeProjectList(updated) === serializeProjectList(prev) ? prev : updated,
    );
  }, []);

  const applyMetadata = useCallback(async () => {
    const updated = await applyProjectMetadata(baseProjectsRef.current);
    commitProjects(updated);
  }, [commitProjects]);

  const runReload = useCallback(async (): Promise<string[]> => {
    try {
      const { orphans } = await reloadProjectData(PROJECTS_ROOT, trashingIds, {
        onScanned: (base) => {
          baseProjectsRef.current = base;
          // 静默启动刷新：磁盘上的项目有变化才显示加载。
          if (silentStartupRef.current && !sameFsFields(base, projectsRef.current)) setIsLoading(true);
        },
        onApplied: (updated, base) => {
          commitProjects(updated);
          // 不等它读完：列表先出来，Key / BPM 读到一个填一个。
          void refreshCurrentSets(base);
        },
      });
      setOrphanIds(orphans);
      return orphans;
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to load projects:`, error);
      setProjects([]);
      setOrphanIds([]);
      await showFailure(strings.loadProjectsFailed, error, { message: strings.loadProjectsFailedHint });
    } finally {
      // 静默启动刷新只做一次，成功失败都复位。
      silentStartupRef.current = false;
    }
    return [] as string[];
  }, [commitProjects, refreshCurrentSets]);

  // 同一时刻只跑一次：执行中再被触发（目录监听、返回刷新、保存回调）只记一笔，结束后补跑一次。
  // 避免两次 Finder 同步交错——后一次可能拿已被前一次清掉的空数据去覆盖删除记录。
  const reloadInFlightRef = useRef<Promise<string[]> | null>(null);
  const reloadPendingRef = useRef(false);

  const reloadProjects = useCallback((): Promise<string[]> => {
    if (reloadInFlightRef.current) {
      reloadPendingRef.current = true;
      return reloadInFlightRef.current;
    }
    const run = async (): Promise<string[]> => {
      let orphans = await runReload();
      while (reloadPendingRef.current) {
        reloadPendingRef.current = false;
        orphans = await runReload();
      }
      return orphans;
    };
    const promise = run().finally(() => {
      reloadInFlightRef.current = null;
    });
    reloadInFlightRef.current = promise;
    return promise;
  }, [runReload]);

  const { runOnboarding } = useOnboarding({ getProjects: () => projectsRef.current, reloadProjects });

  // 启动只加载一遍：依赖里的 push 每次渲染都是新函数，会让这个 effect 重跑。
  const startupDoneRef = useRef(false);

  useEffect(() => {
    if (startupDoneRef.current) return;
    startupDoneRef.current = true;
    async function load() {
      const orphans = await reloadProjects();
      setIsLoading(false);
      if (orphans.length > 0 && !leftoverToastShownRef.current) {
        leftoverToastShownRef.current = true;
        await showToast({
          style: Toast.Style.Success,
          title: strings.leftoversFound,
          message: strings.leftoversFoundMessage.replace("{count}", String(orphans.length)),
          primaryAction: {
            title: strings.cleanUpLeftovers,
            onAction: () => push(<CleanUpRemovedProjects />, () => void reloadProjects()),
          },
        });
      }
      await runOnboarding();
    }
    void load();
  }, [reloadProjects, push, runOnboarding]);

  // 列表刷新完就更新缓存：下次冷启动先显示这一份。
  useEffect(() => {
    if (isLoading) return;
    if (projects === lastWrittenRef.current) return;
    writeProjectListCache(PROJECTS_ROOT, projects);
    lastWrittenRef.current = projects;
  }, [isLoading, projects]);

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

  const playProjectBounce = useCallback(
    (project: Project) => {
      const latestBouncePath = findLatestProjectBounce(project);
      if (!latestBouncePath) {
        void showToast({ style: Toast.Style.Failure, title: strings.noBounces });
        return;
      }
      play(project.id, latestBouncePath, {
        onError: (message) => {
          void showFailure(strings.playbackFailed, message);
        },
      });
    },
    [play],
  );
  const copyLatestBounce = useCallback(async (project: Project) => {
    const latestBouncePath = findLatestProjectBounce(project);
    if (!latestBouncePath) {
      await showToast({ style: Toast.Style.Failure, title: strings.noBounces });
      return;
    }
    await Clipboard.copy({ file: latestBouncePath });
    await showToast({
      style: Toast.Style.Success,
      title: strings.bounceCopied,
      message: latestBouncePath.split("/").pop() ?? "",
    });
  }, []);

  // 和打开 Set 的其他入口一样：打开后关掉 Raycast 窗口。
  const openCurrentSet = useCallback(async (project: Project) => {
    const sets = daw.listSets(project);
    const set = findCurrentSet(sets);
    if (sets.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: labels.noSets });
      return;
    }
    try {
      // 找不到当前版本时（工程被手动改坏），打开任意一个，交给 DAW 自己决定打开哪个。只有记录了当前版本的 DAW 会走到这里。
      await openWithDaw((set ?? sets[0]).path);
      await closeMainWindow();
    } catch (error) {
      await showFailure(labels.openSetFailed, error);
    }
  }, []);

  const handlePinToggle = async (project: Project) => {
    await setProjectPinned(project.id, !project.pinned);
    await applyMetadata();
    await showToast({
      style: Toast.Style.Success,
      title: project.pinned ? strings.projectUnpinned : strings.projectPinned,
    });
  };

  const handleMovePinnedProject = async (project: Project, direction: "up" | "down") => {
    await movePinnedProject(project.id, direction);
    await applyMetadata();
  };

  const handleTrashProject = async (project: Project) => {
    const confirmed = await confirmAlert({
      title: strings.moveToTrash,
      icon: Icon.Trash,
      message: `${strings.trashProjectHint}\n${project.title}`,
      primaryAction: { title: strings.moveToTrash, style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    trashingIds.add(project.id);
    try {
      // 删除流程要写的存储先全部预检：有一份损坏就在动文件夹之前停下，什么都不改。
      await assertDeletionWritable();
      await trash(project.folderPath);
      // 先存档（标签/轨号/角色，并把自定义文件夹里的文档移进 Deleted Projects/），再清理残留数据。
      // 30 天内从废纸篓放回，下次加载会按「同名 + 同创建时间」识别并还原；同名新项目不受影响。
      await archiveDeletedProject(project);
      await deleteProjectMetadata(project.id);
      await removeProjectFromAllOrders(project.id);
      await removeProjectFromAllRoles(project.id);
      await reloadProjects();
      await showToast({ style: Toast.Style.Success, title: strings.movedToTrash, message: project.title });
    } catch (error) {
      await showFailure(strings.trashFailed, error);
    } finally {
      trashingIds.delete(project.id);
    }
  };

  // 搜索、筛选、排序都只读当前状态，计算本身在 project-filter.ts 里。
  const searchContext = { stageOptions, genreOptions, collectionOptions, currentSets };
  const searchTerms = (project: Project) => projectSearchTerms(project, searchContext);
  const keyWordsOf = (project: Project) => projectKeyWords(project, searchContext);

  // 以 # 开头时用组合搜索（每个词都要命中）；否则交给 Raycast 的模糊搜索。
  const { isTagSearch, isEmptyTagSearch, query } = parseTagSearch(searchText);
  const filteredByDropdown = filterByDropdown(projects, selectedFilter);
  const filteredProjects = isTagSearch
    ? filteredByDropdown.filter((project) => matchProject(project, query, searchContext))
    : filteredByDropdown;

  const { pinned: pinnedProjects, unpinned } = splitPinned(filteredProjects);
  const unpinnedProjects = sortItems(unpinned, sortBy, (project) => ({
    created: project.createdAt,
    modified: project.modifiedAt,
    name: project.title,
  }));

  // 每次渲染只查一次：笔记 / 歌词文件夹是否存在。占位文字按这个结果生成，不再逐项 existsSync。
  const missingDocFolders: Record<"notes" | "lyrics", string | null> = {
    notes: missingDocFolder("notes"),
    lyrics: missingDocFolder("lyrics"),
  };

  const renderProject = (item: Project) => {
    const stage = stageOptions.find((option) => option.id === item.stageId);
    const genreNames = tagNames(item.genreIds, genreOptions);
    const collectionNames = tagNames(item.collectionIds, collectionOptions);
    const current = currentSets[item.id];
    const currentBpm = current?.metadata?.bpm ?? null;
    const files = projectFiles.get(item.id) ?? null;
    const filesAccessories = files
      ? [
          { text: String(files.count), tooltip: `${files.count} ${files.labels.projectFiles}` },
          { icon: "package.png", tooltip: `${files.count} ${files.labels.projectFiles}` },
        ]
      : [];
    const stagePill = stage ? [{ tag: { value: stage.name, color: stage.color ?? Color.SecondaryText } }] : [];
    const detailBody = !showDetail ? "" : detailDoc === "notes" ? item.notes : item.lyrics;
    const detailPlaceholder = docPlaceholder(detailDoc, item.title, missingDocFolders[detailDoc]);

    const isThisPlaying = playingId === item.id;

    return (
      <List.Item
        key={item.id}
        icon={projectIcon(item.kind)}
        title={item.title}
        keywords={[...searchTerms(item), ...keyWordsOf(item)]}
        accessories={
          showDetail
            ? []
            : [
                ...stagePill,
                ...(files
                  ? filesAccessories
                  : [
                      { text: String(item.setsCount), tooltip: `${item.setsCount} ${labels.sets}` },
                      { icon: Icon.Document, tooltip: `${item.setsCount} ${labels.sets}` },
                    ]),
                { text: String(item.bouncesCount), tooltip: `${item.bouncesCount} Bounces` },
                { icon: Icon.Waveform, tooltip: `${item.bouncesCount} Bounces` },
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
                  {files ? (
                    <List.Item.Detail.Metadata.Label title={files.labels.projectFiles} text={String(files.count)} />
                  ) : (
                    <List.Item.Detail.Metadata.Label title={labels.sets} text={String(item.setsCount)} />
                  )}
                  <List.Item.Detail.Metadata.Separator />
                  {files ? (
                    <List.Item.Detail.Metadata.Label
                      title={files.labels.latestProjectFile}
                      text={current ? files.latestName(current.set.path) : ""}
                    />
                  ) : (
                    <List.Item.Detail.Metadata.Label title={labels.currentSet} text={current?.set.name ?? ""} />
                  )}
                  <List.Item.Detail.Metadata.Label title="Key" text={current?.metadata?.key ?? ""} />
                  <List.Item.Detail.Metadata.Label title="BPM" text={currentBpm === null ? "" : String(currentBpm)} />
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
              <Action.Push
                title={files ? files.labels.viewProjectFiles : labels.viewSets}
                icon={Icon.Document}
                target={<SetsView project={item} />}
                onPop={() => void reloadProjects()}
              />
              <PlayToggleAction
                isThisPlaying={isThisPlaying}
                playbackStatus={playbackStatus}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onPlay={() => playProjectBounce(item)}
                onPause={pause}
                onResume={resume}
              />
              <Action
                title={strings.browseBounces}
                icon={Icon.Waveform}
                shortcut={{ modifiers: ["opt"], key: "return" }}
                onAction={() => {
                  push(
                    <Bounces
                      projectId={item.id}
                      projectName={item.title}
                      projectPath={item.folderPath}
                      externalFolders={item.externalBounceFolders}
                      externalFiles={item.externalBounceFiles}
                      backTitle={strings.backToProjects}
                      onChanged={reloadProjects}
                    />,
                    () => void reloadProjects(),
                  );
                }}
              />
              <Action.Push
                title={strings.browseCollections}
                icon={Icon.Tray}
                shortcut={{ modifiers: ["ctrl"], key: "return" }}
                target={
                  <CollectionList
                    projects={projects}
                    collections={collectionOptions}
                    stages={stageOptions}
                    genres={genreOptions}
                  />
                }
                onPop={() => {
                  // 在合集里改过的名字、标签、成员，以及新建/改名的合集，返回时一并刷新。
                  void reloadProjects();
                  reloadCollections();
                }}
              />
              <Action
                title={files ? files.labels.openLatestProjectFile : labels.openCurrentSet}
                icon={dawApp ? { fileIcon: dawApp.path } : Icon.Document}
                shortcut={Keyboard.Shortcut.Common.Open}
                onAction={() => openCurrentSet(item)}
              />
            </ActionPanel.Section>
            <PlaybackControlsSection
              playingId={playingId}
              playbackStatus={playbackStatus}
              onStop={stop}
              onSeek={seek}
              onRestart={restart}
              onResume={resume}
            />
            <ActionPanel.Section title={strings.sectionDetails}>
              <Action.Push
                title={strings.editInfo}
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={<EditInfo project={item} onSaved={reloadProjects} />}
              />
              <DocActions project={item} onNoteSaved={reloadProjects} onLyricsSaved={reloadProjects} />
            </ActionPanel.Section>
            <ActionPanel.Section title={strings.sectionFile}>
              <OpenProjectInFinderAction kind={item.kind} folderPath={item.folderPath} />
              <Action
                title={labels.newProjectFile}
                icon={Icon.NewDocument}
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={async () => {
                  if (!dawApp) {
                    await showToast({ style: Toast.Style.Failure, title: labels.newProjectFileFailed });
                    return;
                  }
                  try {
                    await open(dawApp.path);
                  } catch (error) {
                    await showFailure(labels.newProjectFileFailed, error);
                  }
                }}
              />
              {daw.extraNewAction && (
                <Action.Push
                  title={daw.extraNewAction.title}
                  icon={daw.extraNewAction.icon}
                  shortcut={daw.extraNewAction.shortcut}
                  target={<daw.extraNewAction.component />}
                />
              )}
              <Action.Push
                title={strings.duplicateProject}
                icon={Icon.Duplicate}
                shortcut={Keyboard.Shortcut.Common.Duplicate}
                target={<DuplicateProject project={item} onDuplicated={reloadProjects} />}
              />
              <Action.Push
                title={strings.manageExternalBounce}
                icon={Icon.Link}
                shortcut={{ modifiers: ["cmd"], key: "b" }}
                target={
                  <ManageExternalBounces
                    projectId={item.id}
                    projectTitle={item.title}
                    externalFolders={item.externalBounceFolders}
                    externalFiles={item.externalBounceFiles}
                    onSaved={reloadProjects}
                  />
                }
              />
              {resolveSharedBouncesFolder() !== null && (
                <Action.Push
                  title={strings.unmatchedBounces}
                  icon={Icon.QuestionMarkCircle}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                  target={<UnmatchedBounces projects={projects} onChanged={() => void reloadProjects()} />}
                />
              )}
            </ActionPanel.Section>
            <CopyProjectSection project={item} onCopyLatestBounce={() => copyLatestBounce(item)} />
            <ActionPanel.Section title={strings.sectionPin}>
              <Action
                title={item.pinned ? strings.unpinProject : strings.pinProject}
                icon={item.pinned ? Icon.TackDisabled : Icon.Tack}
                shortcut={Keyboard.Shortcut.Common.Pin}
                onAction={() => handlePinToggle(item)}
              />
              {item.pinned && (
                <>
                  <Action
                    title={strings.moveUp}
                    icon={Icon.ArrowUp}
                    shortcut={Keyboard.Shortcut.Common.MoveUp}
                    onAction={() => handleMovePinnedProject(item, "up")}
                  />
                  <Action
                    title={strings.moveDown}
                    icon={Icon.ArrowDown}
                    shortcut={Keyboard.Shortcut.Common.MoveDown}
                    onAction={() => handleMovePinnedProject(item, "down")}
                  />
                </>
              )}
            </ActionPanel.Section>
            <ViewToggleSection
              showDetail={showDetail}
              detailDoc={detailDoc}
              onToggleDetail={toggleDetail}
              onToggleDetailDoc={toggleDetailDoc}
            />
            <ActionPanel.Section title={strings.sectionArrange}>
              <GroupBySubmenu allowed={["modified", "created"]} value={groupBy} onChange={setGroupBy} />
              <SortBySubmenu allowed={PROJECT_SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
            </ActionPanel.Section>
            <ActionPanel.Section title={strings.sectionDangerZone}>
              {orphanIds.length > 0 && (
                <Action.Push
                  title={strings.cleanUpLeftovers}
                  icon={Icon.Eraser}
                  target={<CleanUpRemovedProjects />}
                  onPop={() => void reloadProjects()}
                />
              )}
              <Action
                title={strings.moveToTrash}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => handleTrashProject(item)}
              />
            </ActionPanel.Section>
            {environment.isDevelopment && (
              <ActionPanel.Section>
                <Action
                  title="Reset Onboarding (Dev)"
                  icon={Icon.ArrowCounterClockwise}
                  onAction={async () => {
                    await LocalStorage.removeItem(ONBOARDING_ASKED_KEY);
                    await LocalStorage.removeItem(ONBOARDING_UNMATCHED_KEY);
                    await showToast({ style: Toast.Style.Success, title: "Onboarding Reset" });
                  }}
                />
              </ActionPanel.Section>
            )}
          </ActionPanel>
        }
      />
    );
  };

  const currentSortTitle = sortOptionTitle(sortBy);
  // Filter 的 Created 分组只列出有项目的年份，新的在前。
  const years = createdYears(projects);

  const groups = groupItems(
    unpinnedProjects,
    groupBy,
    (p) => ({ created: p.createdAt, modified: p.modifiedAt }),
    currentSortTitle,
  );
  // 先渲染前 INITIAL_ITEM_COUNT 项，首帧之后补全。分组和排序已完成，只截掉最后渲染的部分。
  const limit = itemLimit(showAll);
  const renderPinned = pinnedProjects.slice(0, limit);
  const renderGroups = limitGroups(groups, limit - renderPinned.length);

  return (
    <List
      isLoading={isLoading || readingSets}
      isShowingDetail={showDetail}
      filtering={!isTagSearch}
      onSearchTextChange={(text) => {
        setSearchText(text);
        // 一打字就补全，不等计时器。
        if (text) showAllNow();
      }}
      searchBarPlaceholder={strings.searchProjectsPlaceholder}
      searchBarAccessory={
        <List.Dropdown tooltip={strings.filter} value={selectedFilter} onChange={setSelectedFilter}>
          <List.Dropdown.Section title="">
            <List.Dropdown.Item title={strings.all} value="all" icon={Icon.CircleProgress100} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title={strings.stage}>
            {stageOptions.map((option) => (
              <List.Dropdown.Item
                key={`stage:${option.id}`}
                title={option.name}
                value={`stage:${option.id}`}
                keywords={["stage", "stages", strings.stage, ...optionKeywords(option)]}
                icon={option.color ? { source: Icon.Circle, tintColor: option.color } : Icon.Circle}
              />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title={strings.genre}>
            {genreOptions.map((option) => (
              <List.Dropdown.Item
                key={`genre:${option.id}`}
                title={option.name}
                value={`genre:${option.id}`}
                keywords={["genre", "genres", strings.genre, ...optionKeywords(option)]}
                icon={option.color ? { source: Icon.Circle, tintColor: option.color } : Icon.Tag}
              />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title={strings.created}>
            {years.map((year) => (
              <List.Dropdown.Item
                key={`created:${year}`}
                title={String(year)}
                value={`created:${year}`}
                keywords={["created", "year", strings.created]}
                icon={Icon.Calendar}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {!isLoading && projects.length === 0 && (
        <List.EmptyView
          icon="icon.png"
          title={labels.noProjectsFound}
          description={labels.noProjectsFoundHint.replace("{folder}", PROJECTS_ROOT)}
          actions={
            <ActionPanel>
              <Action title={strings.openPreferences} icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action.Open title={strings.openProjectsFolder} icon={Icon.Finder} target={PROJECTS_ROOT} />
            </ActionPanel>
          }
        />
      )}
      {isEmptyTagSearch && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={strings.advancedSearch}
          description={strings.advancedSearchHint}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title={strings.openReadme} icon={Icon.Book} url={daw.readmeUrl} />
            </ActionPanel>
          }
        />
      )}
      {!isEmptyTagSearch && renderPinned.length > 0 && (
        <List.Section title={strings.pinned}>{renderPinned.map(renderProject)}</List.Section>
      )}
      {!isEmptyTagSearch &&
        renderGroups.map((group) => (
          <List.Section key={group.key} title={group.title} subtitle={group.subtitle}>
            {group.items.map(renderProject)}
          </List.Section>
        ))}
    </List>
  );
}
