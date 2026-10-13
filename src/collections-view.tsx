import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  Toast,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getTranslations } from "./i18n";
import type { Project } from "./projects/types";
import type { TaxonomyOption } from "./taxonomy";
import {
  TrackMap,
  assignNumber,
  getTrackMap,
  nextNumber,
  removeNumber,
  setTrackMap,
  swapNumbers,
} from "./collection-order";
import { TRACK_ROLES } from "./track-role";
import { RoleMap, assignRole, clearRole, getRoleMap, setRoleMap } from "./collection-roles";
import { ENERGY_ENABLED, TrackInfo, energyLevelFromScore, energyScore, loadTrackInfos } from "./projects/track-info";
import { useAudioPlayer } from "./hooks/use-audio-player";
import { ensureAudioPlayerBinary } from "./audio-player-path";
import { findLatestBounce, resolveBouncesFolder } from "./projects/bounces";

const t = getTranslations(getPreferenceValues<{ language: Parameters<typeof getTranslations>[0] }>().language);

type Collection = { id: string; name: string };

const VIEW_MODE_STORAGE_KEY = "view-mode:collections";
const PLAYER_PATH = ensureAudioPlayerBinary();
const SEEK_STEP_SECONDS = 5;

// 固定的冷→暖位置色模板：每个圆点槽位颜色固定，所有 Project 一致。
// 槽位 1→5：最冷 → 次冷 → 中性 → 次暖 → 最暖。
const ENERGY_SLOT_COLORS: Color[] = [Color.Blue, Color.Green, Color.Yellow, Color.Orange, Color.Red];

function formatDuration(totalSeconds: number): string {
  const s = Math.round(totalSeconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// 返回 5 个圆点 accessory：槽位 i < level 的点亮（显示该槽位的冷→暖色），其余留空（无色）。
// level 为 null（无数据 / 分析中 / 本专辑暂无可定尺的曲目）→ 全部空点占位，保持右侧列对齐。
function energyAccessories(level: number | null): List.Item.Accessory[] {
  return ENERGY_SLOT_COLORS.map((color, i) => {
    const filled = level !== null && i < level;
    return filled ? { text: { value: "●", color } } : { text: { value: "○", color: Color.SecondaryText } };
  });
}

export function CollectionList({
  projects,
  collections,
  stages,
}: {
  projects: Project[];
  collections: Collection[];
  stages: TaxonomyOption[];
}) {
  return (
    <List navigationTitle={t.browseCollections}>
      {collections.length === 0 ? (
        <List.EmptyView title={t.noCategories} />
      ) : (
        collections.map((c) => {
          const count = projects.filter((p) => p.collectionIds.includes(c.id)).length;
          return (
            <List.Item
              key={c.id}
              icon={Icon.Cd}
              title={c.name}
              accessories={[{ text: `${count}` }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title={t.open}
                    icon={Icon.Cd}
                    target={<CollectionPanel collection={c} projects={projects} stages={stages} />}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function CollectionPanel({
  collection,
  projects,
  stages,
}: {
  collection: Collection;
  projects: Project[];
  stages: TaxonomyOption[];
}) {
  const members = projects.filter((p) => p.collectionIds.includes(collection.id));
  const [map, setMap] = useState<TrackMap>({});
  const [roles, setRoles] = useState<RoleMap>({});
  const [infos, setInfos] = useState<Record<string, TrackInfo>>({});
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(true);
  const [selectedStage, setSelectedStage] = useState("all");

  const { playbackStatus, playingId, play, pause, resume, seek, restart } = useAudioPlayer({ playerPath: PLAYER_PATH });

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

  // 播放时才出现的 seek / restart（作用于全局播放器），作为每个 item 的第二个 Section。
  const renderPlaybackControls = () =>
    playingId !== null ? (
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

  async function apply(next: TrackMap) {
    setMap(next);
    await setTrackMap(collection.id, next);
  }

  async function applyRoles(next: RoleMap) {
    setRoles(next);
    await setRoleMap(collection.id, next);
  }

  // 从 tracklist 移出时，连带清掉该曲目在本 collection 的角色。
  async function removeFromTracklist(id: string) {
    await apply(removeNumber(map, id));
    await applyRoles(clearRole(roles, id));
  }

  // 角色子菜单：在当前 collection 内给某首歌设/清角色。
  const roleSubmenu = (p: Project) => (
    <ActionPanel.Submenu title={t.setTrackRole} icon={Icon.Tag}>
      {TRACK_ROLES.map((role) => (
        <Action key={role} title={role} onAction={() => applyRoles(assignRole(roles, p.id, role))} />
      ))}
      <Action title={t.clearRole} icon={Icon.XMarkCircle} onAction={() => applyRoles(clearRole(roles, p.id))} />
    </ActionPanel.Submenu>
  );

  // 角色 pill（设了才显示，放在 accessories 最左）。
  const rolePill = (p: Project): List.Item.Accessory[] => {
    const role = roles[p.id];
    return role ? [{ tag: { value: role, color: Color.SecondaryText } }] : [];
  };

  // 视图切换 Action（Detail / Overview，本视图独立记忆）。
  const renderViewToggle = () => (
    <ActionPanel.Section>
      <Action
        title={showDetail ? t.showOverview : t.showDetail}
        icon={Icon.AppWindowSidebarRight}
        onAction={toggleDetail}
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
    return (
      <List.Item.Detail
        markdown={p.notes?.trim() ? p.notes : "_No notes yet_"}
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
              text={info?.duration != null ? formatDuration(info.duration) : ""}
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
                  { text: info?.duration != null ? formatDuration(info.duration) : "--:--" },
                  ...(ENERGY_ENABLED ? energyAccessories(level) : []),
                ];
                return (
                  <List.Item
                    key={p.id}
                    icon={{ source: "Project.png" }}
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
                          onAction={() => copyLatestBounce(p)}
                        />
                        {roleSubmenu(p)}
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
                        {renderViewToggle()}
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
                    icon={{ source: "Project.png" }}
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
                        <Action
                          title={t.addToTracklist}
                          icon={Icon.PlusCircle}
                          shortcut={Keyboard.Shortcut.Common.Pin}
                          onAction={() => apply(assignNumber(map, p.id, nextNumber(map)))}
                        />
                        {renderPlaybackControls()}
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
