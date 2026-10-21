<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Ableton Project Manager 图标" />
</p>

<h1 align="center">Ableton Project Manager</h1>

<p align="center">
  在 Raycast 里管理、整理、试听你的 Ableton Live 工程，手不用离开键盘。
</p>

<p align="center">
  <a href="README.md">English</a> | 简体中文
</p>

---

搜工程、按进度和风格打标签、把笔记和歌词放在每首歌旁边、随手播放最新的 bounce，再把作品排进 EP 和专辑，每首歌还会显示在这张专辑里的相对能量。

> 扩展界面只有英文。下文提到的 Action、命令和设置项都保留英文原名，方便你在界面里对照。

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
      <a href="metadata/ableton-project-manager-5.png"><img src="metadata/ableton-project-manager-5.png" alt="Collection" /></a>
      <br /><sub>Collection</sub>
    </td>
    <td align="center" width="33%">
      <a href="metadata/ableton-project-manager-6.png"><img src="metadata/ableton-project-manager-6.png" alt="Manage Tags" /></a>
      <br /><sub>Manage Tags</sub>
    </td>
  </tr>
</table>

## 功能

### 查找

- Projects Folder 下的每个子文件夹，只要里面有 `.als` 文件，就算一个工程。
- 按名字搜索，也可以用搜索栏右侧的下拉框按 Stage 或 Genre 筛选。
- 可以按创建时间、修改时间或名字排序，也可以按 Created / Modified 分组：今天、昨天、过去 7 天、过去 30 天，更早的按月份和年份归组。工程的“修改时间”取的是其中任意一个 Live Set 最后一次改动的时间。
- 常用的工程可以 Pin 在最上面，还能调整先后。
- Detail 视图显示 Stage、Genre、所属合集、Set 和 bounce 数量、日期，以及笔记或歌词；Overview 视图更紧凑，只显示 Stage 和 Set、bounce 的数量。

### Live Set

- View Sets 列出工程里的所有 `.als`，并从 Set 文件本身读出调性、BPM 和拍号。Set 里关掉了 Scale 时，调性一栏留空。
- 可以 Open in Ableton Live、Rename Set、Duplicate Set（副本依次叫 `Song copy.als`、`Song copy 2.als`……），或 Move to Trash。

### 试听

- 按 `⌘↵` 播放最新的 bounce，也就是该工程所有 bounce 里最近修改过的那个音频文件（支持 WAV、AIFF、MP3、M4A、FLAC）。播放时 Toast 会显示歌名和进度。
- 支持暂停、继续、前后跳 5 秒、从头播放和停止。同一时间只放一首；切换视图或关掉 Raycast 窗口都不会打断播放。播完、执行 Stop Playback，或者退出 Raycast 时停止。
- Browse Bounces 里可以用 Quick Look 预览、用默认 App 打开、在 Finder 中显示、改名、复制文件或它的名字、路径，也能移到废纸篓。列表可以按日期、名字或大小排序，按来源或日期分组。
- 用 Manage External Bounce 可以把工程以外的文件夹或文件也算作这个工程的 bounce，比如一个统一的导出文件夹。暂时找不到的来源（比如移动硬盘没插）会标成 Unavailable 并保留，直到你手动移除。

### 整理

