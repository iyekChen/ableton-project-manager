import AVFoundation
import Darwin
import Foundation

// 与 src/audio-player.ts 约定的进程间通信协议。
// 这是跨语言契约：修改任一端的字符串时，另一端必须同步更新。
let readyMessage = "READY"  // 经 stdout 输出 = 已开始播放
let stopCommand = "STOP"    // 经 stdin 收到 = 请求淡出停止

// analyze 模式：与 src/projects/audio-analysis.ts 约定。
// 调用 `AudioPlayer analyze <path>`，向 stdout 输出一行 JSON：
//   {"duration": 秒(Double), "rms": 0..1(Double)}
// 修改字段名或格式时，audio-analysis.ts 必须同步更新。
func runAnalyze(_ path: String) -> Never {
  let url = URL(fileURLWithPath: path)

  do {
    let file = try AVAudioFile(forReading: url)
    let format = file.processingFormat
    let sampleRate = format.sampleRate
    let duration = sampleRate > 0 ? Double(file.length) / sampleRate : 0

    var sumOfSquares = 0.0
    var sampleCount = 0
    var peak = 0.0

    let chunkFrames: AVAudioFrameCount = 65536

    while true {
      guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: chunkFrames) else {
        break
      }

      // 某些压缩格式（如 mp3）读到结尾会抛 EOF 错误而不是返回 0 帧，
      // 这里把读取错误当作“到结尾”处理，用已读到的样本收尾。
      do {
        try file.read(into: buffer)
      } catch {
        break
      }

      let frames = Int(buffer.frameLength)
      if frames == 0 {
        break
      }

      if let channels = buffer.floatChannelData {
        for channel in 0..<Int(format.channelCount) {
          let samples = channels[channel]
          for i in 0..<frames {
            let sample = Double(samples[i])
            sumOfSquares += sample * sample
            sampleCount += 1
            let magnitude = abs(sample)
            if magnitude > peak { peak = magnitude }
          }
        }
      }
    }

    let rms = sampleCount > 0 ? (sumOfSquares / Double(sampleCount)).squareRoot() : 0
      let clampedRms = max(0, min(1, rms))
      let clampedPeak = max(0, min(1, peak))
    print("{\"duration\": \(duration), \"rms\": \(clampedRms), \"peak\": \(clampedPeak)}")
    fflush(stdout)
    exit(EXIT_SUCCESS)
  } catch {
    fputs("Failed to analyze audio: \(error.localizedDescription)\n", stderr)
    exit(EXIT_FAILURE)
  }
}

let arguments = CommandLine.arguments

// analyze 模式先于播放判断；命中后直接退出，不进入播放逻辑。
if arguments.count >= 2, arguments[1] == "analyze" {
  guard arguments.count >= 3 else {
    fputs("Usage: AudioPlayer analyze <audio-file-path>\n", stderr)
    exit(EXIT_FAILURE)
  }

  runAnalyze(arguments[2])
}

final class AudioPlayerDelegate: NSObject, AVAudioPlayerDelegate {
  func audioPlayerDidFinishPlaying(
    _ player: AVAudioPlayer,
    successfully flag: Bool
  ) {
    exit(EXIT_SUCCESS)
  }

  func audioPlayerDecodeErrorDidOccur(
    _ player: AVAudioPlayer,
    error: Error?
  ) {
    if let error {
      fputs("Audio decode error: \(error.localizedDescription)\n", stderr)
    }
    exit(EXIT_FAILURE)
  }
}

guard arguments.count >= 2 else {
  fputs("Usage: AudioPlayer <audio-file-path>\n", stderr)
  exit(EXIT_FAILURE)
}

let audioPath = arguments[1]
let audioURL = URL(fileURLWithPath: audioPath)

fputs("PLAYER_START pid=\(getpid()) path=\(audioPath)\n", stderr)

do {
  let player = try AVAudioPlayer(contentsOf: audioURL)
  let delegate = AudioPlayerDelegate()

  player.delegate = delegate
  player.prepareToPlay()

  guard player.play() else {
    fputs("Failed to start audio playback.\n", stderr)
    exit(EXIT_FAILURE)
  }

  print(readyMessage)
  fflush(stdout)

  var isStopping = false

  func stopPlayback() {
    guard !isStopping else { return }
    isStopping = true

    player.setVolume(0, fadeDuration: 0.2)

    DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
      player.stop()
      exit(EXIT_SUCCESS)
    }
  }

  DispatchQueue.global(qos: .userInitiated).async {
    while let line = readLine() {
      if line.trimmingCharacters(in: .whitespacesAndNewlines) == stopCommand {
        DispatchQueue.main.async {
          stopPlayback()
        }
        return
      }
    }

    // 父进程关闭标准输入时，也执行淡出停止。
    DispatchQueue.main.async {
      stopPlayback()
    }
  }

  RunLoop.main.run()
} catch {
  fputs("Failed to load audio: \(error.localizedDescription)\n", stderr)
  exit(EXIT_FAILURE)
}
