# Contributing

English | [简体中文](CONTRIBUTING.zh-CN.md)

## Setup

Requires macOS, [Raycast](https://raycast.com), Node.js 22+, and npm.

```bash
git clone https://github.com/iyekChen/ableton-project-manager.git
cd ableton-project-manager
npm install
npm run dev        # Run the extension in Raycast development mode
```

On first launch, Search Projects asks for a Projects Folder. Use a test folder rather than your real library, since actions like rename and Move to Trash change files on disk.

In development mode, Search Projects has an extra **Reset Onboarding (Dev)** action for testing the first-launch prompts.

## Scripts

```bash
npm run lint          # ESLint + Prettier
npm run fix-lint      # Auto-fix lint and formatting issues
npm run build         # Build the production extension
```

Before opening a PR, run lint and build. CI runs the same steps on macOS with Node 22, installing with `npm ci`.

The unit tests live in a separate private repository, so this repository doesn't include them.

## Project layout

- `src/*.tsx` are the command entry points, one per command. Manage Tags is `manage-categories.tsx`.
- `src/core/` holds everything that isn't specific to Ableton Live: projects, bounces, collections, notes, search, and storage.
- `src/daws/ableton/` holds the Ableton-specific parts: reading `.als` files, the Sets view, and Live templates. They plug into the rest through the `DawAdapter` interface in `src/daws/types.ts`.
- Most UI text lives in `src/strings.ts`. Ableton-specific wording is in `src/daws/labels.ts` and `src/daws/ableton/strings.ts`, and command and preference titles are in `package.json`.
- `swift/audio-player/` is the audio player's Swift package, built by `ray build`.

## Audio player

The audio player is a Swift package in `swift/audio-player/`, built with [extensions-swift-tools](https://github.com/raycast/extensions-swift-tools). `ray build` compiles it, so there's no separate build step and no binary in the repository. Building it needs Xcode 16.3 or later.

[`swift/audio-player/Sources/AudioPlayer.swift`](https://github.com/iyekChen/ableton-project-manager/blob/main/swift/audio-player/Sources/AudioPlayer.swift) exports three functions to TypeScript: `startPlayer` starts a detached worker and returns its pid, `runPlayer` is the playback loop, and `analyzeAudio` measures the audio. The plugin generates `main.swift`, so the file must not have top-level statements or `@main`.

## How it works

- **Live Sets:** `.als` files are gzipped XML. Each Set is streamed through gunzip and parsed with [`saxes`](https://github.com/lddubeau/saxes) to read tempo, time signature, and scale.
- **Playback:** a Swift worker built on AVFoundation plays bounces as a detached process, so playback survives view changes and closing the Raycast window. The extension controls it through command and status files in its support folder. The player stops on its own when Raycast quits.
- **Analysis:** the same Swift package has an `analyzeAudio` function that streams the file in chunks and computes RMS, peak, spectral centroid, and spectral flux using a 2048-point FFT, without loading the whole file into memory.
