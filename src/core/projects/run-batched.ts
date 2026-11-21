/** 限并发跑一批任务：同时最多 concurrency 个，每完成一个就取下一个。
 *  isCancelled 在取下一个之前和每个任务完成后各查一次，取消后不再开始新的、也不再回调。 */
export async function runBatched<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  options: { concurrency: number; isCancelled: () => boolean },
): Promise<void> {
  const { concurrency, isCancelled } = options;
  let nextIndex = 0;

  async function run() {
    while (!isCancelled()) {
      const index = nextIndex++;
      if (index >= items.length) return;
      await worker(items[index]);
      if (isCancelled()) return;
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
}
