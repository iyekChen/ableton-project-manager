import Accelerate
import AVFoundation
import Darwin
import Foundation

// 与 src/audio-player.ts 约定的进程间通信协议。
// 这是跨语言契约：修改任一端的字符串时，另一端必须同步更新。
let readyMessage = "READY"  // 经 stdout 输出 = 已开始播放
let stopCommand = "STOP"    // 经 stdin 收到 = 请求淡出停止

// analyze 模式：与 src/projects/audio-analysis.ts 约定。
// 调用 `AudioPlayer analyze <path>`，向 stdout 输出一行 JSON：
//   {"duration": 秒(Double), "rms": 0..1(Double), "peak": 0..1(Double), "centroid": 0..1 或 -1(Double)}
// 修改字段名或格式时，audio-analysis.ts 必须同步更新。
func runAnalyze(_ path: String) -> Never {
    let url = URL(fileURLWithPath: path)
    do {
        let file = try AVAudioFile(forReading: url)
        let format = file.processingFormat
        let sampleRate = format.sampleRate
        let duration = sampleRate > 0 ? Double(file.length) / sampleRate : 0
        let channelCount = Int(format.channelCount)

        var sumOfSquares = 0.0
        var sampleCount = 0
        var peak = 0.0
        var mono: [Float] = [] // 下混单声道，供频谱分析
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
                mono.reserveCapacity(mono.count + frames)
                for i in 0..<frames {
                    var frameSum = 0.0
                    for channel in 0..<channelCount {
                        let sample = Double(channels[channel][i])
                        sumOfSquares += sample * sample
                        sampleCount += 1
                        let magnitude = abs(sample)
                        if magnitude > peak { peak = magnitude }
                        frameSum += sample
                    }
                    mono.append(Float(frameSum / Double(max(1, channelCount))))
                }
            }
        }

        let rms = sampleCount > 0 ? (sumOfSquares / Double(sampleCount)).squareRoot() : 0
        let clampedRms = max(0, min(1, rms))
        let clampedPeak = max(0, min(1, peak))
        let centroid = spectralCentroid(mono: mono, sampleRate: sampleRate)
        print("{\"duration\": \(duration), \"rms\": \(clampedRms), \"peak\": \(clampedPeak), \"centroid\": \(centroid)}")
        fflush(stdout)
        exit(EXIT_SUCCESS)
    } catch {
        fputs("Failed to analyze audio: \(error.localizedDescription)\n", stderr)
        exit(EXIT_FAILURE)
    }
}

// 加窗 STFT 求“功率加权频谱质心”，再除以 Nyquist 归一到 0..1（亮度）。
// 实数 FFT 的 2 倍缩放在质心这个比值里会上下约掉，故无需额外缩放。
// 样本不足一帧 / 全静音 / FFT 初始化失败时返回 -1（表示 n/a）。
func spectralCentroid(mono: [Float], sampleRate: Double) -> Double {
    let log2n: vDSP_Length = 11
    let fftSize = 1 << Int(log2n) // 2048
    let halfSize = fftSize / 2
    guard mono.count >= fftSize, sampleRate > 0,
          let setup = vDSP_create_fftsetup(log2n, FFTRadix(kFFTRadix2)) else {
        return -1
    }
    defer { vDSP_destroy_fftsetup(setup) }

    var window = [Float](repeating: 0, count: fftSize)
    vDSP_hann_window(&window, vDSP_Length(fftSize), Int32(vDSP_HANN_DENORM))

    var windowed = [Float](repeating: 0, count: fftSize)
    var realp = [Float](repeating: 0, count: halfSize)
    var imagp = [Float](repeating: 0, count: halfSize)
    var magsSquared = [Float](repeating: 0, count: halfSize)

    var weightedFreqSum = 0.0
    var powerSum = 0.0
    let hop = fftSize // 不重叠

    var start = 0
    while start + fftSize <= mono.count {
        // 加 Hann 窗
        mono.withUnsafeBufferPointer { mptr in
            vDSP_vmul(mptr.baseAddress! + start, 1, window, 1, &windowed, 1, vDSP_Length(fftSize))
        }
        // 实数 FFT：ctoz 打包成 split complex（realp[0]=DC, imagp[0]=Nyquist），再 zrip
        realp.withUnsafeMutableBufferPointer { rp in
            imagp.withUnsafeMutableBufferPointer { ip in
                var split = DSPSplitComplex(realp: rp.baseAddress!, imagp: ip.baseAddress!)
                windowed.withUnsafeBufferPointer { wp in
                    wp.baseAddress!.withMemoryRebound(to: DSPComplex.self, capacity: halfSize) { cp in
                        vDSP_ctoz(cp, 2, &split, 1, vDSP_Length(halfSize))
                    }
                }
                vDSP_fft_zrip(setup, &split, 1, log2n, FFTDirection(FFT_FORWARD))
                // 幅度平方；bin0 把 DC 与 Nyquist 混在实/虚部里，循环时跳过。
                vDSP_zvmags(&split, 1, &magsSquared, 1, vDSP_Length(halfSize))
            }
        }
        for k in 1..<halfSize {
            let power = Double(magsSquared[k])
            let freq = Double(k) * sampleRate / Double(fftSize)
            weightedFreqSum += freq * power
            powerSum += power
        }
        start += hop
    }

    guard powerSum > 0 else { return -1 }
    let nyquist = sampleRate / 2
    return max(0, min(1, (weightedFreqSum / powerSum) / nyquist))
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
