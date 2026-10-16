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
  copyLatestBounce: string;
  copyBounce: string;
  copyBounceName: string;
  copyBouncePath: string;
  bounceCopied: string;
  openInFinder: string;
  showInFinder: string;
  openInDefaultApp: string;
  browseCollections: string;
  backToProjects: string;
  open: string;
  tracklist: string;
  unsorted: string;
  setTrackNumber: string;
  swapUp: string;
  swapDown: string;
  duplicateTrack: string;
  moveToBottom: string;
  moveToTop: string;
  addToTracklist: string;
  removeFromTracklist: string;
  trackNumber: string;
  invalidPosition: string;
  allTags: string;
  allStages: string;
  filterByStage: string;
  filter: string;
  all: string;
  notes: string;
  openNote: string;
  openLyrics: string;
  showNotes: string;
  showLyrics: string;
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
  docRenameSkipped: string;
  docNameHint: string;
  docConflictWarning: string;
  renameAnyway: string;
  collectionNameExists: string;
  projectsRestored: string;
  restoreDocConflict: string;
  docFolderMissing: string;
  docFolderMissingHint: string;
  openPreferences: string;
  docSaveFailed: string;
  useProjectFolders: string;
  manyProjectsMissing: string;
  ambiguousFinderChanges: string;
  docShared: string;
  docSharedHint: string;
  docNameTaken: string;
  renameConfirmTitle: string;
  renameConfirmMessage: string;
  rename: string;
  edit: string;
  color: string;
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
  collections: string;
  deleteCollectionHint: string;
  category: string;
  role: string;
  create: string;
  delete: string;
  created: string;
  renamed: string;
  deleted: string;
  noCategories: string;
  setTrackRole: string;
  clearRole: string;
  tracklistDuration: string;
  queueCollection: string;
  collectionQueued: string;
  queueFailed: string;
  tracksWord: string;
  skippedNoBounce: string;
  pausePlayback: string;
  resumePlayback: string;
  stopPlayback: string;
  seekBackward: string;
  seekForward: string;
  restartTrack: string;
  showDetail: string;
  showOverview: string;
  newLiveSet: string;
  newLiveSetFailed: string;
  duplicateSet: string;
  duplicateProject: string;
  duplicatingProject: string;
  projectDuplicated: string;
  duplicateFailed: string;
  renameSet: string;
  setRenamed: string;
  setNameExists: string;
  renameSetConfirmTitle: string;
  renameSetConfirmMessage: string;
  setDuplicated: string;
  moveToTrash: string;
  movedToTrash: string;
  trashProjectHint: string;
  trashSetHint: string;
  trashBounceHint: string;
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
    copyLatestBounce: "Copy Latest Bounce",
    copyBounce: "Copy Bounce",
    copyBounceName: "Copy Bounce Name",
    copyBouncePath: "Copy Bounce Path",
    bounceCopied: "Bounce Copied",
    openInFinder: "Open in Finder",
    showInFinder: "Show in Finder",
    openInDefaultApp: "Open in Default App",
    browseCollections: "Browse Collections",
    backToProjects: "Back to Search Projects",
    open: "Open",
    tracklist: "Tracklist",
    unsorted: "Unsorted",
    setTrackNumber: "Set Track Number…",
    swapUp: "Swap Up",
    swapDown: "Swap Down",
    duplicateTrack: "Duplicate track number",
    moveToBottom: "Move to Bottom",
    moveToTop: "Move to Top",
    addToTracklist: "Add to Tracklist",
    removeFromTracklist: "Remove from Tracklist",
    trackNumber: "Track Number",
    invalidPosition: "Enter a valid number",
    allTags: "All Tags",
    allStages: "All Stages",
    filterByStage: "Filter by Stage",
    filter: "Filter",
    all: "All",
    notes: "Notes",
    openNote: "Open Note",
    openLyrics: "Open Lyrics",
    showNotes: "Show Notes",
    showLyrics: "Show Lyrics",
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
    docRenameSkipped: "Renamed — but a doc wasn't moved",
    docNameHint: "Note & lyrics file: “{file}” ({chars} → full-width look-alikes)",
    docConflictWarning:
      "The notes folder already contains {files}. After renaming, this project will show that existing file; its own notes (if any) keep the old file name.",
    renameAnyway: "Rename Anyway",
    collectionNameExists: "A collection with that name already exists",
    projectsRestored: "Restored put-back project",
    restoreDocConflict: "Restored — but a note file name was already taken",
    docFolderMissing: "Notes / lyrics folder not found",
    docFolderMissingHint: "Choose it again in Extension Preferences. Nothing will be written until then.",
    openPreferences: "Open Extension Preferences",
    docSaveFailed: "Couldn't save",
    useProjectFolders: "Store in Project Folders Instead",
    manyProjectsMissing: "Many projects disappeared at once — nothing was changed. Is the drive connected?",
    ambiguousFinderChanges: "Some changes made in Finder couldn't be matched safely and were skipped",
    docShared: "Shares a note file with another project",
    docSharedHint:
      "This project's notes / lyrics file would be the same as {names}'s. Rename this project so each keeps its own file — nothing is read or written until then.",
    docNameTaken: "Another project would use the same note file",
    renameConfirmTitle: "Rename project?",
    renameConfirmMessage:
      "Make sure this project is closed in Ableton Live. Renaming while it's open can detach your session.",
    rename: "Rename",
    edit: "Edit",
    color: "Color",
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
    collections: "Collections",
    deleteCollectionHint: "This only removes the collection. Your projects are not deleted.",
    category: "Category",
    role: "Role",
    create: "Create",
    delete: "Delete",
    created: "Created",
    renamed: "Renamed",
    deleted: "Deleted",
    noCategories: "Nothing here yet",
    setTrackRole: "Set Track Role",
    clearRole: "Clear Role",
    tracklistDuration: "Tracklist Duration",
    queueCollection: "Queue Collection in Player",
    collectionQueued: "Collection Queued",
    queueFailed: "Queue Failed",
    tracksWord: "tracks",
    skippedNoBounce: "skipped (no bounce)",
    pausePlayback: "Pause",
    resumePlayback: "Resume",
    stopPlayback: "Stop Playback",
    seekBackward: "Backward",
    seekForward: "Forward",
    restartTrack: "Restart Track",
    showDetail: "Show Detail",
    showOverview: "Show Overview",
    newLiveSet: "New Live Set",
    newLiveSetFailed: "Ableton Live not found",
    duplicateSet: "Duplicate Set",
    duplicateProject: "Duplicate Project",
    duplicatingProject: "Duplicating Project…",
    projectDuplicated: "Project Duplicated",
    duplicateFailed: "Duplicate Failed",
    renameSet: "Rename Set",
    setRenamed: "Set Renamed",
    setNameExists: "A Set with that name already exists",
    renameSetConfirmTitle: "Rename Set?",
    renameSetConfirmMessage:
      "Make sure this Set is closed in Ableton Live. Renaming while it's open can make Ableton keep saving to the old name.",
    setDuplicated: "Set Duplicated",
    moveToTrash: "Move to Trash",
    movedToTrash: "Moved to Trash",
    trashProjectHint: "This moves the entire project folder to the Trash:",
    trashSetHint: "This moves the Set to the Trash:",
    trashBounceHint: "This moves the bounce to the Trash:",
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
    copyProjectName: "拷贝项目名",
    copyProjectPath: "拷贝项目路径",
    copySetName: "拷贝 Set 名",
    copySetPath: "拷贝 Set 路径",
    copyLatestBounce: "拷贝最新 Bounce",
    copyBounce: "拷贝 Bounce",
    copyBounceName: "拷贝 Bounce 名",
    copyBouncePath: "拷贝 Bounce 路径",
    bounceCopied: "已拷贝 Bounce",
    openInFinder: "在 Finder 中打开",
    showInFinder: "在 Finder 中显示",
    openInDefaultApp: "用默认 App 打开",
    browseCollections: "浏览合集",
    backToProjects: "返回 Search Projects",
    open: "打开",
    tracklist: "曲目列表",
    unsorted: "未排序",
    setTrackNumber: "设置轨号…",
    swapUp: "与上一首对调",
    swapDown: "与下一首对调",
    duplicateTrack: "轨号重复",
    moveToBottom: "移到末尾",
    moveToTop: "移到顶部",
    addToTracklist: "加入曲目列表",
    removeFromTracklist: "移出曲目列表",
    trackNumber: "轨号",
    invalidPosition: "请输入有效数字",
    allTags: "所有标签",
    allStages: "所有阶段",
    filterByStage: "按阶段筛选",
    filter: "筛选",
    all: "全部",
    notes: "备注",
    openNote: "打开备注",
    openLyrics: "打开歌词",
    showNotes: "显示备注",
    showLyrics: "显示歌词",
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
    docRenameSkipped: "已重命名，但有文档未同步改名",
    docNameHint: "笔记/歌词文件名：“{file}”（{chars} 已替换为相似的全角字符）",
    docConflictWarning:
      "笔记文件夹中已存在 {files}。改名后，本项目将显示这份已有文件的内容；本项目原有的笔记（如有）会保留旧文件名。",
    renameAnyway: "仍然重命名",
    collectionNameExists: "已存在同名合集",
    projectsRestored: "已恢复放回的项目",
    restoreDocConflict: "已恢复，但有笔记文件名已被占用",
    docFolderMissing: "找不到笔记/歌词文件夹",
    docFolderMissingHint: "请在扩展设置里重新选择。在此之前不会写入任何文件。",
    openPreferences: "打开扩展设置",
    docSaveFailed: "保存失败",
    useProjectFolders: "改为存进项目文件夹",
    manyProjectsMissing: "检测到大量项目同时消失，未做任何处理。项目所在的磁盘是否已连接？",
    ambiguousFinderChanges: "有些在 Finder 中的改动无法安全识别，已跳过",
    docShared: "与其他项目共用同一个笔记文件",
    docSharedHint:
      "本项目的笔记/歌词文件名会与 {names} 相同。请给本项目改名，让它们各用各的文件；在此之前不会读写该文件。",
    docNameTaken: "改名后会与其他项目共用同一个笔记文件",
    renameConfirmTitle: "重命名项目?",
    renameConfirmMessage: "请确认该项目已在 Ableton Live 中关闭。开着时重命名可能让工程与文件失联。",
    rename: "重命名",
    edit: "编辑",
    color: "颜色",
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
    collections: "合集",
    deleteCollectionHint: "这只会删除该合集分组，不会删除里面的项目。",
    category: "类别",
    role: "角色",
    create: "新建",
    delete: "删除",
    created: "已创建",
    renamed: "已重命名",
    deleted: "已删除",
    noCategories: "还没有选项",
    setTrackRole: "设置曲目角色",
    clearRole: "清除角色",
    tracklistDuration: "曲目列表时长",
    queueCollection: "把合集加入播放器队列",
    collectionQueued: "合集已加入队列",
    queueFailed: "加入队列失败",
    tracksWord: "首",
    skippedNoBounce: "无 bounce 已跳过",
    pausePlayback: "暂停",
    resumePlayback: "继续播放",
    stopPlayback: "停止播放",
    seekBackward: "后退",
    seekForward: "前进",
    restartTrack: "从头播放",
    showDetail: "显示详情",
    showOverview: "显示概览",
    newLiveSet: "新建 Live Set",
    newLiveSetFailed: "未找到 Ableton Live",
    duplicateSet: "复制 Set",
    duplicateProject: "复制项目",
    duplicatingProject: "正在复制项目…",
    projectDuplicated: "已复制项目",
    duplicateFailed: "复制失败",
    renameSet: "重命名 Set",
    setRenamed: "已重命名 Set",
    setNameExists: "已存在同名 Set",
    renameSetConfirmTitle: "重命名 Set?",
    renameSetConfirmMessage: "请确认该 Set 已在 Ableton Live 中关闭。开着时重命名，Ableton 可能继续按旧名保存。",
    setDuplicated: "已复制 Set",
    moveToTrash: "移到废纸篓",
    movedToTrash: "已移到废纸篓",
    trashProjectHint: "这会把整个项目文件夹移到废纸篓：",
    trashSetHint: "这会把该 Set 移到废纸篓：",
    trashBounceHint: "这会把该 bounce 移到废纸篓：",
  },
};

export function getTranslations(language: Language): TranslationKeys {
  return translations[language];
}
