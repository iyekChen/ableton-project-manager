# Ableton Project Manager Changelog

## [Shortcuts, Navigation, and Polish] - {PR_MERGE_DATE}

More keyboard shortcuts, clearer labels when you move between views, a list that no longer flickers when it opens, and error pages when something can't be read.

### ✨ New

- **Manage External Bounce** (⌘B): Add or remove external bounce sources from Browse Bounces without going back to Search Projects
- **Show Overview / Show Detail** (⌘⇧T) and **Show Notes / Show Lyrics** (⌘⌥⇧T) in Tracklist: Toggle the detail panel and switch between notes and lyrics from the keyboard, the same as in Search Projects. Both now sit in a View section
- **Delete All** (⌃⇧X) in Manage Tags: Empty the list you're viewing and remove those options from every project and track that uses them
- **Restore Previous Settings**: When a new project replaces a deleted one with the same name, bring back the old project's tags, collections, track numbers, roles, notes, and lyrics

### 💎 Improvements

- **Browse Bounces**: The back button now says Back to Search Projects or Back to Search Bounces, depending on where you opened it from
- **Browse Bounces**: The search bar placeholder now says Search Project Bounces, so it's clear what it searches
- **Group By**: Browse Bounces and Search Bounces no longer show the default grouping for a moment before switching to the one you picked
- **Templates**: Show in Finder now also works with ⌘⌥O
- **Forms**: Empty text fields now show a hint, such as the current name, or what to write in notes and lyrics
- **Action Names**: Actions that do the same thing now use the same name everywhere, such as Rename Bounce, New Collection, Edit Stage, and Open Notes
- **Templates**: Create Live Set is now New Live Set from Template, and the rename form's button is Save
- **Icons**: Actions that do different things no longer share an icon, so it's easier to tell them apart in the Action Panel
- **Commands**: Each command now shows Ableton Live under its name in Raycast

### 🐞 Fixes

- **README**: Fixed links that didn't work on the Store page, and made section titles match the action names
- **Loading**: Fixed a failed load showing up as an empty list. Search Projects, Sets, and Manage Tags now show what went wrong, with Retry and Open Extension Preferences
- **Duplicate Project**: Fixed the form closing when the copy failed. It now stays open with your name, and shows the error
- **Tracklist**: Fixed the list changing when saving a track number or role failed. It now stays as it was and shows the error

## [Search Bounces, Shared Bounces Folder, and Data Export & Import] - 2026-11-21

Two new commands: Search Bounces finds any bounce across all your projects, and Export Data / Import Data back up your tags and collections. You can now also keep bounces from every project in one Shared Bounces Folder, and start with `#` in Search Projects to combine filters, like `# rnb 2025 am 120-128`.

### ✨ New

- **Search Bounces**: A new command that lists the bounces of every project in one place. Search by file or project name, and group by created date or source
- **Export Data / Import Data**: Two new commands that save your tags, collections, track numbers, roles, and bounce sources to a `.json` file and restore them later. Before importing, you see what will change, and your current data is backed up
- **Shared Bounces Folder**: Keep bounces from every project in one folder. Files are matched to projects by name, and files that match no project are listed in Unmatched Bounces (⌘⇧B), where you can assign them to a project
- **Combined Search**: Start with `#` to require every word to match. Search by name, stage, genre, collection, created date, key (`am`, `c#m`), BPM or BPM range (`120`, `90-100`, including half and double time), and time signature (`6/8`)
- **New Live Set from Template** (⌘⌥⌃N): Pick a template from your Templates Folder and open it as a new Set
- **Open Latest Set** (⌘O): Opens the project's most recently modified Set
- **Edit Lyrics** (⌘⌥L): Edit lyrics in Raycast, just like Edit Note
- **Aliases**: Give stages, genres, and roles other names to search by, such as `dnb` for Drum & Bass
- **Year Filter**: Filter Search Projects by created year
- **Key and BPM in Detail**: The Detail view shows the latest Set's key and BPM

### 💎 Improvements

- **Search**: The search bar now also matches stage, genre, collection, created year and month, and the latest Set's key. Case, spaces, punctuation, accents, and full-width characters are ignored, so `hiphop` finds Hip-Hop and `rnb` finds R&B
- **Search Projects**: Opens faster, showing your last list right away while it checks for changes in the background
- **Queue Collection in Player**: Now queues only the Tracklist and skips Unsorted tracks
- **External Bounces**: If a linked file is renamed in place or moved into your Shared Bounces Folder, it's re-linked automatically when there's a single match
- **Playback**: The playing toast now shows just the song name and progress

### 🐞 Fixes

- **Edit Info**: Fixed existing roles showing as None

## [Initial Version] - 2026-11-07

- Search, sort, group, and pin your Ableton Live projects, with Detail and Overview views and Stage / Genre filters
- View the Live Sets in each project with key, BPM, and time signature read from the `.als` file; rename, duplicate, or move them to Trash
- Play the latest bounce from Raycast, with pause, seek, and restart; playback keeps going after the Raycast window closes
- Browse bounces with Quick Look, including bounce folders and files stored outside the project
- Edit Info: rename a project, set its stage, genres, and collections; duplicate a project
- Manage Tags: create, reorder, and recolor stages, genres, and track roles, and assign a stage or genre to many projects at once
- Markdown notes and lyrics in each project folder or a folder of your choice (e.g. an Obsidian vault), with templates supporting `{{title}}`, `{{date}}`, and `{{time}}` and custom date formats; changes from other editors show up right away
- Collections: arrange a tracklist, assign track roles, see a relative energy score from each track's latest bounce, and queue the whole collection in your player as an `.m3u` playlist
- Picks up projects renamed or deleted in Finder, guards against mass deletion when a drive is unplugged, and restores tags and track data when a project is put back from the Trash within 30 days
