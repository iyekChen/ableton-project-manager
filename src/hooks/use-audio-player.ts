import { useCallback, useSyncExternalStore } from "react";
import { startAudioPlayer } from "../audio-player";
import type { AudioPlayerController, PlaybackStatus } from "../audio-player";

interface UseAudioPlayerOptions {
  playerPath: string;
}

interface PlaybackCallbacks {
  onPlaying?: () => void;
  onError?: (message: string) => void;
}

// ---- 全局单例：整个扩展共享同一个播放器 ----
// 所有视图（Search Projects / Collection 等）通过本模块共享播放状态与进程，
// 保证同一时间只有一个 bounce 在播：切视图不打断，也不会重叠出声。

let playbackStatus: PlaybackStatus = "Stopped";
let playingId: string | null = null;
let activeController: AudioPlayerController | null = null;
let activeSessionId = 0;

// useSyncExternalStore 要求 getSnapshot 在未变化时返回稳定引用，这里缓存快照。
let snapshot: { playbackStatus: PlaybackStatus; playingId: string | null } = {
  playbackStatus,
  playingId,
};

const listeners = new Set<() => void>();

function emit() {
  snapshot = { playbackStatus, playingId };
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

function setPlaybackStatus(status: PlaybackStatus) {
  if (playbackStatus !== status) {
    playbackStatus = status;
    emit();
  }
}

function setPlayingId(id: string | null) {
  if (playingId !== id) {
    playingId = id;
    emit();
  }
}

function play(id: string, audioPath: string, playerPath: string, callbacks?: PlaybackCallbacks) {
  // 先切换会话编号，使旧播放器的回调失效。
  const sessionId = ++activeSessionId;

  const previousController = activeController;
  activeController = null;

  // 清理旧播放器，避免多个播放器同时运行。
  previousController?.cleanup();

  setPlaybackStatus("Starting");
  setPlayingId(id);

  const controller = startAudioPlayer({
    audioPath,
    playerPath,

    onStatusChange: (status) => {
      // 只允许当前会话更新播放状态。
      if (activeSessionId !== sessionId) {
        return;
      }

      setPlaybackStatus(status);

      if (status === "Playing") {
        callbacks?.onPlaying?.();
      }

      if (status === "Stopped" || status === "Failed") {
        setPlayingId(null);

        if (activeController === controller) {
          activeController = null;
        }
      }
    },

    onError: (message) => {
      // 忽略已经被新会话取代的旧播放器错误。
      if (activeSessionId !== sessionId) {
        return;
      }

      callbacks?.onError?.(message);
    },
  });

  activeController = controller;
}

function stop() {
  if (!activeController) {
    if (playbackStatus !== "Stopped") {
      setPlaybackStatus("Stopped");
    }
    setPlayingId(null);
    return;
  }

  activeController.stop();
}

function pause() {
  activeController?.pause();
}

function resume() {
  activeController?.resume();
}

function seek(deltaSeconds: number) {
  activeController?.seek(deltaSeconds);
}

function restart() {
  activeController?.restart();
}

// 供根视图在命令关闭（根组件卸载）时调用：彻底停止并清理进程。
// 子视图（push / pop）不应调用它，否则会打断跨视图保留的播放。
export function cleanupAudioPlayer() {
  activeSessionId += 1;
  const controller = activeController;
  activeController = null;
  controller?.cleanup();
}

export function useAudioPlayer({ playerPath }: UseAudioPlayerOptions) {
  const current = useSyncExternalStore(subscribe, getSnapshot);

  const playTrack = useCallback(
    (id: string, audioPath: string, callbacks?: PlaybackCallbacks) => {
      play(id, audioPath, playerPath, callbacks);
    },
    [playerPath],
  );

  const stopTrack = useCallback(() => stop(), []);
  const pauseTrack = useCallback(() => pause(), []);
  const resumeTrack = useCallback(() => resume(), []);
  const seekTrack = useCallback((deltaSeconds: number) => seek(deltaSeconds), []);
  const restartTrack = useCallback(() => restart(), []);

  return {
    playbackStatus: current.playbackStatus,
    playingId: current.playingId,
    play: playTrack,
    stop: stopTrack,
    pause: pauseTrack,
    resume: resumeTrack,
    seek: seekTrack,
    restart: restartTrack,
  };
}
