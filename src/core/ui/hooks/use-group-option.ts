import { useState } from "react";
import { isGroupOption, type GroupOption } from "@/core/ui/shared/grouping";
import { readCachedChoice, viewPrefs } from "@/core/ui/shared/view-prefs";

// 读取/持久化某界面的分组选择（同步读，首帧即为记住的值）。
export function useGroupOption(storageKey: string, fallback: GroupOption) {
  const [groupBy, setGroupByState] = useState<GroupOption>(() => readCachedChoice(storageKey, isGroupOption, fallback));

  const setGroupBy = (next: GroupOption) => {
    setGroupByState(next);
    viewPrefs.set(storageKey, next);
  };

  return [groupBy, setGroupBy] as const;
}
