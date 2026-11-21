import { useState } from "react";
import { isSortOption, type SortOption } from "@/core/ui/shared/sorting";
import { readCachedChoice, viewPrefs } from "@/core/ui/shared/view-prefs";

// 读取/持久化某个界面的排序选择（同步读，首帧即为记住的值）。
// allowed = 这个界面开放哪些选项；若存储里的值不在 allowed 内（或非法），回落到 fallback。
export function useSortOption(storageKey: string, allowed: SortOption[], fallback: SortOption) {
  const [sortBy, setSortByState] = useState<SortOption>(() =>
    readCachedChoice(
      storageKey,
      (value): value is SortOption => isSortOption(value) && allowed.includes(value),
      fallback,
    ),
  );

  const setSortBy = (next: SortOption) => {
    setSortByState(next);
    viewPrefs.set(storageKey, next);
  };

  return [sortBy, setSortBy] as const;
}
