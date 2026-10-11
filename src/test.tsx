import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { spawn, type ChildProcess } from "child_process";
import { useEffect, useRef, useState } from "react";

let nextInstanceId = 1;

const AUDIO_PATH = "/Users/iyek/Desktop/Test Audio.mp3";
const PLAYER_PATH = "/tmp/asm-audio-player";

type PlaybackStatus =
  | "Starting"
  | "Playing"
  | "Stopping"
  | "Stopped"
  | "Failed";

export default function TestCommand() {
  const [status, setStatus] = useState<PlaybackStatus>("Starting");
  const [errorMessage, setErrorMessage] = useState("");
  const childRef = useRef<ChildProcess | null>(null);
  const instanceIdRef = useRef<number | null>(null);

  if (instanceIdRef.current === null) {
    instanceIdRef.current = nextInstanceId++;
  }

  const instanceId = instanceIdRef.current;

  useEffect(() => {
    const logPrefix = `[ASM Audio Test][Instance ${instanceId}]`;

    console.log(`${logPrefix} MOUNT ${new Date().toISOString()}`);

    let active = true;
    let child: ChildProcess | null = null;
    let stderrBuffer = "";
    let stdoutBuffer = "";
    let startTimer: ReturnType<typeof setTimeout> | null = null;

    function startPlayer() {
      if (!active) {
        return;
      }

      try {
        child = spawn(PLAYER_PATH, [AUDIO_PATH], {
          stdio: ["pipe", "pipe", "pipe"],
        });

        console.log(
          `${logPrefix} SPAWN`,
          JSON.stringify({
            time: new Date().toISOString(),
            pid: child.pid,
          }),
        );

        childRef.current = child;

        child.stdout?.on("data", (data: Buffer) => {
          stdoutBuffer += data.toString();

          const lines = stdoutBuffer.split("\n");
          stdoutBuffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.trim() === "READY" && active) {
              setStatus("Playing");
            }
          }
        });

        child.stderr?.on("data", (data: Buffer) => {
          const message = data.toString();
          stderrBuffer += message;

          console.log(
            `${logPrefix}[PID ${child?.pid}] SWIFT`,
            message.trimEnd(),
          );
        });

        child.stdin?.on("error", () => {
          // 进程退出时，标准输入可能已经关闭。
        });

        child.on("error", (error) => {
          if (childRef.current === child) {
            childRef.current = null;
          }

          if (active) {
            setStatus("Failed");
            setErrorMessage(error.message);
          }
        });

        child.on("close", (code, signal) => {
          console.log(
            `${logPrefix}[PID ${child?.pid}] CLOSE`,
            JSON.stringify({
              time: new Date().toISOString(),
              code,
              signal,
            }),
          );

          if (childRef.current === child) {
            childRef.current = null;
          }

          if (!active) {
            return;
          }

          if (code !== 0) {
            setStatus("Failed");
            setErrorMessage(
              stderrBuffer.trim() ||
                `Player exited with code ${code}, signal ${signal ?? "none"}.`,
            );
            return;
          }

          setStatus("Stopped");
        });
      } catch (error) {
        setStatus("Failed");
        setErrorMessage(
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    // 延迟启动，允许即时执行的清理函数取消启动任务。
    startTimer = setTimeout(startPlayer, 0);

    return () => {
      console.log(
        `${logPrefix} CLEANUP ${new Date().toISOString()}`,
      );

      active = false;

      if (startTimer !== null) {
        clearTimeout(startTimer);
        startTimer = null;
      }

      if (childRef.current === child) {
        childRef.current = null;
      }

      if (
        child &&
        child.exitCode === null &&
        child.signalCode === null
      ) {
        child.stdin?.write("STOP\n");

        const forceKillTimer = setTimeout(() => {
          if (
            child &&
            child.exitCode === null &&
            child.signalCode === null
          ) {
            child.kill("SIGKILL");
          }
        }, 1000);

        forceKillTimer.unref();
        child.once("close", () => clearTimeout(forceKillTimer));
      }
    };
  }, [instanceId]);

  function stopPlayback() {
    const child = childRef.current;

    if (
      !child ||
      child.exitCode !== null ||
      child.signalCode !== null
    ) {
      setStatus("Stopped");
      return;
    }

    setStatus("Stopping");
    child.stdin?.write("STOP\n");
  }

  const markdown = [
    "# Audio Player Test",
    "",
    `**Status:** ${status}`,
    "",
    errorMessage ? `**Error:** ${errorMessage}` : "",
    "",
    `**Audio:** \`${AUDIO_PATH}\``,
    "",
    `**Player:** \`${PLAYER_PATH}\``,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {(status === "Starting" || status === "Playing") && (
            <Action
              title="Stop Playback"
              icon={Icon.Stop}
              onAction={stopPlayback}
            />
          )}
        </ActionPanel>
      }
    />
  );
}