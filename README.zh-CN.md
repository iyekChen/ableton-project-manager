# Ableton Project Manager

[English](README.md) | 简体中文

一个 Raycast 扩展，让你不离开键盘就能浏览、整理和试听 Ableton Live 工程。可以按名字搜索，给工程打上 Stage / Genre / Collection 标签，为每个工程写笔记，直接播放最新的 bounce，还能把曲目编排成合集（EP / 专辑），并根据音频自动分析能量。

> macOS · Raycast · 为整天泡在 Ableton Live 里的音乐制作人打造。

## 功能

- **搜索与浏览工程**：在 Projects 文件夹里模糊搜索，按名称、创建时间或修改时间排序，把常用工程置顶，并在精简的 Overview 和信息完整的 Detail 两种视图之间切换。
- **标签与整理**：给每个工程设置 **Stage**（Demo → Recording → Production → … → Released）、**Genre** 和 **Collection**，再按 Stage 或 Genre 筛选列表。
- **合集视图**：把工程编成 EP 或专辑，排定曲目顺序，为每首曲目指定角色，直接编辑曲目信息和笔记，并根据每个 bounce 的音频自动生成**能量**刻度。
- **整张合集排队播放**：按曲目顺序把每个工程的最新 bounce 写成 `.m3u` 播放列表，交给默认播放器连续播放。
- **直接播放 bounce**：用一个全局共享的播放器播放任意工程的最新 bounce，支持播放、暂停、继续、前后跳 5 秒、从头播放。切换视图时播放不中断，**关掉 Raycast 窗口后也会继续**，只有播完、按 Stop 或退出 Raycast（⌘Q）时才会停。
- **浏览 bounce**：列出某个工程的所有 bounce，可以用快速查看试听（支持拖动进度），也可以在 Finder 中显示，或用默认 App 打开。
- **查看 Set**：列出工程里的 `.als` 文件，并显示解析出的 **BPM**、**调性**和**拍号**，可以直接在 Ableton Live 中打开。
- **笔记与歌词**：为每个工程写 Markdown 笔记和歌词，存成工程文件夹里的 `Notes.md` / `Lyrics.md`，也可以存进你指定的文件夹（比如 Obsidian 仓库）。
- **New Live Set**：启动 Ableton Live，新建一个 Set。

## 截图

![Search Projects](metadata/ableton-project-manager-1.png)

![View Sets](metadata/ableton-project-manager-2.png)

![Browse Bounces](metadata/ableton-project-manager-3.png)

![Browse Collections](metadata/ableton-project-manager-4.png)

![Collections view](metadata/ableton-project-manager-5.png)

![Manage Tags](metadata/ableton-project-manager-6.png)

## 环境要求

