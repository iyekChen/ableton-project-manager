import { Language } from "./settings";

type TranslationKeys = {
  searchProjects: string;
  viewSets: string;
  openInAbletonLive: string;
  editInfo: string;
  save: string;
  pinProject: string;
  unpinProject: string;
  moveUp: string;
  moveDown: string;
  copyProjectName: string;
  copyProjectPath: string;
  copySetName: string;
  copySetPath: string;
  openInFinder: string;
  showInFinder: string;
  browseCollections: string;
  open: string;
  tracklist: string;
  unsorted: string;
  setTrackNumber: string;
  swapUp: string;
  swapDown: string;
  duplicateTrack: string;
  moveToBottom: string;
  addToTracklist: string;
  removeFromTracklist: string;
  trackNumber: string;
  invalidPosition: string;
  allTags: string;
  allStages: string;
  filterByStage: string;
  notes: string;
  openNote: string;
  editNote: string;
  none: string;
  pinned: string;
  sortBy: string;
  sortProjects: string;
  select: string;
  modifiedNewest: string;
  modifiedOldest: string;
  createdNewest: string;
  createdOldest: string;
  nameAZ: string;
  nameZA: string;
  infoUpdated: string;
  projectPinned: string;
  projectUnpinned: string;
  tag: string;
  name: string;
  invalidName: string;
  nameExists: string;
  renameFailed: string;
  renameConfirmTitle: string;
  renameConfirmMessage: string;
  rename: string;
  sizeLargest: string;
  sizeSmallest: string;
  browseBounces: string;
  playLatestBounce: string;
  playingLatestBounce: string;
  playbackFailed: string;
  stoppingPlayback: string;
  nothingIsPlaying: string;
  playbackStopped: string;
  noBounces: string;
  stage: string;
  genre: string;
  collection: string;
  category: string;
  create: string;
  delete: string;
  created: string;
  renamed: string;
  deleted: string;
  noCategories: string;
  setTrackRole: string;
  clearRole: string;
  tracklistDuration: string;
  pausePlayback: string;
  resumePlayback: string;
  seekBackward: string;
  seekForward: string;
  restartTrack: string;
};

