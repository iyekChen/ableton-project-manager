import { useCallback, useEffect, useRef, useState } from "react";
import { startAudioPlayer } from "../audio-player";
import type { AudioPlayerController, PlaybackStatus } from "../audio-player";

interface UseAudioPlayerOptions {
  playerPath: string;
}

interface PlaybackCallbacks {
  onPlaying?: () => void;
  onError?: (message: string) => void;
}

interface ActivePlayer {
  sessionId: number;
  controller: AudioPlayerController;
}

export function useAudioPlayer({ playerPath }: UseAudioPlayerOptions) {
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>("Stopped");
  // 当前正在播放的身份（由调用方传入，通常是项目 id）；未播放时为 null。
  const [playingId, setPlayingId] = useState<string | null>(null);

  const playbackStatusRef = useRef<PlaybackStatus>("Stopped");
  const activePlayerRef = useRef<ActivePlayer | null>(null);
  const sessionIdRef = useRef(0);

  const updatePlaybackStatus = useCallback((status: PlaybackStatus) => {
    playbackStatusRef.current = status;
    setPlaybackStatus(status);
  }, []);

  const play = useCallback(
    (id: string, audioPath: string, callbacks?: PlaybackCallbacks) => {
      // 先切换会话编号，使旧播放器的回调失效。
      const sessionId = ++sessionIdRef.current;

      const previousPlayer = activePlayerRef.current;
      activePlayerRef.current = null;

      // 清理旧播放器，避免多个播放器同时运行。
      previousPlayer?.controller.cleanup();

      updatePlaybackStatus("Starting");
      setPlayingId(id);

      const controller = startAudioPlayer({
        audioPath,
        playerPath,

        onStatusChange: (status) => {
          // 只允许当前会话更新播放状态。
          if (sessionIdRef.current !== sessionId) {
            return;
          }

          updatePlaybackStatus(status);

          if (status === "Playing") {
            callbacks?.onPlaying?.();
          }

          if (status === "Stopped" || status === "Failed") {
            setPlayingId(null);

            if (activePlayerRef.current?.sessionId === sessionId) {
              activePlayerRef.current = null;
            }
          }
        },

        onError: (message) => {
          // 忽略已经被新会话取代的旧播放器错误。
          if (sessionIdRef.current !== sessionId) {
            return;
          }

          callbacks?.onError?.(message);
        },
      });

      activePlayerRef.current = {
        sessionId,
        controller,
      };
    },
    [playerPath, updatePlaybackStatus],
  );

  const stop = useCallback(() => {
    const activePlayer = activePlayerRef.current;

    if (!activePlayer) {
      if (playbackStatusRef.current !== "Stopped") {
        updatePlaybackStatus("Stopped");
      }

      setPlayingId(null);
      return;
    }

    activePlayer.controller.stop();
  }, [updatePlaybackStatus]);

  const pause = useCallback(() => {
    activePlayerRef.current?.controller.pause();
  }, []);

  const resume = useCallback(() => {
    activePlayerRef.current?.controller.resume();
  }, []);

  const seek = useCallback((deltaSeconds: number) => {
    activePlayerRef.current?.controller.seek(deltaSeconds);
  }, []);

  const restart = useCallback(() => {
    activePlayerRef.current?.controller.restart();
  }, []);

  useEffect(() => {
    return () => {
      // 先让当前会话失效，再清理进程。
      sessionIdRef.current += 1;

      const activePlayer = activePlayerRef.current;
      activePlayerRef.current = null;

      activePlayer?.controller.cleanup();
    };
  }, []);

  return {
    playbackStatus,
    playingId,
    play,
    stop,
    pause,
    resume,
    seek,
    restart,
  };
}