- 装有 [Raycast](https://raycast.com) 的 macOS
- [Ableton Live](https://www.ableton.com)（用于打开 Set）
- Node.js 22+ 和 npm（开发用）

## 安装（开发）

```bash
git clone https://github.com/iyekChen/ableton-project-manager.git
cd ableton-project-manager
npm install
npm run build:player   # 编译内置的 Swift（AVFoundation）音频播放器
npm run dev            # 以开发模式在 Raycast 中运行扩展
```

其他脚本：

```bash
npm run lint       # ESLint + Prettier
npm run fix-lint   # 自动修复
npm run build      # 生产构建
```

## 设置

在 Raycast → Extensions → **Ableton Project Manager** 中设置：

| 设置项                                             | 必填 | 说明                                                                                            |
| -------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------- |
| **Projects Folder**                                | ✅   | 存放 Ableton Live 工程的文件夹。                                                                |
| **Bounces Folder**                                 | —    | 工程里存放 bounce 的子文件夹名（如 `Bounces`）。留空表示工程根目录。                            |
| **Notes Folder**                                   | —    | 把笔记以 `.md` 存在这里（如 Obsidian 仓库）。留空时存为每个工程文件夹里的 `Notes.md`。          |
| **Lyrics Folder**                                  | —    | 把歌词以 `.md` 存在这里。留空时存为每个工程文件夹里的 `Lyrics.md`。                             |
| **Notes Template / Lyrics Template**               | —    | 可选的 `.md` 模板，首次创建笔记或歌词时使用。支持 `{{title}}` 和 `{{date}}`。                   |
| **Strict Line Breaks**                             | —    | 关（默认）：单个换行就显示为换行，和 Obsidian 一致。开：遵循标准 Markdown。只影响显示。         |
| **Energy Weight: Density / Brightness / Activity** | —    | 合集能量刻度中三项特征的相对权重（Off / Low / Normal / High）。只有三者之间的相对差别会起作用。 |

## 命令

| 命令                | 说明                                               |
| ------------------- | -------------------------------------------------- |
| **Search Projects** | 搜索、打开、打标签、播放和管理 Ableton Live 工程。 |
| **Manage Tags**     | 创建和管理 Stage、Genre 和 Track Role。            |

## 工作原理

- **`.als` 解析**：Set 文件是 gzip 压缩的 XML，用 `fast-xml-parser` 和 `saxes` 读取其中的 BPM、调性和拍号。
- **音频播放**：由一个内置的 Swift AVFoundation 小程序负责播放 bounce。它作为一个独立的后台进程运行，所以切换视图、关掉窗口后播放都不会中断；扩展通过几个小的命令文件和状态文件跨进程控制它。这个二进制（`assets/audio-player`）由 [`scripts/build-audio-player.sh`](scripts/build-audio-player.sh)（`npm run build:player`）从 [`swift/AudioPlayer.swift`](swift/AudioPlayer.swift) 编译而来，是同时支持 arm64 和 x86_64 的通用二进制。
- **存储**：分类、置顶和每个工程的元数据存在 Raycast LocalStorage 里，视图偏好存在 Raycast Cache 里；笔记和歌词是 Markdown 文件（可以放在你自己的文件夹里）。

## 快捷键

大多数操作都能在 Action Panel（`⌘K`）里找到。常用的几个：

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

## 已知限制

- **整张合集排队播放**会写出一个标准的 `.m3u` 播放列表，并用系统默认处理 `.m3u` 的 App 打开。请使用支持播放列表的播放器（IINA、VLC、Swinsian 等）。**QuickTime Player 不支持 `.m3u`**，无法把合集当作队列播放。
- **存在自定义文件夹里的笔记和歌词**是**按文件名**（`<工程名>.md`）和工程对应的。在扩展里改工程名，`.md` 会自动跟着改名；如果你自己手动改了 `.md` 的名字，扩展就找不到它了。
- 文件名中不安全、或在 Obsidian 里有特殊含义的字符（`/ \ : * ? " < > | # ^ [ ]`）会被替换成**外观相近的全角字符**（如 `Beat #3` → `Beat ＃3.md`），保证两个工程不会共用同一个文件。
- **把工程移到废纸篓**时，它在自定义文件夹里的笔记和歌词会被移进 `Deleted Projects/` 子文件夹，它的标签、轨号和角色会被保留 **30 天**。30 天内从废纸篓放回，下次打开 Search Projects 时一切都会还原。只是同名的新工程不受影响。
- **在 Finder 里改名或删除工程**会被自动识别（按文件夹的创建时间匹配工程）。如果给了 Raycast **完全磁盘访问权限**，会对照废纸篓确认删除；没有这个权限时不会自动改动任何数据，需要手动运行 **Clean up Leftovers** 清理已移除工程的数据。如果很多工程同时消失（比如拔掉了外接盘），什么都不会改动。
- 如果自定义的笔记或歌词文件夹被改名或移走，扩展会显示警告，并且在你到扩展设置里重新选择文件夹之前**不会写入任何内容**。

## 许可证

MIT © iyek
