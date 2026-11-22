/** 同一时刻只跑一轮刷新：执行中再被触发（目录监听、返回刷新、保存回调）只记一笔，结束后补跑一次。
 *  避免两次 Finder 同步交错——后一次可能拿已被前一次清掉的空数据去覆盖删除记录。
 *
 *  runOnce 拿到的是「后面还有一轮要跑」的判断：有的话就提前停下这一轮剩下的读取，等补跑那一轮再读。 */
export function createReloadQueue(): {
  reload: (runOnce: (isPending: () => boolean) => Promise<string[]>) => Promise<string[]>;
  isPending: () => boolean;
} {
  let inFlight: Promise<string[]> | null = null;
  let pending = false;
  const isPending = () => pending;

  const reload = (runOnce: (isPending: () => boolean) => Promise<string[]>): Promise<string[]> => {
    if (inFlight) {
      pending = true;
      return inFlight;
    }
    const run = async (): Promise<string[]> => {
      let orphans = await runOnce(isPending);
      while (pending) {
        pending = false;
        orphans = await runOnce(isPending);
      }
      return orphans;
    };
    const promise = run().finally(() => {
      inFlight = null;
    });
    inFlight = promise;
    return promise;
  };

  return { reload, isPending };
}