- Edit Info 可以改工程文件夹的名字，设置 Stage、Genre 和所属合集；在合集里打开时，还能设置这首歌在合集里的 Role。
- Manage Tags 里可以新建、改名、排序、删除 Stage、Genre 和 Role，给 Stage 换颜色，或把某一类恢复成默认列表。选中一个 Stage 或 Genre 后执行 Assign to Projects，就能一次给很多工程打上这个标签。
- 默认的 Stage 依次是 Demo → Recording → Production → Mix → Master → Done → Released；默认的 Role 有 Intro、Skit、Interlude、Outro。
- Duplicate Project 会像 Finder 一样复制整个工程文件夹（副本叫 `Song copy`），副本不带任何标签。
- 在 Finder 里改名或删除工程，扩展都能识别，详见[工程追踪](#工程追踪)。

### 笔记与歌词

- 笔记和歌词都是普通的 Markdown 文件：默认在每个工程文件夹里放 `Notes.md` 和 `Lyrics.md`；也可以统一放进你指定的文件夹（比如 Obsidian 库），文件名就是 `<工程名>.md`。
- 在 Raycast 里用 Edit Note 直接写笔记；Open Note 和 Open Lyrics 会用默认编辑器打开文件，文件还不存在时按模板新建。
- 在别的编辑器里保存后，Detail 里的内容会马上更新。预览时会隐藏开头的 YAML frontmatter，在 Raycast 里编辑也不会把它弄丢。
- 打开 Edit Note 之后，如果这份笔记又在别处被改过，保存前会先问你要不要覆盖。

### 合集

- 把工程编成 EP 或专辑。编了号的曲目组成 Tracklist，没编号的先放在 Unsorted；重复的曲号会标出来，Tracklist 的标题会显示总时长。
- 每首歌显示 Role、曲号、时长和能量。Detail 里还有 Stage，以及从最近修改的 Set 读出的 BPM、调性和拍号，下面是笔记或歌词。
- 正在做的合集可以 Pin 在最上面。
- Queue Collection in Player（`⌘⇧↵`）按曲目顺序生成一个 `.m3u` 播放列表，交给默认播放器打开，整张连着听。
- 每首歌的最新 bounce 都会被分析一遍，得出 1～5 个点的相对能量，用来帮你排曲序，详见[能量是怎么算的](#能量是怎么算的)。

## 安装

即将上架 Raycast Store。在此之前可以从源码运行，见[开发](#开发)。

需要 macOS 和 [Raycast](https://raycast.com)。只有打开 Live Set 时才需要 [Ableton Live](https://www.ableton.com)。

## 快速上手

1. **选择 Projects Folder**：打开 Search Projects，第一次运行时 Raycast 会让你选择存放 Ableton Live 工程的文件夹。
2. **告诉它 bounce 在哪**：如果你习惯把 bounce 导出到工程里的某个子文件夹，就在 Bounces Subfolder 填上它的名字（比如 `Bounces`）；直接放在工程文件夹里的话留空即可。
3. **打标签**：打开 Manage Tags，选中一个 Stage 或 Genre，执行 Assign to Projects。
4. **建合集**：在 Search Projects 里按 `⌃↵` 进入合集列表，按 `⌘N` 新建。打开合集后按 `⌘N` 添加工程，再用 Set Track Number（`↵`）或 Add to Tracklist（`⌘.`）给每首歌编号。

## 命令

| 命令                | 用途                                                        |
| ------------------- | ----------------------------------------------------------- |
| **Search Projects** | 搜索、打开、打标签、试听和管理工程，也是进入合集的入口。    |
| **Manage Tags**     | 新建、排序 Stage 和 Genre 并批量分配给工程；管理曲目 Role。 |

## 快捷键

所有操作都能在 Action Panel（`⌘K`）里找到。从 Search Projects 进入 Browse Bounces（`⌥↵`）或 Browse Collections（`⌃↵`）后，再按同一个键就能回来。

**Search Projects**

| 操作                              | 快捷键                |
| --------------------------------- | --------------------- |
| View Sets                         | `↵`                   |
| 播放 / 暂停最新 bounce            | `⌘↵`                  |
| Browse Bounces                    | `⌥↵`                  |
| Browse Collections                | `⌃↵`                  |
| 停止播放                          | `⌘-`                  |
| 后退 / 前进 5 秒                  | `⌥←` / `⌥→`           |
| 从头播放                          | `⌘←`                  |
| Edit Info                         | `⌘E`                  |
| Edit Note                         | `⌘⌥N`                 |
| Open Note / Open Lyrics           | `⌘⇧N` / `⌘⇧L`         |
| Open in Finder                    | `⌘⌥O`                 |
| New Live Set（启动 Ableton Live） | `⌘N`                  |
| Duplicate Project                 | `⌘D`                  |
| 复制最新 bounce / 名字 / 路径     | `⌘⇧C` / `⌘⌥C` / `⌘⌃C` |
| Pin / Unpin                       | `⌘.`                  |
| 已 Pin 的工程上移 / 下移          | `⌘⌥↑` / `⌘⌥↓`         |
| Move to Trash                     | `⌃X`                  |

**合集内**

播放、Edit Info、笔记和复制相关的快捷键与 Search Projects 相同。

| 操作                       | 快捷键        |
| -------------------------- | ------------- |
| Set Track Number           | `↵`           |
| 播放 / 暂停最新 bounce     | `⌘↵`          |
| Queue Collection in Player | `⌘⇧↵`         |
| Add Projects               | `⌘N`          |
| 加入 / 移出 Tracklist      | `⌘.`          |
| 与上一首 / 下一首交换      | `⌘⌥↑` / `⌘⌥↓` |
| 移到最前 / 最后            | `⌘⇧↑` / `⌘⇧↓` |
| Remove from Collection     | `⌃X`          |

**其他视图**

| 视图               | 快捷键                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Browse Collections | 打开 `↵` · Create `⌘N` · Rename `⌘E` · Pin `⌘.` · Delete `⌃X`                                                                  |
| View Sets          | Open in Ableton Live `↵` · Show in Finder `⌘⌥O` · Rename Set `⌘E` · Duplicate Set `⌘D` · Move to Trash `⌃X`                    |
| Browse Bounces     | Quick Look `↵` · Open in Default App `⌘O` · Show in Finder `⌘⌥O` · Rename Bounce `⌘E` · Copy Bounce `⌘⇧C` · Move to Trash `⌃X` |
| Manage Tags        | Edit `↵` · Create `⌘N` · 上移 / 下移 `⌘⌥↑` / `⌘⌥↓` · 移到最前 / 最后 `⌘⇧↑` / `⌘⇧↓` · Delete `⌃X`                               |

## 设置

在 Raycast → Extensions → **Ableton Project Manager** 里设置。

| 设置项                 | 说明                                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Projects Folder**    | 存放 Ableton Live 工程的文件夹。                                                                                                 |
| **Bounces Subfolder**  | 每个工程里存 bounce 的子文件夹名（比如 `Bounces`）。留空则直接在工程文件夹里找。                                                 |
| **Notes Folder**       | 统一存放笔记的文件夹，比如 Obsidian 库。留空则在每个工程文件夹里存 `Notes.md`。                                                  |
| **Lyrics Folder**      | 统一存放歌词的文件夹。留空则在每个工程文件夹里存 `Lyrics.md`。                                                                   |
| **Notes Template**     | 新建笔记时套用的 `.md` 模板，可选。                                                                                              |
| **Lyrics Template**    | 新建歌词时套用的 `.md` 模板，可选。                                                                                              |
| **Strict Line Breaks** | 关闭时，单个换行就是换行（和 Obsidian 一样）；打开后按标准 Markdown 处理，行尾两个空格或空一行才换行。只影响预览，不会改动文件。 |
| **Energy: Density**    | 密度（波峰因数）在能量里占多大比重。三项权重只看相互之间的比例。                                                                 |
| **Energy: Brightness** | 亮度（频谱质心）在能量里占多大比重。                                                                                             |
| **Energy: Movement**   | 变化量（频谱通量）在能量里占多大比重。                                                                                           |

模板里的 `{{title}}` 会换成工程名，`{{date}}` 会换成新建文件当天的日期（`YYYY-MM-DD`）。

### 能量是怎么算的

打开合集后，扩展会在后台逐首分析最新的 bounce，分析完之前列表标题会显示进度。结果会缓存下来，文件不变就不会重算。分析时先把整首歌混成单声道，再测三项指标：

- **密度（Density）**：波峰因数，即峰值 ÷ RMS。数值越低，声音越密、压得越紧，能量越高。
- **亮度（Brightness）**：按功率加权的频谱质心。高频越多，能量越高。
- **变化量（Movement）**：频谱通量，衡量频谱随时间变化有多大。编曲越忙，能量越高。计算前会先把音量归一，所以单纯更响并不会让这一项变高。

接着，每一项都在这张合集的 Tracklist 曲目之间缩放到 0～1：最低的记 0，最高的记 1（密度反过来算）。所有曲目某一项都一样时，这一项记 0.5。最后按你设的权重取加权平均（Off = 0，Low = 0.5，Normal = 1，High = 2），显示成 1～5 个点，颜色从冷到暖。

- 能量是相对的：同一首歌放进不同合集，得分可能不一样。
- 只有 Tracklist 里的曲目有能量；Unsorted 里的不显示，也不会影响其他曲目的得分。
- 某一项测不出来（比如 bounce 是静音）时，只用剩下几项计算。没有 bounce 的曲目显示为空点。
- 三项权重都设成 Off，能量就完全隐藏。

## 数据与文件

### 什么时候会改动磁盘上的文件

只有你主动操作时才会改动工程文件，包括：在 Edit Info 里给工程改名、Rename / Duplicate Set、Rename Bounce、Duplicate Project，以及 Move to Trash。给工程或 Set 改名前，扩展会提醒你先在 Ableton Live 里把它关掉。笔记和歌词只在你编辑或打开时写入，并会跟着工程一起改名或归档（见下文）。

### 数据存在哪里

扩展自己的数据都存在 Raycast 里：

- **LocalStorage**：Stage、Genre、Role 和合集列表；每个工程的标签、所属合集、Pin 状态和外部 bounce 来源；曲号和 Role；Pin 住的合集；用来发现 Finder 改动的工程清单；已删除工程的记录；以及 Set 元数据和 bounce 分析结果的缓存。
- **Cache**：视图模式、排序和分组的选择，以及 bounce 数量的缓存。

这些数据由 Raycast 按扩展单独保存，卸载扩展就会一并删除。工程、笔记和歌词都是普通文件，不受影响。

### 工程追踪

Search Projects 开着的时候会一直监听 Projects Folder，有工程新增、改名、删除或从废纸篓放回，都会自动刷新。关着期间发生的改动，下次打开时补上。

- **改名**：在 Finder 里改了名的工程，靠文件夹的创建时间和 inode 认出来，标签、曲号、Role 和笔记都会跟过去。先复制一份再删掉原件，不会被误当成改名。
- **删除**：如果 Raycast 有“完全磁盘访问权限”，并且在废纸篓里找到了这个文件夹，扩展会像 Move to Trash 一样归档并清掉它的数据。没有这个权限时，扩展不会自动清理：它会弹出提示，可以直接跳到系统设置去授权；之后如果确实是你删的，就用 Clean up Leftovers 手动清掉（有残留数据时它才会出现在 Action Panel 里）。
- **硬盘没接**：如果工程一下子全没了，或者一次消失了一半以上（且超过 3 个），扩展什么都不改，只提示你检查硬盘或 Projects Folder 设置。
- **换文件夹**：每个 Projects Folder 各记一份清单，换来换去不会被当成批量删除。
- **从废纸篓恢复**：工程移到废纸篓后，它的标签、所属合集、曲号和 Role 会保留 30 天；存在自定义文件夹里的笔记和歌词会移进那里的 `Deleted Projects/` 子文件夹。30 天内把文件夹从废纸篓放回，一切都会还原。期间删掉的合集会跳过，之后新加的数据也不会被覆盖。
- **同名新工程**：新建的文件夹即使和已删除的工程同名，也不会继承它的数据。

### 笔记和歌词的文件名

- 存进自定义文件夹时，文件名是 `<工程名>.md`；如果笔记和歌词设成了同一个文件夹，就分别叫 `<工程名> @Notes.md` 和 `<工程名> @Lyrics.md`。
- 无论在扩展里还是在 Finder 里给工程改名，对应的笔记和歌词文件都会跟着改名。
- 文件名不允许、或在 Obsidian 里有特殊含义的字符（`/ \ : * ? " < > | # ^ [ ]`）会换成长得像的全角字符，比如 `Beat #3` 存成 `Beat ＃3.md`。如果两个工程名换完之后还是落到同一个文件，扩展会先停止读写这份文件，等你把其中一个改名。

## 已知限制

- **Queue Collection in Player**：需要支持 `.m3u` 播放列表的播放器，比如 IINA、VLC、Swinsian。QuickTime Player 不支持。
- **bounce 的位置**：只找 Bounces Subfolder（以及你加的外部文件夹）里直接放着的文件，不会往更深的子文件夹里找。
- **手动改了笔记文件名**：自己在外面给笔记或歌词的 `.md` 改了名，扩展就找不到它了。
- **挪动了自定义文件夹**：笔记或歌词的自定义文件夹被改名或移走后，扩展会显示警告，并且不再写入任何内容，直到你在 Extension Preferences 里重新选择这个文件夹。
- **界面语言**：只有英文。

## 开发

需要 Node.js 22 以上和 npm。

```bash
git clone https://github.com/iyekChen/ableton-project-manager.git
cd ableton-project-manager
npm install
npm run dev        # 以开发模式在 Raycast 中运行
```

检查与构建：

```bash
npm run lint       # ESLint + Prettier
npm run fix-lint   # 自动修复格式问题
npm test           # 用 Vitest 跑单元测试
npm run build      # 构建正式版本
```

播放器二进制（`assets/audio-player`）已经提交在仓库里，运行扩展不需要自己编译。只有改了 [`swift/AudioPlayer.swift`](swift/AudioPlayer.swift) 才需要重新编译，并把二进制和 `swift/AudioPlayer.swift.sha256` 一起提交：

```bash
npm run build:player   # 需要先安装 Xcode Command Line Tools（用到 swiftc 和 lipo）
```

CI 会依次跑 lint 和测试、检查提交的二进制和 Swift 源码是否对得上，然后编译播放器和扩展。

### 工作原理

- **读取 Live Set**：`.als` 其实是 gzip 压缩的 XML。扩展边解压边用 [`saxes`](https://github.com/lddubeau/saxes) 流式解析，读出速度、拍号和调式。
- **播放**：一个基于 AVFoundation 的小型 Swift 程序负责播放，它独立于 Raycast 命令运行，所以切换视图、关掉窗口都不会中断。扩展通过 support 目录里的命令文件和状态文件控制它；Raycast 退出后，它会自己停下。
- **分析**：同一个程序还有 `analyze` 模式，分块读取音频，用 2048 点 FFT 计算 RMS、峰值、频谱质心和频谱通量，不会把整个文件读进内存。
- **编译**：[`scripts/build-audio-player.sh`](scripts/build-audio-player.sh) 编出同时支持 arm64 和 x86_64 的通用二进制（最低 macOS 11），并记下源码哈希，供 CI 核对。

## 许可证

MIT © iyek
