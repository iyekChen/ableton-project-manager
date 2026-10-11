import AVFoundation
import Darwin
import Foundation

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

guard CommandLine.arguments.count >= 2 else {
  fputs("Usage: AudioPlayer <audio-file-path>\n", stderr)
  exit(EXIT_FAILURE)
}

let audioPath = CommandLine.arguments[1]
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

  print("READY")
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
      if line.trimmingCharacters(in: .whitespacesAndNewlines) == "STOP" {
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