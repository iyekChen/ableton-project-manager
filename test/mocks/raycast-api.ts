// 仅供测试：被测模块顶层 import 了 @raycast/api，这里给最小桩，避免加载真实 Raycast 运行时。
// findLatestBounce / listBounces / isAudioFile 都不读偏好，所以返回空对象即可。
export function getPreferenceValues<T>(): T {
  return {} as T;
}
