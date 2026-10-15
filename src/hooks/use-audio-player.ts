import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  startAudioPlayer,
  stopActivePlayer,
  getActivePlayer,
  commandPause,
  commandResume,
  commandSeek,
  commandRestart,
} from "../audio-player";
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
let positionSeconds = 0;
let durationSeconds = 0;
let activeController: AudioPlayerController | null = null;
let activeSessionId = 0;

// useSyncExternalStore 要求 getSnapshot 在未变化时返回稳定引用，这里缓存快照。
let snapshot: {
  playbackStatus: PlaybackStatus;
  playingId: string | null;
  positionSeconds: number;
  durationSeconds: number;
} = {
  playbackStatus,
  playingId,
  positionSeconds,
  durationSeconds,
};

const listeners = new Set<() => void>();

function emit() {
  snapshot = { playbackStatus, playingId, positionSeconds, durationSeconds };
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

function setProgress(position: number, duration: number) {
  if (positionSeconds !== position || durationSeconds !== duration) {
    positionSeconds = position;
    durationSeconds = duration;
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

  // 本进程没有正在运行的播放器时，可能存在上一个命令进程遗留的后台播放，
  // 先按 PID 停掉，避免两段音频叠放。
  if (!previousController) {
    stopActivePlayer();
  }

  setPlaybackStatus("Starting");
  setPlayingId(id);
  setProgress(0, 0);

  const controller = startAudioPlayer({
    audioPath,
    id,
    playerPath,

    onProgress: (position, duration) => {
      // 只允许当前会话更新播放进度。
      if (activeSessionId !== sessionId) {
        return;
      }

      setProgress(position, duration);
    },

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
        setProgress(0, 0);

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
    stopActivePlayer();
    if (playbackStatus !== "Stopped") {
      setPlaybackStatus("Stopped");
    }
    setPlayingId(null);
    return;
  }

  activeController.stop();
}

// 本进程没在放，但后台(上一个命令进程遗留)仍在播时，恢复状态让 Toast 重新亮起。
// 暂停 / 快退快进 / Restart / Stop 经命令文件跨进程生效；仅实时进度暂缺(恒为 0，B2 再补)。
function restoreFromBackground() {
  if (activeController) {
    return;
  }
  const info = getActivePlayer();
  if (!info) {
    return;
  }
  if (playingId === info.id && playbackStatus === "Playing") {
    return;
  }
  playingId = info.id;
  playbackStatus = "Playing";
  positionSeconds = 0;
  durationSeconds = 0;
  emit();
}

function pause() {
  // 命令写入文件，后台播放进程轮询执行：切回命令后也能暂停。
  commandPause();
  if (playbackStatus === "Playing") {
    setPlaybackStatus("Paused");
  }
}

function resume() {
  commandResume();
  if (playbackStatus === "Paused") {
    setPlaybackStatus("Playing");
  }
}

function seek(deltaSeconds: number) {
  commandSeek(deltaSeconds);
}

function restart() {
  commandRestart();
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

  // 挂载时若后台仍有播放，恢复 Toast(见 restoreFromBackground 的降级说明)。
  useEffect(() => {
    restoreFromBackground();
  }, []);

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
    positionSeconds: current.positionSeconds,
    durationSeconds: current.durationSeconds,
    play: playTrack,
    stop: stopTrack,
    pause: pauseTrack,
    resume: resumeTrack,
    seek: seekTrack,
    restart: restartTrack,
  };
}
