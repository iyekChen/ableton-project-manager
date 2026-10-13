# Ableton Session Manager

A Raycast extension to browse, organize, and preview your Ableton Live projects — without leaving the keyboard. Search by name, tag projects by stage / genre / collection, keep per-project notes, preview the latest bounce with inline playback, and arrange tracks into collections (EPs / albums) with automatic energy analysis.

> macOS · Raycast · built for music producers who live in Ableton Live.

## Features

- **Search & browse projects** — fuzzy-search your Projects folder, sort by name / created / modified, pin favorites to the top, and switch between a compact Overview and a rich Detail view.
- **Tag & organize** — assign each project a **Stage** (idea → mixing → released), **Genre**, and **Collection**, then filter the list by Stage or Genre.
- **Collections view** — group projects into EPs / albums, order the tracklist, assign per-track roles, and see an automatic **energy** scale derived from each bounce's audio.
- **Inline bounce playback** — play the latest bounce of any project with a global, shared player (play / pause / resume, seek ±5s, restart) that keeps playing as you move between views.
- **Browse bounces** — list every bounce for a project, preview with Quick Look (scrubbable), reveal in Finder, or open in the default app.
- **View sets** — list the `.als` sets in a project with parsed **BPM**, **key**, and **time signature**; open directly in Ableton Live.
- **Notes** — write Markdown notes per project, stored inside the extension or as `.md` files in a folder of your choice (e.g. an Obsidian vault).
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
git clone https://github.com/iyekChen/ableton-session-manager.git
cd ableton-session-manager
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

Set these in Raycast → Extensions → **Ableton Session Manager**:

| Preference                                         | Required | Description                                                                                                                   |
| -------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Projects Folder**                                | ✅       | Folder containing your Ableton Live projects.                                                                                 |
| **Bounces Folder**                                 | —        | Subfolder name where bounces live (e.g. `Bounces`). Empty = project root.                                                     |
| **Notes Folder**                                   | —        | Store project notes as `.md` here (e.g. an Obsidian vault). Empty = inside the extension.                                     |
| **Language**                                       | —        | `English` or `简体中文`.                                                                                                      |
| **Energy Weight: Density / Brightness / Activity** | —        | Relative weights (Off / Low / Normal / High) for the Collections energy scale. Only the differences between the three matter. |

## Commands

| Command               | Description                                                     |
| --------------------- | --------------------------------------------------------------- |
| **Search Projects**   | Search, open, tag, play, and manage your Ableton Live projects. |
| **Manage Categories** | Create and manage genres and collections.                       |

## How it works

- **`.als` parsing** — sets are gzipped XML; BPM / key / time-signature are read with `fast-xml-parser` and `saxes`.
- **Audio playback** — a small bundled Swift AVFoundation binary plays bounces; it runs as a single shared process so playback persists across views.
- **Storage** — taxonomies, pins, per-project metadata, and view preferences are kept in Raycast LocalStorage; notes are Markdown (optionally in your own folder).

## Keyboard shortcuts

Most actions are discoverable via the Action Panel (`⌘K`). A few highlights:

| Action             | Shortcut |
| ------------------ | -------- |
| Play latest bounce | `⌘↵`     |
| Browse Bounces     | `⌥↵`     |
| Browse Collections | `⌃↵`     |
| New Live Set       | `⌘N`     |
| Open in Finder     | `⌘⌥O`    |

## Roadmap

- Filter projects by Stage / Genre (single-dimension)
- Copy latest bounce / selected bounce (as a file)
- Duplicate Set · Move to Trash (projects, sets, bounces)
- Playback position / duration readout
- Filter / search by BPM & key
- Missing-media (sample) check
- New project from a template `.als`

## Contributing

Commit messages follow **Conventional Commits** with Chinese descriptions and English technical terms — e.g. `feat(bounces): 新增 Show in Finder 与 Open in Default App`.

## License

MIT © iyek
