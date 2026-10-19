# Ableton Project Manager

A Raycast extension to browse, organize, and preview your Ableton Live projects — without leaving the keyboard. Search by name, tag projects by stage / genre / collection, keep per-project notes, preview the latest bounce with inline playback, and arrange tracks into collections (EPs / albums) with automatic energy analysis.

> macOS · Raycast · built for music producers who live in Ableton Live.

## Features

- **Search & browse projects** — fuzzy-search your Projects folder, sort by name / created / modified, pin favorites to the top, and switch between a compact Overview and a rich Detail view.
- **Tag & organize** — assign each project a **Stage** (idea → mixing → released), **Genre**, and **Collection**, then filter the list by Stage or Genre.
- **Collections view** — group projects into EPs / albums, order the tracklist, assign per-track roles, edit a track's info and notes inline, and see an automatic **energy** scale derived from each bounce's audio.
- **Queue a whole collection** — send every project's latest bounce, in track order, to your default player as an `.m3u` playlist for back-to-back listening.
- **Inline bounce playback** — play the latest bounce of any project with a global, shared player (play / pause / resume, seek ±5s, restart). Playback keeps going as you switch views **and after you close the Raycast window** — it only stops on natural end, Stop, or quitting Raycast (⌘Q).
- **Browse bounces** — list every bounce for a project, preview with Quick Look (scrubbable), reveal in Finder, or open in the default app.
- **View sets** — list the `.als` sets in a project with parsed **BPM**, **key**, and **time signature**; open directly in Ableton Live.
- **Notes & lyrics** — write Markdown notes and lyrics per project, stored inside the extension or as `.md` files in a folder of your choice (e.g. an Obsidian vault).
- **New Live Set** — launch Ableton Live for a fresh set.
- **Bilingual UI** — English and 简体中文.

## Screenshots

<!-- Add store screenshots to `metadata/` before publishing. -->

_Coming soon._

## Requirements

- macOS with [Raycast](https://raycast.com)
- [Ableton Live](https://www.ableton.com) (for opening sets)
- Node.js 22+ and npm (for development)

## Setup (Development)

```bash
git clone https://github.com/iyekChen/ableton-project-manager.git
cd ableton-project-manager
npm install
npm run build:player   # build the bundled Swift (AVFoundation) audio helper
npm run dev            # run the extension in Raycast (development mode)
```

Other scripts:

```bash
npm run lint       # ESLint + Prettier
npm run fix-lint   # auto-fix
npm run build      # production build
```

## Configuration

Set these in Raycast → Extensions → **Ableton Project Manager**:

| Preference                                         | Required | Description                                                                                                                   |
| -------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Projects Folder**                                | ✅       | Folder containing your Ableton Live projects.                                                                                 |
| **Bounces Folder**                                 | —        | Subfolder name where bounces live (e.g. `Bounces`). Empty = project root.                                                     |
| **Notes Folder**                                   | —        | Store project notes as `.md` here (e.g. an Obsidian vault). Empty = inside the extension.                                     |
| **Language**                                       | —        | `English` or `简体中文`.                                                                                                      |
| **Energy Weight: Density / Brightness / Activity** | —        | Relative weights (Off / Low / Normal / High) for the Collections energy scale. Only the differences between the three matter. |

## Commands

| Command             | Description                                                     |
| ------------------- | --------------------------------------------------------------- |
| **Search Projects** | Search, open, tag, play, and manage your Ableton Live projects. |
| **Manage Tags**     | Create and manage Stages, Genres, and Track Roles.              |

## How it works

- **`.als` parsing** — sets are gzipped XML; BPM / key / time-signature are read with `fast-xml-parser` and `saxes`.
- **Audio playback** — a small bundled Swift AVFoundation binary plays bounces; it runs as a single detached process so playback persists across views and after the window closes, controlled cross-process via small command / status files.
- **Storage** — taxonomies, pins, per-project metadata, and view preferences are kept in Raycast LocalStorage; notes are Markdown (optionally in your own folder).

## Keyboard shortcuts

Most actions are discoverable via the Action Panel (`⌘K`). A few highlights:

| Action                        | Shortcut                                       |
| ----------------------------- | ---------------------------------------------- |
| Play / pause latest bounce    | `⌘↵`                                           |
| Stop playback                 | `⌘-`                                           |
| Seek backward / forward (±5s) | `⌥←` / `⌥→`                                    |
| Restart track                 | `⌘←`                                           |
| Browse Bounces                | `⌥↵`                                           |
| Browse Collections            | `⌃↵`                                           |
| Back to Search Projects       | `⌃↵` / `⌥↵` (from a collection / bounces view) |
| Edit Info                     | `⌘E`                                           |
| Edit Note                     | `⌘⌥N`                                          |
| Queue collection in player    | `⌘⇧↵`                                          |
| New Live Set                  | `⌘N`                                           |
| Open in Finder                | `⌘⌥O`                                          |

## Known limitations

- **Queue collection in player** writes a standard `.m3u` playlist and opens it with your default `.m3u` handler. Use a player that supports playlists (IINA, VLC, Swinsian, …). **QuickTime Player does not support `.m3u`** and will not play the collection as a queue.
- **Notes / lyrics in a custom folder** are linked to a project **by file name** (`<Project Name>.md`). Rename projects inside the extension and the `.md` follows automatically; if you rename the `.md` yourself, the extension won't find it anymore.
- Characters that are unsafe in filenames or special in Obsidian (`/ \ : * ? " < > | # ^ [ ]`) are replaced with **full-width look-alikes** (e.g. `Beat #3` → `Beat ＃3.md`), so two projects never share a file.
- **Moving a project to the Trash** moves its custom-folder notes / lyrics into a `Deleted Projects/` subfolder and remembers its tags, track numbers and roles for **30 days**. Put the project back from the Trash within that time and everything is restored the next time you open Search Projects. A new project that merely has the same name is not affected.
- **Renaming or deleting projects in Finder** is picked up automatically (projects are matched by folder creation date). With **Full Disk Access** granted to Raycast, a deletion is confirmed against the Trash; without it, a vanished project is treated as deleted and fully restored if it comes back. If many projects vanish at once (e.g. an external drive is unplugged), nothing is changed.
- If the custom notes / lyrics folder is renamed or moved, the extension shows a warning and **won't write anything** until you choose the folder again in Extension Preferences.

## License

MIT © iyek
