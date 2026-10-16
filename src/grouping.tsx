import { Action, ActionPanel, Icon, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { getSettings } from "./settings";
import { getTranslations } from "./i18n";

const t = getTranslations(getSettings().language);

export type GroupOption = "created" | "modified" | "none";
export type GroupDateOption = "created" | "modified";

export function isGroupOption(value: string): value is GroupOption {
  return value === "created" || value === "modified" || value === "none";
}

// 读取/持久化某界面的分组选择。
export function useGroupOption(storageKey: string, fallback: GroupOption) {
  const [groupBy, setGroupByState] = useState<GroupOption>(fallback);

  useEffect(() => {
    async function load() {
      const stored = await LocalStorage.getItem<string>(storageKey);
      if (stored && isGroupOption(stored)) setGroupByState(stored);
    }
    void load();
  }, [storageKey]);

  const setGroupBy = async (next: GroupOption) => {
    setGroupByState(next);
    await LocalStorage.setItem(storageKey, next);
  };

  return [groupBy, setGroupBy] as const;
}

// 按本地时间计算各日期段的下界，从最近到最早。先判本周再判本月，这样"上周但跨月"会归入本周。
function dateBands(): { key: string; title: string; from: number }[] {
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = startOfToday - ((now.getDay() + 6) % 7) * day; // 周一为一周起点
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
  return [
    { key: "today", title: t.bandToday, from: startOfToday },
    { key: "week", title: t.bandThisWeek, from: startOfWeek },
    { key: "month", title: t.bandThisMonth, from: startOfMonth },
    { key: "year", title: t.bandThisYear, from: startOfYear },
    { key: "earlier", title: t.bandEarlier, from: Number.NEGATIVE_INFINITY },
  ];
}

export type Group<T> = { key: string; title: string; subtitle: string; items: T[] };

// 把（已排序的）items 按分组维度分段。none 返回单段，标题用调用方给的 noneTitle（通常是排序名）。
export function groupItems<T>(
  items: T[],
  groupBy: GroupOption,
  getDate: (item: T) => { created: number; modified: number },
  noneTitle: string,
): Group<T>[] {
  if (groupBy === "none") {
    return [{ key: "all", title: noneTitle, subtitle: String(items.length), items }];
  }

  const bands = dateBands();
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const ms = groupBy === "created" ? getDate(item).created : getDate(item).modified;
    const band = bands.find((b) => ms >= b.from) ?? bands[bands.length - 1];
    const bucket = buckets.get(band.key);
    if (bucket) bucket.push(item);
    else buckets.set(band.key, [item]);
  }

  const groups: Group<T>[] = [];
  for (const band of bands) {
    const bucket = buckets.get(band.key);
    if (bucket) groups.push({ key: band.key, title: band.title, subtitle: String(bucket.length), items: bucket });
  }
  return groups;
}

// 分组子菜单：按 allowed 顺序渲染日期维度，None 固定放最后，当前项打勾。
export function GroupBySubmenu(props: {
  allowed: GroupDateOption[];
  value: GroupOption;
  onChange: (next: GroupOption) => void;
}) {
  const labels: Record<GroupDateOption, string> = {
    created: t.groupByCreated,
    modified: t.groupByModified,
  };
  return (
    <ActionPanel.Submenu title={t.groupBy} icon={Icon.Calendar}>
      {props.allowed.map((option) => (
        <Action
          key={option}
          title={labels[option]}
          icon={props.value === option ? Icon.CheckCircle : Icon.Circle}
          onAction={() => props.onChange(option)}
        />
      ))}
      <Action
        title={t.groupNone}
        icon={props.value === "none" ? Icon.CheckCircle : Icon.Circle}
        onAction={() => props.onChange("none")}
      />
    </ActionPanel.Submenu>
  );
}
