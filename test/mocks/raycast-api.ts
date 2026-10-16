// 仅供测试：被测模块顶层 import 了 @raycast/api，这里给最小桩，避免加载真实 Raycast 运行时。
// 偏好返回空对象；LocalStorage 用内存 Map 模拟（测试间用 LocalStorage.clear() 重置）。
export function getPreferenceValues<T>(): T {
  return {} as T;
}

const store = new Map<string, string>();

export const LocalStorage = {
  async getItem<T>(key: string): Promise<T | undefined> {
    return store.get(key) as T | undefined;
  },
  async setItem(key: string, value: string): Promise<void> {
    store.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    store.delete(key);
  },
  async allItems(): Promise<Record<string, string>> {
    return Object.fromEntries(store);
  },
  async clear(): Promise<void> {
    store.clear();
  },
};