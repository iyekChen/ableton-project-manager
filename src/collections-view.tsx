import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  Toast,
  confirmAlert,
  environment,
  getPreferenceValues,
  open,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "node:fs";
import path from "node:path";
import { getTranslations } from "./i18n";
import type { Project } from "./projects/types";
import type { TaxonomyOption } from "./taxonomy";
import {
  TrackMap,
  assignNumber,
  getTrackMap,
  nextNumber,
  removeNumber,
  removeTrackMap,
  setTrackMap,
  swapNumbers,
} from "./collection-order";
import { RoleMap, assignRole, clearRole, getRoleMap, removeRoleMap, setRoleMap } from "./collection-roles";
import { ENERGY_ENABLED, TrackInfo, energyLevelFromScore, energyScore, loadTrackInfos } from "./projects/track-info";
import { useAudioPlayer } from "./hooks/use-audio-player";
import { ensureAudioPlayerBinary } from "./audio-player-path";
import { findLatestBounce, resolveBouncesFolder } from "./projects/bounces";
import { displayDoc, readDocFile, stripFrontmatter } from "./docs";
import { docPlaceholder, openDoc } from "./doc-actions";
import {
  getPinnedCollections,
  movePinnedCollection,
  removePinnedCollection,
  togglePinnedCollection,
} from "./collection-pins";
import { collectionTaxonomy } from "./taxonomies";
import { getAllProjectMetadata, saveProjectMetadata } from "./project-metadata";
import { EditInfo, type ProjectRename } from "./components/project/edit-info";
import { EditNote } from "./components/project/edit-note";

const t = getTranslations(getPreferenceValues<{ language: Parameters<typeof getTranslations>[0] }>().language);

type Collection = { id: string; name: string };

const VIEW_MODE_STORAGE_KEY = "view-mode:collections";
const DETAIL_DOC_STORAGE_KEY = "detail-doc:collections";
const PLAYER_PATH = ensureAudioPlayerBinary();
const SEEK_STEP_SECONDS = 5;

// 固定的冷→暖位置色模板：每个圆点槽位颜色固定，所有 Project 一致。
// 槽位 1→5：最冷 → 次冷 → 中性 → 次暖 → 最暖。
const ENERGY_SLOT_COLORS: Color[] = [Color.Blue, Color.Green, Color.Yellow, Color.Orange, Color.Red];

