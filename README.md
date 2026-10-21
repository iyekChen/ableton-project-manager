<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Ableton Project Manager icon" />
</p>

<h1 align="center">Ableton Project Manager</h1>

<p align="center">
  Browse, organize, and listen to your Ableton Live projects from Raycast — without leaving the keyboard.
</p>

<p align="center">
  English | <a href="README.zh-CN.md">简体中文</a>
</p>

---

Search projects, tag them by stage and genre, keep notes and lyrics next to each song, play the latest bounce, and arrange tracks into EPs and albums with a relative energy score for each track.

## Screenshots

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

## Features

### Find

- Every folder directly inside your Projects Folder that contains at least one `.als` file is a project.
- Search by name, and filter by stage or genre from the search bar dropdown.
- Sort by creation date, modification date, or name. Group by Created or Modified: Today, Yesterday, Previous 7 Days, Previous 30 Days, then by month and year. A project's modification date is the last time any of its Live Sets changed.
- Pin projects to the top and reorder them.
- Switch between Detail (stage, genres, collections, Set and bounce counts, dates, and the project's notes or lyrics) and Overview (stage, Set count, and bounce count).

### Sets

- View Sets lists every `.als` file in a project with its key, BPM, and time signature, read from the Set itself. The key is left blank when the Set's scale is turned off.
- Open in Ableton Live, Rename Set, Duplicate Set (`Song copy.als`, `Song copy 2.als`, …), or Move to Trash.

### Listen

- Play Latest Bounce with `⌘↵`. The latest bounce is the most recently modified audio file (WAV, AIFF, MP3, M4A, or FLAC) among the project's bounces. A toast shows the song and elapsed / total time.
- Pause, resume, seek ±5 seconds, restart, or stop. One bounce plays at a time. Playback continues when you switch views or close the Raycast window, and stops when the track ends, when you choose Stop Playback, or when you quit Raycast.
- Browse Bounces: Quick Look, open in your default app, show in Finder, rename, copy the file, its name, or its path, or move it to Trash. Sort by date, name, or size; group by source or date.
- Manage External Bounce: count folders or files outside the project as its bounces, such as a shared export folder. Sources that can't be reached (an unplugged drive, for example) stay listed as Unavailable until you remove them.

### Organize

- Edit Info: rename the project folder and set its stage, genres, and collections. Inside a collection, you can also set the track's role.
- Manage Tags: create, rename, reorder, and delete stages, genres, and roles; recolor stages; or reset any list to its defaults. Use Assign to Projects to give a stage or genre to many projects at once.
- Default stages: Demo → Recording → Production → Mix → Master → Done → Released. Default roles: Intro, Skit, Interlude, Outro.
- Duplicate Project copies the whole project folder, as Finder does (`Song copy`). The copy starts with no tags.
- Renames and deletions made in Finder are picked up automatically. See [Project tracking](#project-tracking).

### Write

- Notes and lyrics are plain Markdown files: `Notes.md` and `Lyrics.md` in each project folder, or `<Project Name>.md` in a folder you choose, such as an Obsidian vault.
- Edit Note writes notes without leaving Raycast. Open Note and Open Lyrics open the files in your default editor and create them from your template if they don't exist yet.
- Saves made in other editors show up in the Detail view right away. YAML frontmatter is hidden in the preview and kept intact when you edit in Raycast.
- If the note changed elsewhere after you opened Edit Note, saving asks before overwriting it.

### Collections

- Group projects into EPs and albums. Numbered tracks form the Tracklist; tracks without a number wait in Unsorted. Duplicate track numbers are flagged, and the Tracklist header shows the total duration.
- Each track shows its role, track number, duration, and energy. Detail adds stage, BPM, key, and time signature from the most recently modified Set, plus notes or lyrics.
- Pin the collections you're working on.
- Queue Collection in Player (`⌘⇧↵`) writes an `.m3u` playlist in track order and opens it in your default player.
- Each track's latest bounce is analyzed to give a relative energy score from 1 to 5 dots. See [How energy is calculated](#how-energy-is-calculated).

## Install

Coming soon to the Raycast Store. Until then, you can run the extension from source — see [For developers](#for-developers).

Requires macOS and [Raycast](https://raycast.com). [Ableton Live](https://www.ableton.com) is needed only to open Live Sets.

## Quick start

1. **Set your Projects Folder.** Open Search Projects. On first launch, Raycast asks for the folder that contains your Ableton Live projects.
2. **Point to your bounces.** If you export bounces into a subfolder of each project, enter its name in Bounces Subfolder (e.g. `Bounces`). Leave it empty if they sit directly in the project folder.
3. **Tag your projects.** Open Manage Tags, select a stage or genre, and choose Assign to Projects.
4. **Build a collection.** In Search Projects, press `⌃↵` to browse collections and `⌘N` to create one. Open it, add projects with `⌘N`, then give each track a number with Set Track Number (`↵`) or Add to Tracklist (`⌘.`).

## Commands

| Command             | Description                                                                     |
| ------------------- | ------------------------------------------------------------------------------- |
| **Search Projects** | Search, open, tag, play, and manage your Ableton Live projects and collections. |
| **Manage Tags**     | Create, reorder, and assign stages and genres; manage track roles.              |

## Keyboard shortcuts

Every action is also available in the Action Panel (`⌘K`). The key that opens Browse Bounces (`⌥↵`) or Browse Collections (`⌃↵`) also takes you back to Search Projects.

**Search Projects**

| Action                               | Shortcut              |
| ------------------------------------ | --------------------- |
| View Sets                            | `↵`                   |
| Play / pause latest bounce           | `⌘↵`                  |
| Browse Bounces                       | `⌥↵`                  |
| Browse Collections                   | `⌃↵`                  |
| Stop playback                        | `⌘-`                  |
| Seek backward / forward 5 s          | `⌥←` / `⌥→`           |
| Restart track                        | `⌘←`                  |
| Edit Info                            | `⌘E`                  |
| Edit Note                            | `⌘⌥N`                 |
| Open Note / Open Lyrics              | `⌘⇧N` / `⌘⇧L`         |
| Open in Finder                       | `⌘⌥O`                 |
| New Live Set (launches Ableton Live) | `⌘N`                  |
| Duplicate Project                    | `⌘D`                  |
| Copy latest bounce / name / path     | `⌘⇧C` / `⌘⌥C` / `⌘⌃C` |
| Pin / unpin                          | `⌘.`                  |
| Move pinned project up / down        | `⌘⌥↑` / `⌘⌥↓`         |
| Move to Trash                        | `⌃X`                  |

**Collection**

Playback, Edit Info, note, and copy shortcuts work the same as in Search Projects.

| Action                         | Shortcut      |
| ------------------------------ | ------------- |
| Set Track Number               | `↵`           |
| Play / pause latest bounce     | `⌘↵`          |
| Queue Collection in Player     | `⌘⇧↵`         |
| Add Projects                   | `⌘N`          |
| Add to / remove from Tracklist | `⌘.`          |
| Swap up / down                 | `⌘⌥↑` / `⌘⌥↓` |
| Move to top / bottom           | `⌘⇧↑` / `⌘⇧↓` |
| Remove from Collection         | `⌃X`          |

**Other views**

| View               | Shortcuts                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Browse Collections | Open `↵` · Create `⌘N` · Rename `⌘E` · Pin `⌘.` · Delete `⌃X`                                                                  |
| View Sets          | Open in Ableton Live `↵` · Show in Finder `⌘⌥O` · Rename Set `⌘E` · Duplicate Set `⌘D` · Move to Trash `⌃X`                    |
| Browse Bounces     | Quick Look `↵` · Open in Default App `⌘O` · Show in Finder `⌘⌥O` · Rename Bounce `⌘E` · Copy Bounce `⌘⇧C` · Move to Trash `⌃X` |
| Manage Tags        | Edit `↵` · Create `⌘N` · Move up / down `⌘⌥↑` / `⌘⌥↓` · Move to top / bottom `⌘⇧↑` / `⌘⇧↓` · Delete `⌃X`                       |

## Configuration

Configure the extension in Raycast → Extensions → **Ableton Project Manager**.

| Preference             | Description                                                                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Projects Folder**    | The folder containing your Ableton Live projects.                                                                                                                      |
| **Bounces Subfolder**  | The subfolder inside each project where bounces are saved (e.g. `Bounces`). Leave empty to look directly in each project folder.                                       |
| **Notes Folder**       | The folder where notes are saved as `.md` files (e.g. an Obsidian vault). Leave empty to save `Notes.md` in each project folder.                                       |
| **Lyrics Folder**      | The folder where lyrics are saved as `.md` files. Leave empty to save `Lyrics.md` in each project folder.                                                              |
| **Notes Template**     | Optional `.md` file to use as the starting point for new notes. Supports `{{title}}` and `{{date}}`.                                                                   |
| **Lyrics Template**    | Optional `.md` file to use as the starting point for new lyrics. Supports `{{title}}` and `{{date}}`.                                                                  |
| **Strict Line Breaks** | Off: preserve single line breaks. On: follow standard Markdown line breaks (two trailing spaces or a blank line). Affects the preview only; your files aren’t changed. |
| **Energy: Density**    | How much density (crest factor) affects the energy score. Only the ratio between the three weights matters.                                                            |
| **Energy: Brightness** | How much brightness (spectral centroid) affects the energy score.                                                                                                      |
| **Energy: Movement**   | How much movement (spectral flux) affects the energy score.                                                                                                            |

In templates, `{{title}}` becomes the project name and `{{date}}` becomes the date the file is created (`YYYY-MM-DD`).

### How energy is calculated

When you open a collection, the latest bounce of every track is analyzed in the background; the header shows progress until it finishes. Results are cached and reused until the file changes. Three features are measured on a mono mix-down of the whole file:

- **Density:** crest factor (peak ÷ RMS). A lower crest factor means a denser, more compressed sound, so it scores higher.
- **Brightness:** the power-weighted spectral centroid. Brighter, more treble-heavy tracks score higher.
- **Movement:** spectral flux, how much the spectrum changes from one moment to the next. Busier tracks score higher. Flux is measured on a level-normalized spectrum, so loudness alone doesn't raise it.

Each feature is then scaled from 0 to 1 across the tracks in the collection's Tracklist: the lowest value becomes 0 and the highest becomes 1 (density is inverted). If every track has the same value, that feature counts as 0.5. The score is the weighted average of the three, using Off = 0, Low = 0.5, Normal = 1, High = 2, and is shown as 1–5 dots colored from cool to warm.

- Energy is relative to the collection. The same track can score differently in another collection.
- Only tracks in the Tracklist get a score. Unsorted tracks don't, and they don't affect anyone else's score.
- If a feature can't be measured (e.g. a silent bounce), the remaining weights are used. Tracks without a bounce show empty dots.
- Set all three weights to Off to hide energy entirely.

## Data and file management

### What changes on disk

Project files change only when you ask: renaming a project in Edit Info, renaming or duplicating a Set, renaming a bounce, duplicating a project, or moving something to Trash. Renaming a project or Set asks you to close it in Ableton Live first. Notes and lyrics are written only when you edit or open them, and are renamed or archived along with their project as described below.

### Storage

The extension stores its own data in Raycast:

- **LocalStorage:** stages, genres, roles, and collections; each project's tags, collections, pin, and external bounce sources; track numbers and roles; pinned collections; the project list used to detect Finder changes; records of deleted projects; and cached Set metadata and bounce analysis.
- **Cache:** view mode, sort, and grouping choices, and bounce counts.

Raycast keeps this data per extension. Uninstalling the extension deletes it. Your projects, notes, and lyrics are ordinary files and aren't affected.

### Project tracking

While Search Projects is open, it watches your Projects Folder and reloads when projects are added, renamed, removed, or put back. Changes made while it was closed are applied the next time you open it.

- **Renames:** a project renamed in Finder is recognized by its folder's creation time and inode, and its tags, track numbers, roles, and notes move with it. Duplicating a folder and deleting the original is not mistaken for a rename.
- **Deletions:** if Raycast has Full Disk Access and the folder is found in the Trash, its data is archived and cleared, just like Move to Trash. Without Full Disk Access, nothing is cleared automatically. A toast lets you open the Full Disk Access settings, and Clean up Leftovers (in the Action Panel when there is something to clean up) clears data for projects you removed.
- **Missing drive:** if every project disappears, or more than half of them (and more than three) disappear at once, nothing is changed. A toast suggests checking the drive or the Projects Folder setting.
- **Separate folders:** each Projects Folder keeps its own project list, so switching folders doesn't look like mass deletion.
- **Trash recovery:** moving a project to Trash keeps its tags, collections, track numbers, and roles for 30 days. Notes and lyrics stored in custom folders move into a `Deleted Projects/` subfolder. Put the folder back from the Trash within that time and everything is restored. Collections deleted in the meantime are skipped, and nothing overwrites data you've added since.
- **New projects:** a new folder that happens to share a deleted project's name doesn't inherit its data.

### Notes and lyrics

- In a custom folder, files are named `<Project Name>.md`. If notes and lyrics share the same folder, they are named `<Project Name> @Notes.md` and `<Project Name> @Lyrics.md`.
- Renaming a project in the extension or in Finder also renames its note and lyrics files.
- Characters that are unsafe in file names or special in Obsidian (`/ \ : * ? " < > | # ^ [ ]`) are replaced with full-width look-alikes, so `Beat #3` becomes `Beat ＃3.md`. If two project names would still end up with the same file, the extension won't read or write it until you rename one of them.

## Known limitations

- **Queue Collection in Player:** use a player that supports `.m3u` playlists, such as IINA, VLC, or Swinsian. QuickTime Player doesn't.
- **Bounces:** only files directly inside the Bounces Subfolder (or the external folders you add) are found. Subfolders aren't scanned.
- **Renaming files externally:** if you rename a note or lyrics `.md` file yourself, the extension can no longer find it.
- **Moving custom folders:** if a custom notes or lyrics folder is renamed or moved, the extension shows a warning and won't write anything until you choose the folder again in Extension Preferences.
- **Language:** the interface is in English only.

## For developers

Requires Node.js 22+ and npm.

```bash
git clone https://github.com/iyekChen/ableton-project-manager.git
cd ableton-project-manager
npm install
npm run dev        # Run the extension in Raycast development mode
```

Checks and builds:

```bash
npm run lint       # ESLint + Prettier
npm run fix-lint   # Auto-fix lint and formatting issues
npm test           # Run unit tests with Vitest
npm run build      # Build the production extension
```

The audio player binary (`assets/audio-player`) is committed, so you don't need to build it to run the extension. If you change [`swift/AudioPlayer.swift`](swift/AudioPlayer.swift), rebuild it and commit both the binary and `swift/AudioPlayer.swift.sha256`:

```bash
npm run build:player   # Requires Xcode Command Line Tools (swiftc, lipo)
```

CI runs lint and tests, checks that the committed binary matches the Swift source, then builds the player and the extension.

### How it works

- **Live Sets:** `.als` files are gzipped XML. Each Set is streamed through gunzip and parsed with [`saxes`](https://github.com/lddubeau/saxes) to read tempo, time signature, and scale.
- **Playback:** a small Swift binary built on AVFoundation plays bounces as a detached process, so playback survives view changes and closing the Raycast window. The extension controls it through command and status files in its support folder. The player stops on its own when Raycast quits.
- **Analysis:** the same binary has an `analyze` mode that streams the file in chunks and computes RMS, peak, spectral centroid, and spectral flux using a 2048-point FFT, without loading the whole file into memory.
- **Build:** [`scripts/build-audio-player.sh`](scripts/build-audio-player.sh) compiles a universal arm64 + x86_64 binary targeting macOS 11 and records the source hash that CI checks.

## License

MIT © iyek
