import { spawn, type ChildProcess } from "child_process";

export type PlaybackStatus = "Starting" | "Playing" | "Paused" | "Stopping" | "Stopped" | "Failed";

export interface AudioPlayerOptions {
  audioPath: string;
  playerPath: string;
  onStatusChange: (status: PlaybackStatus) => void;
  onError: (message: string) => void;
  onProgress?: (positionSeconds: number, durationSeconds: number) => void;
}

export interface AudioPlayerController {
  stop: () => void;
  pause: () => void;
  resume: () => void;
  seek: (deltaSeconds: number) => void;
  restart: () => void;
  cleanup: () => void;
}

/**
 * 与 swift/AudioPlayer.swift 约定的进程间通信协议。
 * 这是跨语言契约：修改任一端的字符串时，另一端必须同步更新。
 */
const PLAYER_PROTOCOL = {
  /** 子进程通过 stdout 输出，表示音频已开始播放。 */
  ready: "READY",
  /** 通过 stdin 写给子进程，请求淡出并停止播放。 */
  stop: "STOP",
  /** 暂停 / 续播。 */
  pause: "PAUSE",
  resume: "RESUME",
  /** 跳回开头。 */
  restart: "SEEK0",
  /** 相对跳转前缀，其后跟秒数（可正负），如 "SEEK 5"。 */
  seekPrefix: "SEEK ",
  /** 子进程通过 stdout 输出播放进度，其后跟 "<当前秒> <总秒>"，如 "POS 12.3 210.5"。 */
  posPrefix: "POS ",
} as const;

let nextInstanceId = 1;

/**
 * 启动音频播放器，并管理其子进程生命周期。
 *
 * 调用者负责页面展示和状态保存。
 * 本模块负责进程启动、输出监听、停止和退出清理。
 */
export function startAudioPlayer(options: AudioPlayerOptions): AudioPlayerController {
  const { audioPath, playerPath, onStatusChange, onError, onProgress } = options;

  const instanceId = nextInstanceId++;
  const logPrefix = `[ASM Audio Player][Instance ${instanceId}]`;

  let active = true;
  let child: ChildProcess | null = null;
  let stderrBuffer = "";
  let stdoutBuffer = "";
  let startTimer: ReturnType<typeof setTimeout> | null = null;

  console.log(`${logPrefix} MOUNT ${new Date().toISOString()}`);

  function reportError(message: string) {
    if (!active) {
      return;
    }

    onStatusChange("Failed");
    onError(message);
  }

  function startPlayer() {
    startTimer = null;

    if (!active) {
      return;
    }

    try {
      child = spawn(playerPath, [audioPath], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      const player = child;

      console.log(
        `${logPrefix} SPAWN`,
        JSON.stringify({
          time: new Date().toISOString(),
          pid: player.pid,
        }),
      );

      player.stdout?.on("data", (data: Buffer) => {
        stdoutBuffer += data.toString();

        const lines = stdoutBuffer.split("\n");
        stdoutBuffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();

          if (trimmed === PLAYER_PROTOCOL.ready && active) {
            onStatusChange("Playing");
            continue;
          }

          if (trimmed.startsWith(PLAYER_PROTOCOL.posPrefix) && active) {
            const [posText, durText] = trimmed.slice(PLAYER_PROTOCOL.posPrefix.length).split(" ");
            const position = Number(posText);
            const duration = Number(durText);
            if (Number.isFinite(position) && Number.isFinite(duration)) {
              onProgress?.(position, duration);
            }
          }
        }
      });

      player.stderr?.on("data", (data: Buffer) => {
        const message = data.toString();
        stderrBuffer += message;

        console.log(`${logPrefix}[PID ${player.pid}] SWIFT`, message.trimEnd());
      });

      player.stdin?.on("error", () => {
        // 进程退出时，标准输入可能已经关闭。
      });

      player.on("error", (error) => {
        reportError(error.message);
      });

      player.on("close", (code, signal) => {
        console.log(
          `${logPrefix}[PID ${player.pid}] CLOSE`,
          JSON.stringify({
            time: new Date().toISOString(),
            code,
            signal,
          }),
        );

        if (child === player) {
          child = null;
        }

        if (!active) {
          return;
        }

        if (code !== 0) {
          reportError(stderrBuffer.trim() || `Player exited with code ${code}, signal ${signal ?? "none"}.`);
          return;
        }

        onStatusChange("Stopped");
      });
    } catch (error) {
      reportError(error instanceof Error ? error.message : String(error));
    }
  }

  function stop() {
    // 如果子进程尚未启动，取消延迟启动任务。
    if (startTimer !== null) {
      clearTimeout(startTimer);
      startTimer = null;
      active = false;

      onStatusChange("Stopped");
      return;
    }

    const player = child;

    if (!player || player.exitCode !== null || player.signalCode !== null) {
      onStatusChange("Stopped");
      return;
    }

    onStatusChange("Stopping");

    player.stdin?.write(`${PLAYER_PROTOCOL.stop}\n`);
  }

  // 给正在播放的子进程发一行命令；进程不在/已退出则忽略。
  function sendCommand(line: string) {
    const player = child;
    if (!player || player.exitCode !== null || player.signalCode !== null) {
      return;
    }
    player.stdin?.write(`${line}\n`);
  }

  function pause() {
    sendCommand(PLAYER_PROTOCOL.pause);
    if (active) {
      onStatusChange("Paused");
    }
  }

  function resume() {
    sendCommand(PLAYER_PROTOCOL.resume);
    if (active) {
      onStatusChange("Playing");
    }
  }

  function seek(deltaSeconds: number) {
    sendCommand(`${PLAYER_PROTOCOL.seekPrefix}${deltaSeconds}`);
  }

  function restart() {
    sendCommand(PLAYER_PROTOCOL.restart);
  }

  function cleanup() {
    console.log(`${logPrefix} CLEANUP ${new Date().toISOString()}`);

    active = false;

    if (startTimer !== null) {
      clearTimeout(startTimer);
      startTimer = null;
    }

    const player = child;
    child = null;

    if (player && player.exitCode === null && player.signalCode === null) {
      player.stdin?.write(`${PLAYER_PROTOCOL.stop}\n`);

      const forceKillTimer = setTimeout(() => {
        if (player.exitCode === null && player.signalCode === null) {
          player.kill("SIGKILL");
        }
      }, 1000);

      forceKillTimer.unref();
      player.once("close", () => clearTimeout(forceKillTimer));
    }
  }

  // 延迟启动，允许页面立即退出时取消启动任务。
  startTimer = setTimeout(startPlayer, 0);

  return {
    stop,
    pause,
    resume,
    seek,
    restart,
    cleanup,
  };
}
