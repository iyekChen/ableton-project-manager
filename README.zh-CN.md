<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Ableton Project Manager 图标" />
</p>

<h1 align="center">Ableton Project Manager</h1>

<p align="center">
  在 Raycast 里浏览、整理和试听你的 Ableton Live 工程，全程不用离开键盘。
</p>

<p align="center">
  <a href="README.md">English</a> | 简体中文
</p>

---

按名字搜索所有工程，给它们打上 Stage 和 Genre 标签，在工程旁边写笔记和歌词，一个快捷键播放最新的 bounce，还能把曲目编排成 EP 和专辑，并自动给出能量刻度。

## 安装

即将上架 Raycast Store。在此之前可以从源码运行，见[开发](#开发)。

需要 macOS、[Raycast](https://raycast.com) 和 [Ableton Live](https://www.ableton.com)（用于打开 Set）。

## 快速上手

1. **指定工程文件夹。** 打开 **Search Projects**。第一次启动时，Raycast 会让你填 **Projects Folder**，也就是存放 Ableton Live 工程的文件夹。
2. **给已有的工程打标签。** 打开 **Manage Tags**，选一个 Stage（比如 Demo），用 **Assign to Projects** 一次给多个工程打上。Genre 也一样。
3. **建一张合集。** 在 Search Projects 里按 `⌃↵` 进入合集，为你的 EP 或专辑新建一张，用 **Add Projects** 把曲目加进去。排好曲目顺序，bounce 分析完后就会显示能量刻度。

## 功能

### 找

- 按名字**搜索工程**，按名称、创建时间或修改时间排序，常用的可以置顶。
- 按 Stage 或 Genre **筛选**列表。
- **两种视图**：精简的 Overview，或者带标签、Set、bounce 和笔记的 Detail。

### 整理

- 给每个工程设置 **Stage**（Demo → Recording → Production → … → Released）、一个或多个 **Genre**，以及所属的**合集**。
- 在 Manage Tags 里用 **Assign to Projects** 一次给多个工程打标签。
- **在 Finder 里改名或删除工程会被自动识别**，标签会跟着工程走。

### 听

- 按 `⌘↵` **播放任意工程的最新 bounce**：暂停、继续、前后跳 5 秒、从头播放。切换视图时不中断，**关掉 Raycast 窗口后也会继续**，只有播完、按 Stop 或退出 Raycast 时才会停。
- **浏览某个工程的所有 bounce**：用快速查看试听、在 Finder 中显示，或用默认 App 打开。
- **查看 Set**：列出工程里的每个 `.als`，显示 **BPM**、**调性**和**拍号**，可以直接在 Ableton Live 中打开。

### 写

- 每个工程都可以写 Markdown **笔记和歌词**，存成工程文件夹里的 `Notes.md` / `Lyrics.md`，或者存进你选的文件夹（比如 Obsidian 仓库）。
- 新建笔记和歌词时可以套用**模板**，支持 `{{title}}` 和 `{{date}}`。
- 在其他编辑器里改的内容，这里会马上更新。

### 合集

- 把工程编成 **EP 和专辑**，排定曲目顺序，给每首曲目指定**角色**（Intro、Single、Interlude 等）。
- 根据每首曲目的 bounce 自动给出**能量刻度**，方便安排曲序。见[能量是怎么算的](#能量是怎么算的)。
- 按曲目顺序把**整张合集**写成 `.m3u` 播放列表，交给播放器连续播放。

## 截图

<table>
  <tr>
    <td align="center" width="33%">
      <a href="metadata/ableton-project-manager-1.png"><img src="metadata/ableton-project-manager-1.png" alt="Search Projects" /></a>
      <br /><sub>Search Projects</sub>
    </td>
    <td align="center" width="33%">
      <a href="metadata/ableton-project-manager-2.png"><img src="metadata/ableton-project-manager-2.png" alt="View Sets" /></a>
      <br /><sub>View Sets</sub>
    </td>
    <td align="center" width="33%">
      <a href="metadata/ableton-project-manager-3.png"><img src="metadata/ableton-project-manager-3.png" alt="Browse Bounces" /></a>
      <br /><sub>Browse Bounces</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="33%">
      <a href="metadata/ableton-project-manager-4.png"><img src="metadata/ableton-project-manager-4.png" alt="Browse Collections" /></a>
      <br /><sub>Browse Collections</sub>
    </td>
    <td align="center" width="33%">
      <a href="metadata/ableton-project-manager-5.png"><img src="metadata/ableton-project-manager-5.png" alt="合集" /></a>
      <br /><sub>合集</sub>
    </td>
    <td align="center" width="33%">
      <a href="metadata/ableton-project-manager-6.png"><img src="metadata/ableton-project-manager-6.png" alt="Manage Tags" /></a>
      <br /><sub>Manage Tags</sub>
    </td>
  </tr>
</table>

## 命令

| 命令                | 说明                                               |
| ------------------- | -------------------------------------------------- |
| **Search Projects** | 搜索、打开、打标签、播放和管理 Ableton Live 工程。 |
| **Manage Tags**     | 创建、排序和批量分配 Stage 与 Genre，管理 Role。   |

## 设置

在 Raycast → Extensions → **Ableton Project Manager** 中设置：

| 设置项                 | 必填 | 说明                                                                                                 |
| ---------------------- | ---- | ---------------------------------------------------------------------------------------------------- |
| **Projects Folder**    | ✅   | 存放 Ableton Live 工程的文件夹。                                                                     |
| **Bounces Subfolder**  | —    | 每个工程里存放 bounce 的子文件夹（如 `Bounces`）。留空则直接在工程文件夹里查找。                     |
| **Notes Folder**       | —    | 以 `.md` 文件保存笔记的文件夹（如 Obsidian 仓库）。留空则在每个工程文件夹里保存 `Notes.md`。         |
| **Lyrics Folder**      | —    | 以 `.md` 文件保存歌词的文件夹。留空则在每个工程文件夹里保存 `Lyrics.md`。                            |
| **Notes Template**     | —    | 可选，新建笔记时作为起点的 `.md` 文件。支持 `{{title}}` 和 `{{date}}`。                              |
| **Lyrics Template**    | —    | 可选，新建歌词时作为起点的 `.md` 文件。支持 `{{title}}` 和 `{{date}}`。                              |
| **Strict Line Breaks** | —    | 关：保留单个换行。开：遵循标准 Markdown 的换行规则（行尾两个空格或空一行）。只影响预览，不改动文件。 |
| **Energy: Density**    | —    | 密度（波峰因数）对能量分的影响程度。只看三项权重之间的比例。                                         |
| **Energy: Brightness** | —    | 亮度（频谱质心）对能量分的影响程度。                                                                 |
| **Energy: Movement**   | —    | 变化量（频谱通量）对能量分的影响程度。                                                               |

### 能量是怎么算的

每首曲目的最新 bounce 只分析一次，结果会缓存起来，直到文件有改动。分析三项特征：

- **Density（密度）**：波峰因数，即峰值 ÷ RMS。数值越低，声音越密、压缩感越强，能量越高。
- **Brightness（亮度）**：频谱质心，即频谱的"重心"落在哪里。越亮、高频越多，分数越高。
- **Movement（变化量）**：频谱通量，即频谱随时间变化的幅度。越忙碌、变化越多，分数越高。

在一张合集里，每项特征都在合集的曲目之间缩放到 0–1：最低的为 0，最高的为 1（密度反过来算）。再按你设的权重（Off = 0、Low = 0.5、Normal = 1、High = 2）加权平均，最后显示为 1–5 个点。

- 能量是**相对于合集**的：同一首曲目在不同合集里显示的点数可能不同。
- 某项特征测不出来时（比如 bounce 是静音），只用剩下的特征重新加权。没有 bounce 的曲目不显示能量。
- 三项权重都设为 **Off**，就完全不显示能量。

## 快捷键

所有操作都能在 Action Panel（`⌘K`）里找到。最常用的几个：

| 操作                   | 快捷键                                |
| ---------------------- | ------------------------------------- |
| 播放 / 暂停最新 bounce | `⌘↵`                                  |
| 停止播放               | `⌘-`                                  |
| 后退 / 前进 5 秒       | `⌥←` / `⌥→`                           |
| 从头播放               | `⌘←`                                  |
| Browse Bounces         | `⌥↵`                                  |
| Browse Collections     | `⌃↵`                                  |
| 返回 Search Projects   | `⌃↵` / `⌥↵`（在合集 / bounce 视图中） |
| Edit Info              | `⌘E`                                  |
| Edit Note              | `⌘⌥N`                                 |
| 整张合集排队播放       | `⌘⇧↵`                                 |
| 往合集里添加工程       | `⌘N`（在合集中）                      |
| 曲目置顶 / 置底        | `⌘⇧↑` / `⌘⇧↓`（在合集中）             |
| New Live Set           | `⌘N`                                  |
| Open in Finder         | `⌘⌥O`                                 |

## 你的数据

**留在你文件夹里的。** 工程、Set 和 bounce 只有在你主动操作时才会被改动：改名、复制或移到废纸篓。笔记和歌词是普通的 Markdown 文件，存在每个工程文件夹里，或者你选的文件夹里。

**存在 Raycast 里的。** 标签、置顶、合集、曲目顺序和角色存在扩展的 Raycast 存储里，视图偏好和分析结果会被缓存。Raycast 按扩展分别保存这些数据，所以**卸载或重装扩展会把它们删掉**。Raycast 自带的 Export Settings & Data 看起来也不包含这部分。

**怎么跟着工程走。**

- **在 Finder 里改名或删除工程**，下次打开 Search Projects 时会被识别，按文件夹的创建时间匹配工程。如果给了 Raycast **完全磁盘访问权限**，会对照废纸篓确认删除；没有这个权限时不会自动改动任何数据，可以运行 **Clean up Leftovers** 清理已移除工程的数据。
- 如果很多工程同时消失（比如拔掉了外接盘），什么都不会改动。换一个 Projects Folder 不会触发这个保护，每个文件夹是分开记录的。
- **把工程移到废纸篓**后，它的标签、轨号和角色会保留 **30 天**，自定义文件夹里的笔记和歌词会被移进 `Deleted Projects/` 子文件夹。30 天内放回，一切都会还原。只是同名的新工程不会继承任何数据。
- **存在自定义文件夹里的笔记和歌词**按文件名（`<工程名>.md`）和工程对应。在扩展里改工程名，文件会跟着改名。文件名中不安全、或在 Obsidian 里有特殊含义的字符（`/ \ : * ? " < > | # ^ [ ]`）会被替换成外观相近的全角字符（如 `Beat #3` → `Beat ＃3.md`），保证两个工程不会共用同一个文件。

## 已知限制

- **整张合集排队播放**会写出一个标准的 `.m3u` 播放列表，并用系统默认处理 `.m3u` 的 App 打开。请使用支持播放列表的播放器，比如 IINA、VLC、Swinsian；**QuickTime Player 不支持**。
- 如果你自己手动改了笔记或歌词 `.md` 的名字，扩展就找不到它了。
- 如果自定义的笔记或歌词文件夹被改名或移走，扩展会显示警告，并且在你到扩展设置里重新选择文件夹之前**不会写入任何内容**。

## 开发

需要 Node.js 22+ 和 npm。

```bash
git clone https://github.com/iyekChen/ableton-project-manager.git
cd ableton-project-manager
npm install
npm run build:player   # 编译内置的 Swift（AVFoundation）音频播放器
npm run dev            # 以开发模式在 Raycast 中运行扩展
```

```bash
npm run lint       # ESLint + Prettier
npm run fix-lint   # 自动修复
npm test           # 单元测试（Vitest）
npm run build      # 生产构建
```

### 工作原理

- **`.als` 解析**：Set 文件是 gzip 压缩的 XML，用 `fast-xml-parser` 和 `saxes` 读取其中的 BPM、调性和拍号。
- **音频播放与分析**：由一个内置的 Swift AVFoundation 小程序播放 bounce，并测量能量特征。它作为一个独立的后台进程运行，所以切换视图、关掉窗口后播放都不会中断；扩展通过几个小的命令文件和状态文件控制它。这个二进制（`assets/audio-player`）由 [`scripts/build-audio-player.sh`](scripts/build-audio-player.sh) 从 [`swift/AudioPlayer.swift`](swift/AudioPlayer.swift) 编译而来，是同时支持 arm64 和 x86_64 的通用二进制。CI 会检查提交的二进制和源码是否一致。
- **存储**：标签、置顶和每个工程的元数据存在 Raycast LocalStorage 里，视图偏好存在 Raycast Cache 里，笔记和歌词是 Markdown 文件。

## 许可证

MIT © iyek
