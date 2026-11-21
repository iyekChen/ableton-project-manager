import { Action, Icon, type Keyboard } from "@raycast/api";
import type { PlaybackStatus } from "@/core/audio/audio-player";
import { strings } from "@/strings";

// 主播放操作：未播→播；本行在播→暂停；暂停→续播。各界面都放在第二个操作，拿 ⌘↵。
// shortcut 只在界面原本就写了快捷键时传：没写时由 Raycast 自动给第二个操作 ⌘↵。
export function PlayToggleAction({
  isThisPlaying,
  playbackStatus,
  shortcut,
  onPlay,
  onPause,
  onResume,
}: {
  isThisPlaying: boolean;
  playbackStatus: PlaybackStatus;
  shortcut?: Keyboard.Shortcut;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
}) {
  const toggleIsPause = isThisPlaying && (playbackStatus === "Playing" || playbackStatus === "Starting");
  const title = isThisPlaying
    ? playbackStatus === "Paused"
      ? strings.resumePlayback
      : playbackStatus === "Stopping"
        ? strings.stoppingPlayback
        : strings.pausePlayback
    : strings.playLatestBounce;

  return (
    <Action
      title={title}
      icon={isThisPlaying ? (toggleIsPause ? Icon.PauseFilled : Icon.PlayFilled) : Icon.Play}
      shortcut={shortcut}
      onAction={() => {
        if (isThisPlaying) {
          if (playbackStatus === "Stopping") {
            return;
          }
          if (playbackStatus === "Paused") {
            onResume();
          } else {
            onPause();
          }
          return;
        }
        onPlay();
      }}
    />
  );
}