function formatDuration(totalSeconds: number, minuteDigits = 1): string {
  const s = Math.round(totalSeconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(minuteDigits, "0")}:${String(seconds).padStart(2, "0")}`;
}

// 返回 5 个圆点 accessory：槽位 i < level 的点亮（显示该槽位的冷→暖色），其余留空（无色）。
// level 为 null（无数据 / 分析中 / 本专辑暂无可定尺的曲目）→ 全部空点占位，保持右侧列对齐。
function energyAccessories(level: number | null): List.Item.Accessory[] {
  return ENERGY_SLOT_COLORS.map((color, i) => {
    const filled = level !== null && i < level;
    return filled ? { text: { value: "●", color } } : { text: { value: "○", color: Color.SecondaryText } };
  });
}

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return slug || name.trim().toLowerCase();
}

// 合集名比较：忽略首尾空格与大小写。
function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function CollectionNameForm(props: {
  title: string;
  currentName?: string;
  onSubmit: (name: string) => Promise<boolean>;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");

  return (
    <Form
      navigationTitle={props.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t.save}
            onSubmit={async () => {
              const trimmed = name.trim();
              if (trimmed === "") {
                // 留空：重命名时视为不改动直接返回；新建时提示名称无效。
                if (props.currentName !== undefined) {
                  pop();
                  return;
                }
                await showToast({ style: Toast.Style.Failure, title: t.invalidName });
                return;
              }
              // 返回 false（如重名）时留在表单里，方便直接改。
              if (await props.onSubmit(trimmed)) pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={t.name} placeholder={props.currentName} value={name} onChange={setName} />
    </Form>
  );
}

export function CollectionList({
  projects: initialProjects,
  collections: initialCollections,
  stages,
}: {
  projects: Project[];
  collections: Collection[];
  stages: TaxonomyOption[];
}) {
  const { pop } = useNavigation();
  const [collections, setCollections] = useState<Collection[]>(initialCollections);
  // 推入时拿到的是快照；合集面板里的改动会通过 onProjectsChanged 回传到这里。
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  useEffect(() => {
    void getPinnedCollections().then(setPinnedIds);
  }, []);

  async function reloadCollections() {
    setCollections(await collectionTaxonomy.get());
  }

  async function togglePin(id: string) {
    setPinnedIds(await togglePinnedCollection(id));
  }

  async function movePin(id: string, direction: "up" | "down") {
    setPinnedIds(await movePinnedCollection(id, direction));
  }

  // 按显示名判重（不区分大小写）。id 仍由 slug 生成；slug 撞了就加 -2、-3…，避免 Demo! 与 Demo 被误判重名。
  async function createCollection(name: string): Promise<boolean> {
    const current = await collectionTaxonomy.get();
    if (current.some((o) => sameName(o.name, name))) {
      await showToast({ style: Toast.Style.Failure, title: t.collectionNameExists });
      return false;
    }
    const base = slugify(name);
    let id = base;
    for (let n = 2; current.some((o) => o.id === id); n++) {
      id = `${base}-${n}`;
    }
    const option: TaxonomyOption = { id, name };
    await collectionTaxonomy.save([...current, option]);
    await reloadCollections();
    await showToast({ style: Toast.Style.Success, title: t.created });
    return true;
  }

  async function renameCollection(id: string, name: string): Promise<boolean> {
    const current = await collectionTaxonomy.get();
    if (current.some((o) => o.id !== id && sameName(o.name, name))) {
      await showToast({ style: Toast.Style.Failure, title: t.collectionNameExists });
      return false;
    }
    await collectionTaxonomy.save(current.map((o) => (o.id === id ? { ...o, name } : o)));
    await reloadCollections();
    await showToast({ style: Toast.Style.Success, title: t.renamed });
    return true;
  }

  async function deleteCollection(c: Collection) {
    const confirmed = await confirmAlert({
      icon: { source: Icon.Trash, tintColor: Color.Red },
      title: `${t.delete} “${c.name}”?`,
      message: t.deleteCollectionHint,
      primaryAction: { title: t.delete, style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const current = await collectionTaxonomy.get();
    await collectionTaxonomy.save(current.filter((o) => o.id !== c.id));

    // 清理与该合集 id 关联的残留数据，避免重建同名合集（slug 得出同 id）时旧状态复活。
    const store = await getAllProjectMetadata();
    await Promise.all(
      Object.entries(store)
        .filter(([, meta]) => (meta.collectionIds ?? []).includes(c.id))
        .map(([projectId, meta]) =>
          saveProjectMetadata(projectId, {
            ...meta,
            collectionIds: (meta.collectionIds ?? []).filter((id) => id !== c.id),
          }),
        ),
    );
    await removeTrackMap(c.id);
    await removeRoleMap(c.id);
    setPinnedIds(await removePinnedCollection(c.id));

    await reloadCollections();
    await showToast({ style: Toast.Style.Success, title: t.deleted });
  }

  const createAction = (
    <Action.Push
      title={t.create}
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<CollectionNameForm title={t.create} onSubmit={createCollection} />}
    />
  );

  const pinnedCollections = pinnedIds
    .map((id) => collections.find((c) => c.id === id))
    .filter((c): c is Collection => c !== undefined);
  const unpinnedCollections = collections.filter((c) => !pinnedIds.includes(c.id));

  const renderItem = (c: Collection, options: { isPinned: boolean; index: number; total: number }) => {
    const count = projects.filter((p) => p.collectionIds.includes(c.id)).length;
    return (
      <List.Item
        key={c.id}
        icon="collection.png"
        title={c.name}
        accessories={[{ text: count === 1 ? "1 Track(s)" : `${count} Track(s)` }]}
        actions={
          <ActionPanel>
            <Action.Push
              title={t.open}
              icon={Icon.Cd}
              target={
                <CollectionPanel collection={c} projects={projects} stages={stages} onProjectsChanged={setProjects} />
              }
            />
            <Action.Push
              title={t.rename}
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={
                <CollectionNameForm
                  title={t.rename}
                  currentName={c.name}
                  onSubmit={(name) => renameCollection(c.id, name)}
                />
              }
            />
            {createAction}
            <Action
              title={options.isPinned ? t.unpinProject : t.pinProject}
              icon={options.isPinned ? Icon.TackDisabled : Icon.Tack}
              shortcut={Keyboard.Shortcut.Common.Pin}
              onAction={() => togglePin(c.id)}
            />
            {options.isPinned && options.index > 0 && (
              <Action
                title={t.moveUp}
                icon={Icon.ArrowUp}
                shortcut={Keyboard.Shortcut.Common.MoveUp}
                onAction={() => movePin(c.id, "up")}
              />
            )}
            {options.isPinned && options.index < options.total - 1 && (
              <Action
                title={t.moveDown}
                icon={Icon.ArrowDown}
                shortcut={Keyboard.Shortcut.Common.MoveDown}
                onAction={() => movePin(c.id, "down")}
              />
            )}
            <ActionPanel.Section>
              <Action
                title={t.delete}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => deleteCollection(c)}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title={t.backToProjects}
                icon={Icon.ArrowLeftCircle}
                shortcut={{ modifiers: ["ctrl"], key: "return" }}
                onAction={pop}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List navigationTitle={t.browseCollections}>
      {collections.length === 0 ? (
        <List.EmptyView title={t.noCategories} actions={<ActionPanel>{createAction}</ActionPanel>} />
      ) : (
        <>
          {pinnedCollections.length > 0 && (
            <List.Section title={t.pinned}>
              {pinnedCollections.map((c, index) =>
                renderItem(c, { isPinned: true, index, total: pinnedCollections.length }),
              )}
            </List.Section>
          )}
          <List.Section title={t.collections}>
            {unpinnedCollections.map((c) =>
              renderItem(c, { isPinned: false, index: 0, total: unpinnedCollections.length }),
            )}
          </List.Section>
        </>
      )}
    </List>
  );
}

function CollectionPanel({
  collection,
  projects,
  stages,
  onProjectsChanged,
}: {
  collection: Collection;
  projects: Project[];
  stages: TaxonomyOption[];
  onProjectsChanged?: (projects: Project[]) => void;
}) {
  const { pop } = useNavigation();
  const [projectList, setProjectList] = useState<Project[]>(projects);

  // 面板里的改动（改名、标签、成员增减、笔记）回传给 Browse Collections，再次打开合集时不会用到旧快照。
  useEffect(() => {
    onProjectsChanged?.(projectList);
  }, [projectList, onProjectsChanged]);
  const members = projectList.filter((p) => p.collectionIds.includes(collection.id));
  const [map, setMap] = useState<TrackMap>({});
  const [roles, setRoles] = useState<RoleMap>({});
  const [infos, setInfos] = useState<Record<string, TrackInfo>>({});
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(true);
  const [detailDoc, setDetailDoc] = useState<"notes" | "lyrics">("notes");
  const [selectedStage, setSelectedStage] = useState("all");
  const { playbackStatus, playingId, play, pause, resume, stop, seek, restart } = useAudioPlayer({
    playerPath: PLAYER_PATH,
  });
  function playProjectBounce(project: Project) {
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
  }

  // 主操作：未播→播；本行正在播→暂停/续播。放每个 item 的第二个 Action（拿 ⌘Enter）。
  async function copyLatestBounce(project: Project) {
    const latestBouncePath = findLatestBounce(resolveBouncesFolder(project.folderPath));
    if (!latestBouncePath) {
      void showToast({ style: Toast.Style.Failure, title: t.noBounces });
      return;
    }
    await Clipboard.copy({ file: latestBouncePath });
    void showToast({
      style: Toast.Style.Success,
      title: t.bounceCopied,
      message: latestBouncePath.split("/").pop() ?? "",
    });
  }
  const renderPlayToggle = (p: Project) => {
    const isThisPlaying = playingId === p.id;
    const toggleIsPause = isThisPlaying && (playbackStatus === "Playing" || playbackStatus === "Starting");
    const title = isThisPlaying
      ? playbackStatus === "Paused"
        ? t.resumePlayback
        : playbackStatus === "Stopping"
          ? t.stoppingPlayback
          : t.pausePlayback
      : t.playLatestBounce;
    return (
      <Action
        title={title}
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
          playProjectBounce(p);
        }}
      />
    );
  };

  // 播放时才出现的停止、seek / restart 控制，作用于全局播放器。
  const renderPlaybackControls = () =>
    playingId !== null ? (
      <ActionPanel.Section>
        <Action title={t.stopPlayback} icon={Icon.Stop} shortcut={{ modifiers: ["cmd"], key: "-" }} onAction={stop} />
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
    ) : null;

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

  useEffect(() => {
    let cancelled = false;
    const memberList = projects.filter((p) => p.collectionIds.includes(collection.id));
    async function load() {
      const [trackMap, roleMap] = await Promise.all([getTrackMap(collection.id), getRoleMap(collection.id)]);
      if (cancelled) return;
      setMap(trackMap);
      setRoles(roleMap);
      setLoading(false);
      await loadTrackInfos(
        memberList,
        (projectId, info) => {
          if (cancelled) return;
          setInfos((prev) => ({ ...prev, [projectId]: info }));
        },
        () => cancelled,
      );
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [collection.id, projects]);

  function toggleDetail() {
    setShowDetail((prev) => {
      const next = !prev;
      void LocalStorage.setItem(VIEW_MODE_STORAGE_KEY, next ? "detail" : "overview");
      return next;
    });
  }

  function toggleDetailDoc() {
    setDetailDoc((prev) => {
      const next = prev === "notes" ? "lyrics" : "notes";
      void LocalStorage.setItem(DETAIL_DOC_STORAGE_KEY, next);
      return next;
    });
  }

  async function apply(next: TrackMap) {
    setMap(next);
    await setTrackMap(collection.id, next);
  }

  async function applyRoles(next: RoleMap) {
    setRoles(next);
    await setRoleMap(collection.id, next);
  }

  // Edit Info 存盘后：从 LocalStorage 重读成员的 Stage/Genre/Collection（含成员增减）。
  async function reloadMetadata(rename?: ProjectRename) {
    const store = await getAllProjectMetadata();
    // Edit Info 可能改了名（轨号/角色迁到新 id），或把本曲移出了合集（轨号/角色被清掉）：
    // 一律从存储重读，避免内存里的旧表在下次 apply() 时把这些改动覆盖回去。
    const [trackMap, roleMap] = await Promise.all([getTrackMap(collection.id), getRoleMap(collection.id)]);
    setMap(trackMap);
    setRoles(roleMap);
    if (rename) {
      setInfos((prev) => (rename.oldId in prev ? { ...prev, [rename.newId]: prev[rename.oldId] } : prev));
    }
    setProjectList((prev) =>
      prev.map((item) => {
        const p =
          rename && item.id === rename.oldId
            ? { ...item, id: rename.newId, title: rename.newId, folderPath: rename.folderPath }
            : item;
        const meta = store[p.id];
        return meta
          ? {
              ...p,
              stageId: meta.stageId ?? null,
              genreIds: meta.genreIds ?? [],
              collectionIds: meta.collectionIds ?? [],
            }
          : p;
      }),
    );
  }

  // Edit Note 存盘后：重读该曲目的 Note 正文，让详情面板即时回显。
  function reloadNote(project: Project) {
    const notes = stripFrontmatter(readDocFile(project, "notes"));
    setProjectList((prev) => prev.map((p) => (p.id === project.id ? { ...p, notes } : p)));
  }

  // 从 tracklist 移出时，连带清掉该曲目在本 collection 的角色。
  async function removeFromTracklist(id: string) {
    await apply(removeNumber(map, id));
    await applyRoles(clearRole(roles, id));
  }

  // 按 Track Number 顺序（tracked 在前，unsorted 在后）把成员的 latest bounce 写成 .m3u，
  // 交系统默认 App 打开。不支持无播放列表的播放器（如 QuickTime Player）——见 README。
  async function queueCollection() {
    const entries: { title: string; path: string; duration: number }[] = [];
    for (const p of [...tracked, ...unsorted]) {
      const bounce = findLatestBounce(resolveBouncesFolder(p.folderPath));
      if (bounce) {
        entries.push({ title: p.title, path: bounce, duration: infos[p.id]?.duration ?? -1 });
      }
    }

    if (entries.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: t.noBounces });
      return;
    }

    const lines = ["#EXTM3U"];
    for (const e of entries) {
      lines.push(`#EXTINF:${Math.round(e.duration)},${e.title}`);
      lines.push(e.path);
    }

    const safeName = collection.name.replace(/[/:]/g, "-") || collection.id;
    const playlistPath = path.join(environment.supportPath, `${safeName}.m3u`);

    try {
      fs.writeFileSync(playlistPath, lines.join("\n") + "\n");
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: t.queueFailed,
        message: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    await open(playlistPath);

    const skipped = tracked.length + unsorted.length - entries.length;
    await showToast({
      style: Toast.Style.Success,
      title: t.collectionQueued,
      message:
        skipped > 0
          ? `${entries.length} ${t.tracksWord} · ${skipped} ${t.skippedNoBounce}`
          : `${entries.length} ${t.tracksWord}`,
    });
  }

  const renderQueueCollection = () => (
    <ActionPanel.Section>
      <Action
        title={t.queueCollection}
        icon={Icon.List}
        shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
        onAction={queueCollection}
      />
    </ActionPanel.Section>
  );

  // 角色 pill（设了才显示，放在 accessories 最左）。
  const rolePill = (p: Project): List.Item.Accessory[] => {
    const role = roles[p.id];
    return role ? [{ tag: { value: role, color: Color.SecondaryText } }] : [];
  };

  // 打开 Note / Lyrics 的外部编辑动作。Note 文件存在才出现；Lyrics 打开即建（可套模板）。
  const renderDocActions = (p: Project) => (
    <ActionPanel.Section>
      <Action
        title={t.openNote}
        icon={Icon.Document}
        shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
        onAction={async () => {
          await openDoc(p, "notes");
        }}
      />
      <Action
        title={t.openLyrics}
        icon={Icon.Music}
        shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        onAction={async () => {
          await openDoc(p, "lyrics");
        }}
      />
    </ActionPanel.Section>
  );

  // 视图切换 Action（Detail / Overview，本视图独立记忆）。
  const renderViewToggle = () => (
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
    </ActionPanel.Section>
  );

  // 返回 Search Projects（跨层直接回根视图）。
  const renderBackToProjects = () => (
    <ActionPanel.Section>
      <Action
        title={t.backToProjects}
        icon={Icon.ArrowLeftCircle}
        shortcut={{ modifiers: ["ctrl"], key: "return" }}
        onAction={() => {
          pop();
          setTimeout(() => pop(), 0);
        }}
      />
    </ActionPanel.Section>
  );

  const tracked = members
    .filter((p) => map[p.id] !== undefined)
    .sort((a, b) => map[a.id] - map[b.id] || a.title.localeCompare(b.title));
  const unsorted = members.filter((p) => map[p.id] === undefined).sort((a, b) => a.title.localeCompare(b.title));

  // 统计每个号被几首占用(用于撞号高亮)
  const counts = new Map<number, number>();
  for (const p of tracked) counts.set(map[p.id], (counts.get(map[p.id]) ?? 0) + 1);

  // 能量定档的尺：对已排序曲目的各特征分别取 min/max。
  const crests = tracked.map((p) => infos[p.id]?.crest).filter((v): v is number => typeof v === "number");
  const crestRange = { min: crests.length ? Math.min(...crests) : 0, max: crests.length ? Math.max(...crests) : 0 };
  const brightnesses = tracked.map((p) => infos[p.id]?.brightness).filter((v): v is number => typeof v === "number");
  const brightnessRange = {
    min: brightnesses.length ? Math.min(...brightnesses) : 0,
    max: brightnesses.length ? Math.max(...brightnesses) : 0,
  };
  const activities = tracked.map((p) => infos[p.id]?.activity).filter((v): v is number => typeof v === "number");
  const activityRange = {
    min: activities.length ? Math.min(...activities) : 0,
    max: activities.length ? Math.max(...activities) : 0,
  };

  // 总时长：所有已排序曲目（含 Draft/Demo）。
  const totalSeconds = tracked.reduce((sum, p) => sum + (infos[p.id]?.duration ?? 0), 0);
  const tracklistTitle = totalSeconds > 0 ? `${t.tracklistDuration} ${formatDuration(totalSeconds)}` : t.tracklist;

  // 分钟位宽：本合集任一曲目 ≥ 10 分钟则补两位，保证时长列对齐。
  const longestTrackSeconds = members.reduce((max, p) => Math.max(max, infos[p.id]?.duration ?? 0), 0);
  const durationMinuteDigits = longestTrackSeconds >= 600 ? 2 : 1;
  const durationPlaceholder = durationMinuteDigits === 2 ? "--:--" : "-:--";

  const matchesStage = (p: Project) => selectedStage === "all" || p.stageId === selectedStage;

  // 单首曲目的 Detail 面板：Note 作 markdown 主体，其余作 metadata。缺数据的字段留标题、值空白。
  const renderDetail = (p: Project) => {
    const info = infos[p.id];
    const role = roles[p.id];
    const stage = stages.find((s) => s.id === p.stageId);
    const isTracked = map[p.id] !== undefined;
    let level: number | null = null;
    if (isTracked && info) {
      const score = energyScore(info, crestRange, brightnessRange, activityRange);
      if (score !== null) level = energyLevelFromScore(score);
    }
    const detailBody = detailDoc === "notes" ? (p.notes ?? "") : stripFrontmatter(readDocFile(p, "lyrics"));
    const detailPlaceholder = docPlaceholder(detailDoc, p.title);

    return (
      <List.Item.Detail
        markdown={detailBody.trim() ? displayDoc(detailBody) : detailPlaceholder}
        metadata={
          <List.Item.Detail.Metadata>
            {stage ? (
              <List.Item.Detail.Metadata.TagList title="Stage">
                <List.Item.Detail.Metadata.TagList.Item text={stage.name} color={stage.color ?? Color.SecondaryText} />
              </List.Item.Detail.Metadata.TagList>
            ) : (
              <List.Item.Detail.Metadata.Label title="Stage" text="" />
            )}
            <List.Item.Detail.Metadata.Label
              title="Duration"
              text={info?.duration != null ? formatDuration(info.duration, durationMinuteDigits) : ""}
            />
            <List.Item.Detail.Metadata.Label title="Role" text={role ?? ""} />
            <List.Item.Detail.Metadata.Label title="BPM" text={info?.bpm != null ? String(info.bpm) : ""} />
            <List.Item.Detail.Metadata.Label title="Key" text={info?.key ?? ""} />
            <List.Item.Detail.Metadata.Label title="Time Signature" text={info?.timeSignature ?? ""} />
            {ENERGY_ENABLED && level !== null && (
              <List.Item.Detail.Metadata.TagList title="Energy">
                {ENERGY_SLOT_COLORS.map((color, i) => (
                  <List.Item.Detail.Metadata.TagList.Item
                    key={i}
                    text="●"
                    color={level !== null && i < level ? color : Color.SecondaryText}
                  />
                ))}
              </List.Item.Detail.Metadata.TagList>
            )}
          </List.Item.Detail.Metadata>
        }
      />
    );
  };

  return (
    <List
      navigationTitle={collection.name}
      isLoading={loading}
      isShowingDetail={showDetail}
      searchBarAccessory={
        <List.Dropdown tooltip={t.filterByStage} value={selectedStage} onChange={setSelectedStage}>
          <List.Dropdown.Item title={t.allStages} value="all" icon={Icon.CircleProgress100} />
          {stages.map((option) => (
            <List.Dropdown.Item
              key={option.id}
              title={option.name}
              value={option.id}
              icon={option.color ? { source: Icon.Circle, tintColor: option.color } : Icon.Circle}
            />
          ))}
        </List.Dropdown>
      }
    >
      {tracked.length === 0 && unsorted.length === 0 ? (
        <List.EmptyView title={t.noCategories} />
      ) : (
        <>
          {tracked.length > 0 && (
            <List.Section title={tracklistTitle}>
              {tracked.map((p, i) => {
                if (!matchesStage(p)) return null;
                const num = map[p.id];
                const dup = (counts.get(num) ?? 0) > 1;
                const info = infos[p.id];
                let level: number | null = null;
                if (info) {
                  const score = energyScore(info, crestRange, brightnessRange, activityRange);
                  if (score !== null) level = energyLevelFromScore(score);
                }
                const accessories: List.Item.Accessory[] = [
                  ...rolePill(p),
                  ...(dup
                    ? [
                        {
                          icon: { source: Icon.Warning, tintColor: Color.Yellow },
                          tooltip: t.duplicateTrack,
                        } as List.Item.Accessory,
                      ]
                    : []),
                  { text: `Track ${String(num).padStart(2, "0")}` },
                  {
                    text:
                      info?.duration != null
                        ? formatDuration(info.duration, durationMinuteDigits)
                        : durationPlaceholder,
                  },
                  ...(ENERGY_ENABLED ? energyAccessories(level) : []),
                ];
                return (
                  <List.Item
                    key={p.id}
                    icon="icon.png"
                    title={p.title}
                    accessories={showDetail ? [] : accessories}
                    detail={showDetail ? renderDetail(p) : undefined}
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title={t.setTrackNumber}
                          icon={Icon.Hashtag}
                          target={
                            <SetTrackNumberForm
                              current={num}
                              onSubmit={(n) =>
                                n === null ? removeFromTracklist(p.id) : apply(assignNumber(map, p.id, n))
                              }
                            />
                          }
                        />
                        {renderPlayToggle(p)}
                        <Action
                          title={t.copyLatestBounce}
                          icon={Icon.CopyClipboard}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                          onAction={() => copyLatestBounce(p)}
                        />
                        <Action.Push
                          title={t.editInfo}
                          icon={Icon.Pencil}
                          shortcut={Keyboard.Shortcut.Common.Edit}
                          target={
                            <EditInfo
                              project={p}
                              onSaved={reloadMetadata}
                              collectionId={collection.id}
                              currentRole={roles[p.id]}
                              onRoleChanged={async (nextRole, projectId) => {
                                // 读存储里的最新表（同一次保存可能刚做过改名迁移），按 EditInfo 给的 id 写入。
                                const fresh = await getRoleMap(collection.id);
                                await applyRoles(
                                  nextRole ? assignRole(fresh, projectId, nextRole) : clearRole(fresh, projectId),
                                );
                              }}
                            />
                          }
                        />
                        <Action.Push
                          title={t.editNote}
                          icon={Icon.Pencil}
                          shortcut={{ modifiers: ["cmd", "opt"], key: "n" }}
                          target={<EditNote project={p} onSaved={() => reloadNote(p)} />}
                        />
                        <Action
                          title={t.removeFromTracklist}
                          icon={Icon.MinusCircle}
                          shortcut={Keyboard.Shortcut.Common.Pin}
                          onAction={() => removeFromTracklist(p.id)}
                        />
                        {renderPlaybackControls()}
                        <ActionPanel.Section>
                          {i > 0 && (
                            <Action
                              title={t.swapUp}
                              icon={Icon.ArrowUp}
                              shortcut={Keyboard.Shortcut.Common.MoveUp}
                              onAction={() => apply(swapNumbers(map, p.id, tracked[i - 1].id))}
                            />
                          )}
                          {i < tracked.length - 1 && (
                            <Action
                              title={t.swapDown}
                              icon={Icon.ArrowDown}
                              shortcut={Keyboard.Shortcut.Common.MoveDown}
                              onAction={() => apply(swapNumbers(map, p.id, tracked[i + 1].id))}
                            />
                          )}
                          {i < tracked.length - 1 && (
                            <Action
                              title={t.moveToBottom}
                              icon={Icon.ArrowDownCircle}
                              onAction={() => apply(assignNumber(map, p.id, nextNumber(map)))}
                            />
                          )}
                        </ActionPanel.Section>
                        {renderDocActions(p)}
                        {renderViewToggle()}
                        {renderQueueCollection()}
                        {renderBackToProjects()}
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}
          {unsorted.length > 0 && (
            <List.Section title={t.unsorted}>
              {unsorted.map((p) => {
                if (!matchesStage(p)) return null;
                return (
                  <List.Item
                    key={p.id}
                    icon="icon.png"
                    title={p.title}
                    detail={showDetail ? renderDetail(p) : undefined}
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title={t.setTrackNumber}
                          icon={Icon.Hashtag}
                          target={
                            <SetTrackNumberForm
                              current={nextNumber(map)}
                              onSubmit={(n) =>
                                n === null ? removeFromTracklist(p.id) : apply(assignNumber(map, p.id, n))
                              }
                            />
                          }
                        />
                        {renderPlayToggle(p)}
                        <Action
                          title={t.copyLatestBounce}
                          icon={Icon.CopyClipboard}
                          onAction={() => copyLatestBounce(p)}
                        />
                        <Action.Push
                          title={t.editInfo}
                          icon={Icon.Pencil}
                          shortcut={Keyboard.Shortcut.Common.Edit}
                          target={
                            <EditInfo
                              project={p}
                              onSaved={reloadMetadata}
                              collectionId={collection.id}
                              currentRole={roles[p.id]}
                              onRoleChanged={(nextRole) =>
                                applyRoles(nextRole ? assignRole(roles, p.id, nextRole) : clearRole(roles, p.id))
                              }
                            />
                          }
                        />{" "}
                        <Action
                          title={t.addToTracklist}
                          icon={Icon.PlusCircle}
                          shortcut={Keyboard.Shortcut.Common.Pin}
                          onAction={() => apply(assignNumber(map, p.id, nextNumber(map)))}
                        />
                        {renderPlaybackControls()}
                        {renderDocActions(p)}
                        {renderViewToggle()}
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

function SetTrackNumberForm({ current, onSubmit }: { current?: number; onSubmit: (n: number | null) => void }) {
  const { pop } = useNavigation();
  const [value, setValue] = useState("");
  function handleSubmit() {
    const trimmed = value.trim();
    if (trimmed === "") {
      if (current !== undefined) onSubmit(current); // 留空 = 采用占位(建议号)
      pop();
      return;
    }
    const n = parseInt(trimmed, 10);
    if (isNaN(n) || n < 0) {
      showToast({ style: Toast.Style.Failure, title: t.invalidPosition });
      return;
    }
    onSubmit(n === 0 ? null : n); // 0 = 移出
    pop();
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.save} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="n"
        title={t.trackNumber}
        placeholder={current !== undefined ? String(current) : "1"}
        value={value}
        onChange={setValue}
      />
    </Form>
  );
}
