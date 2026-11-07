import type { DawSet } from "@/daws";

// 项目的最新 Set：DAW 标了当前版本（如 Logic 的 Active Alternative）就用它，
// 否则取修改时间最新的，和 Latest Bounce 同一标准。没有 Set 时返回 null。
export function findLatestSet(sets: DawSet[]): DawSet | null {
  const active = sets.find((set) => set.active);
  if (active) return active;
  let latest: DawSet | null = null;
  for (const set of sets) {
    if (!latest || set.modifiedAt > latest.modifiedAt) latest = set;
  }
  return latest;
}
