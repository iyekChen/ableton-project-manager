import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { getSettings } from "./settings";
import { getTranslations } from "./i18n";
import { SortBySubmenu, sortItems, sortOptionTitle, useSortOption } from "./sorting";
import type { SortOption } from "./sorting";
import { listBounces, resolveBouncesFolder } from "./projects/bounces";
import type { Bounce } from "./projects/bounces";

const t = getTranslations(getSettings().language);

const BOUNCES_SORT_STORAGE_KEY = "bounces-sort-option";
const BOUNCES_SORT_OPTIONS: SortOption[] = [
  "created-desc",
  "created-asc",
  "modified-desc",
  "modified-asc",
  "name-asc",
  "name-desc",
  "size-desc",
  "size-asc",
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export function Bounces(props: { projectName: string; projectPath: string }) {
  const [bounces, setBounces] = useState<Bounce[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useSortOption(BOUNCES_SORT_STORAGE_KEY, BOUNCES_SORT_OPTIONS, "created-desc");

  useEffect(() => {
    setBounces(listBounces(resolveBouncesFolder(props.projectPath)));
    setIsLoading(false);
  }, [props.projectPath]);

  const sorted = sortItems(bounces, sortBy, (b) => ({
    created: b.createdAt,
    modified: b.modifiedAt,
    name: b.name,
    size: b.size,
  }));

  return (
    <List isLoading={isLoading} navigationTitle={`${t.browseBounces} — ${props.projectName}`}>
      {sorted.length === 0 ? (
        <List.EmptyView icon={Icon.Music} title={t.noBounces} />
      ) : (
        <List.Section title={sortOptionTitle(sortBy)}>
          {sorted.map((b) => (
            <List.Item
              key={b.path}
              title={b.name}
              icon={Icon.Music}
              accessories={[{ text: formatSize(b.size) }]}
              quickLook={{ path: b.path, name: b.name }}
              actions={
                <ActionPanel>
                  <Action.ToggleQuickLook />
                  <ActionPanel.Section>
                    <SortBySubmenu allowed={BOUNCES_SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
