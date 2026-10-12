import { execFile } from "node:child_process";
import { ensureAudioPlayerBinary } from "../audio-player-path";

export type AudioAnalysis = {
  duration: number; // 秒
  rms: number; // 0..1，整体响度，作为能量近似
};

/**
 * 调用播放器二进制的 analyze 模式，返回音频的时长与 RMS。
 * 输出格式与 swift/AudioPlayer.swift 的 analyze 模式配对，修改字段要两边同步。
 */
export function analyzeAudio(audioPath: string): Promise<AudioAnalysis> {
  return new Promise((resolve, reject) => {
    const playerPath = ensureAudioPlayerBinary();

    execFile(playerPath, ["analyze", audioPath], { encoding: "utf8", timeout: 30_000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr.trim() || error.message));
        return;
      }

      try {
        const parsed = JSON.parse(stdout.trim()) as Partial<AudioAnalysis>;

        if (typeof parsed.duration !== "number" || typeof parsed.rms !== "number") {
          reject(new Error(`Unexpected analyze output: ${stdout.trim()}`));
          return;
        }

        resolve({ duration: parsed.duration, rms: parsed.rms });
      } catch (parseError) {
        reject(parseError instanceof Error ? parseError : new Error(String(parseError)));
      }
    });
  });
}