const translations: Record<Language, TranslationKeys> = {
  en: {
    searchProjects: "Search Projects",
    viewSets: "View Sets",
    openInAbletonLive: "Open in Ableton Live",
    editInfo: "Edit Info",
    save: "Save",
    pinProject: "Pin",
    unpinProject: "Unpin",
    moveUp: "Move Up",
    moveDown: "Move Down",
    copyProjectName: "Copy Project Name",
    copyProjectPath: "Copy Project Path",
    copySetName: "Copy Set Name",
    copySetPath: "Copy Set Path",
    openInFinder: "Open in Finder",
    showInFinder: "Show in Finder",
    browseCollections: "Browse Collections",
    open: "Open",
    tracklist: "Tracklist",
    unsorted: "Unsorted",
    setTrackNumber: "Set Track Number…",
    swapUp: "Swap Up",
    swapDown: "Swap Down",
    duplicateTrack: "Duplicate track number",
    moveToBottom: "Move to Bottom",
    addToTracklist: "Add to Tracklist",
    removeFromTracklist: "Remove from Tracklist",
    trackNumber: "Track Number",
    invalidPosition: "Enter a valid number",
    allTags: "All Tags",
    allStages: "All Stages",
    filterByStage: "Filter by Stage",
    notes: "Notes",
    openNote: "Open Note",
    editNote: "Edit Note",
    none: "None",
    pinned: "Pinned",
    sortBy: "Sort By",
    sortProjects: "Sort Projects",
    select: "Select",
    modifiedNewest: "Modified — Newest",
    modifiedOldest: "Modified — Oldest",
    createdNewest: "Created — Newest",
    createdOldest: "Created — Oldest",
    nameAZ: "Name — A → Z",
    nameZA: "Name — Z → A",
    infoUpdated: "Info Updated",
    projectPinned: "Project Pinned",
    projectUnpinned: "Project Unpinned",
    tag: "Tag",
    name: "Name",
    invalidName: "Name can't contain / or :",
    nameExists: "A project with that name already exists",
    renameFailed: "Rename failed",
    renameConfirmTitle: "Rename project?",
    renameConfirmMessage:
      "Make sure this project is closed in Ableton Live. Renaming while it's open can detach your session.",
    rename: "Rename",
    sizeLargest: "Size — Largest",
    sizeSmallest: "Size — Smallest",
    browseBounces: "Browse Bounces",
    playLatestBounce: "Play Latest Bounce",
    playingLatestBounce: "Playing Latest Bounce",
    playbackFailed: "Playback Failed",
    stoppingPlayback: "Stopping Playback",
    nothingIsPlaying: "Nothing Is Playing",
    playbackStopped: "Playback Stopped",
    noBounces: "No Bounces Found",
    stage: "Stage",
    genre: "Genre",
    collection: "Collection",
    category: "Category",
    create: "Create",
    delete: "Delete",
    created: "Created",
    renamed: "Renamed",
    deleted: "Deleted",
    noCategories: "Nothing here yet",
    setTrackRole: "Set Track Role",
    clearRole: "Clear Role",
    tracklistDuration: "Tracklist Duration",
    pausePlayback: "Pause",
    resumePlayback: "Resume",
    seekBackward: "Backward",
    seekForward: "Forward",
    restartTrack: "Restart Track",
  },

  "zh-CN": {
    searchProjects: "搜索项目",
    viewSets: "查看 Set",
    openInAbletonLive: "在 Ableton Live 中打开",
    editInfo: "编辑信息",
    save: "保存",
    pinProject: "固定",
    unpinProject: "取消固定",
    moveUp: "上移",
    moveDown: "下移",
    copyProjectName: "复制项目名",
    copyProjectPath: "复制项目路径",
    copySetName: "复制 Set 名",
    copySetPath: "复制 Set 路径",
    openInFinder: "在 Finder 中打开",
    showInFinder: "在 Finder 中显示",
    browseCollections: "浏览合集",
    open: "打开",
    tracklist: "曲目列表",
    unsorted: "未排序",
    setTrackNumber: "设置轨号…",
    swapUp: "与上一首对调",
    swapDown: "与下一首对调",
    duplicateTrack: "轨号重复",
    moveToBottom: "移到末尾",
    addToTracklist: "加入曲目列表",
    removeFromTracklist: "移出曲目列表",
    trackNumber: "轨号",
    invalidPosition: "请输入有效数字",
    allTags: "所有标签",
    allStages: "所有阶段",
    filterByStage: "按阶段筛选",
    notes: "备注",
    openNote: "打开备注",
    editNote: "编辑备注",
    none: "无",
    pinned: "已固定",
    sortBy: "排序方式",
    sortProjects: "排序项目",
    select: "选择",
    modifiedNewest: "修改时间 — 最新",
    modifiedOldest: "修改时间 — 最旧",
    createdNewest: "创建时间 — 最新",
    createdOldest: "创建时间 — 最旧",
    nameAZ: "名称 — A → Z",
    nameZA: "名称 — Z → A",
    infoUpdated: "信息已更新",
    projectPinned: "项目已固定",
    projectUnpinned: "项目已取消固定",
    tag: "标签",
    name: "名称",
    invalidName: "名称不能包含 / 或 :",
    nameExists: "已存在同名项目",
    renameFailed: "重命名失败",
    renameConfirmTitle: "重命名项目?",
    renameConfirmMessage: "请确认该项目已在 Ableton Live 中关闭。开着时重命名可能让工程与文件失联。",
    rename: "重命名",
    sizeLargest: "大小 — 最大",
    sizeSmallest: "大小 — 最小",
    browseBounces: "浏览 Bounces",
    playLatestBounce: "播放最新 Bounce",
    playingLatestBounce: "正在播放最新 Bounce",
    playbackFailed: "播放失败",
    stoppingPlayback: "正在停止播放",
    nothingIsPlaying: "当前没有正在播放的音频",
    playbackStopped: "已停止播放",
    noBounces: "没有找到 Bounces",
    stage: "阶段",
    genre: "风格",
    collection: "合集",
    category: "类别",
    create: "新建",
    delete: "删除",
    created: "已创建",
    renamed: "已重命名",
    deleted: "已删除",
    noCategories: "还没有选项",
    setTrackRole: "设置曲目角色",
    clearRole: "清除角色",
    tracklistDuration: "曲目列表时长",
    pausePlayback: "暂停",
    resumePlayback: "继续播放",
    seekBackward: "后退",
    seekForward: "前进",
    restartTrack: "从头播放",
  },
};

export function getTranslations(language: Language): TranslationKeys {
  return translations[language];
}
