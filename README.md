# Ableton Project Manager

A Raycast extension to browse, organize, and preview your Ableton Live projects — without leaving the keyboard. Search by name, tag projects by stage / genre / collection, keep per-project notes, preview the latest bounce with inline playback, and arrange tracks into collections (EPs / albums) with automatic energy analysis.

> macOS · Raycast · built for music producers who live in Ableton Live.

## Features

- **Search & browse projects** — fuzzy-search your Projects folder, sort by name / created / modified, pin favorites to the top, and switch between a compact Overview and a rich Detail view.
- **Tag & organize** — assign each project a **Stage** (Demo → Recording → Production → … → Released), **Genre**, and **Collection**, then filter the list by Stage or Genre.
- **Collections view** — group projects into EPs / albums, order the tracklist, assign per-track roles, edit a track's info and notes inline, and see an automatic **energy** scale derived from each bounce's audio.
- **Queue a whole collection** — send every project's latest bounce, in track order, to your default player as an `.m3u` playlist for back-to-back listening.
- **Inline bounce playback** — play the latest bounce of any project with a global, shared player (play / pause / resume, seek ±5s, restart). Playback keeps going as you switch views **and after you close the Raycast window** — it only stops on natural end, Stop, or quitting Raycast (⌘Q).
- **Browse bounces** — list every bounce for a project, preview with Quick Look (scrubbable), reveal in Finder, or open in the default app.
- **View sets** — list the `.als` sets in a project with parsed **BPM**, **key**, and **time signature**; open directly in Ableton Live.
- **Notes & lyrics** — write Markdown notes and lyrics per project, stored as `Notes.md` / `Lyrics.md` inside each project folder, or as `.md` files in folders of your choice (e.g. an Obsidian vault).
- **New Live Set** — launch Ableton Live for a fresh set.

## Screenshots

![Search Projects](metadata/ableton-project-manager-1.png)

![View Sets](metadata/ableton-project-manager-2.png)

![Browse Bounces](metadata/ableton-project-manager-3.png)

![Browse Collections](metadata/ableton-project-manager-4.png)

![Collections view](metadata/ableton-project-manager-5.png)

![Manage Tags](metadata/ableton-project-manager-6.png)

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

| Preference             | Required | Description                                                                                                                                                            |
| ---------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Projects Folder**    | ✅       | The folder containing your Ableton Live projects.                                                                                                                      |
| **Bounces Subfolder**  | —        | The subfolder inside each project where bounces are saved (e.g. `Bounces`). Leave empty to look directly in each project folder.                                       |
| **Notes Folder**       | —        | The folder where notes are saved as `.md` files (e.g. an Obsidian vault). Leave empty to save `Notes.md` in each project folder.                                       |
| **Lyrics Folder**      | —        | The folder where lyrics are saved as `.md` files. Leave empty to save `Lyrics.md` in each project folder.                                                              |
| **Notes Template**     | —        | Optional `.md` file to use as the starting point for new notes. Supports `{{title}}` and `{{date}}`.                                                                   |
| **Lyrics Template**    | —        | Optional `.md` file to use as the starting point for new lyrics. Supports `{{title}}` and `{{date}}`.                                                                  |
| **Strict Line Breaks** | —        | Off: preserve single line breaks. On: follow standard Markdown line breaks (two trailing spaces or a blank line). Affects the preview only; your files aren’t changed. |
| **Energy: Density**    | —        | How much density (crest factor) affects the energy score. Only the ratio between the three weights matters.                                                            |
| **Energy: Brightness** | —        | How much brightness (spectral centroid) affects the energy score.                                                                                                      |
| **Energy: Movement**   | —        | How much movement (spectral flux) affects the energy score.                                                                                                            |

### How energy is calculated

The latest bounce of each track is analyzed once, and the result is cached until the file changes. Three features are measured:

- **Density**: the crest factor (peak ÷ RMS). A lower crest factor means a denser, more compressed sound, which counts as more energy.
- **Brightness**: the spectral centroid, i.e. where the "center of mass" of the spectrum sits. Brighter, more treble-heavy tracks score higher.
- **Movement**: the spectral flux, i.e. how much the spectrum changes from one moment to the next. Busier tracks score higher.

Within a collection, each feature is scaled from 0 to 1 across its tracks: the lowest value becomes 0 and the highest becomes 1 (inverted for density). The three are then averaged using your weights (Off = 0, Low = 0.5, Normal = 1, High = 2), and the result is shown as 1–5 dots.

- Energy is **relative to the collection**: the same track can show a different number of dots in different collections.
- If a feature can't be measured (e.g. a silent bounce), the remaining features are reweighted. Tracks without a bounce show no energy.
- Set all three weights to **Off** to hide energy entirely.

## Commands

| Command             | Description                                                     |
| ------------------- | --------------------------------------------------------------- |
| **Search Projects** | Search, open, tag, play, and manage your Ableton Live projects. |
| **Manage Tags**     | Create and manage Stages, Genres, and Track Roles.              |

## How it works

- **`.als` parsing** — sets are gzipped XML; BPM / key / time-signature are read with `fast-xml-parser` and `saxes`.
- **Audio playback** — a small bundled Swift AVFoundation binary plays bounces; it runs as a single detached process so playback persists across views and after the window closes, controlled cross-process via small command / status files. The binary (`assets/audio-player`) is built from [`swift/AudioPlayer.swift`](swift/AudioPlayer.swift) by [`scripts/build-audio-player.sh`](scripts/build-audio-player.sh) (`npm run build:player`) as a universal arm64 + x86_64 executable.
- **Storage** — taxonomies, pins, and per-project metadata are kept in Raycast LocalStorage, view preferences in Raycast Cache; notes and lyrics are Markdown files (optionally in your own folder).

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
| Add projects to a collection  | `⌘N` (in a collection)                         |
| Move track to top / bottom    | `⌘⇧↑` / `⌘⇧↓` (in a collection)                |
| New Live Set                  | `⌘N`                                           |
| Open in Finder                | `⌘⌥O`                                          |

## Known limitations

- **Queue collection in player** writes a standard `.m3u` playlist and opens it with your default `.m3u` handler. Use a player that supports playlists (IINA, VLC, Swinsian, …). **QuickTime Player does not support `.m3u`** and will not play the collection as a queue.
- **Notes / lyrics in a custom folder** are linked to a project **by file name** (`<Project Name>.md`). Rename projects inside the extension and the `.md` follows automatically; if you rename the `.md` yourself, the extension won't find it anymore.
- Characters that are unsafe in filenames or special in Obsidian (`/ \ : * ? " < > | # ^ [ ]`) are replaced with **full-width look-alikes** (e.g. `Beat #3` → `Beat ＃3.md`), so two projects never share a file.
- **Moving a project to the Trash** moves its custom-folder notes / lyrics into a `Deleted Projects/` subfolder and remembers its tags, track numbers and roles for **30 days**. Put the project back from the Trash within that time and everything is restored the next time you open Search Projects. A new project that merely has the same name is not affected.
- **Renaming or deleting projects in Finder** is picked up automatically (projects are matched by folder creation date). With **Full Disk Access** granted to Raycast, a deletion is confirmed against the Trash; without it, nothing is changed automatically — run **Clean up Leftovers** to clear data for projects you removed. If many projects vanish at once (e.g. an external drive is unplugged), nothing is changed.
- If the custom notes / lyrics folder is renamed or moved, the extension shows a warning and **won't write anything** until you choose the folder again in Extension Preferences.

## License

MIT © iyek
