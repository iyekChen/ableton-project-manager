import { List, ActionPanel, Action, Icon, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { existsSync, readdirSync, statSync } from "fs";
import { extname, join } from "path";
import { getSettings } from "./settings";
import { getTranslations } from "./i18n";
import { SortBySubmenu, sortItems, sortOptionTitle, useSortOption } from "./sorting";
import type { SortOption } from "./sorting";

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

const AUDIO_EXTENSIONS = new Set([".wav", ".aif", ".aiff", ".mp3", ".m4a", ".flac"]);

type Bounce = {
  name: string;
  path: string;
  createdAt: number;
  modifiedAt: number;
  size: number;
};

// 项目文件夹「顶层」扫描，不进 Samples / Backup 等子文件夹。
// statSync 会跟随 symlink，所以链接到外部文件夹的 bounce 也能读到。
function loadBounces(folderPath: string): Bounce[] {
  if (!existsSync(folderPath)) return [];

  let entries: string[];
  try {
    entries = readdirSync(folderPath);
  } catch {
    return [];
  }

  const bounces: Bounce[] = [];
  for (const entry of entries) {
    if (!AUDIO_EXTENSIONS.has(extname(entry).toLowerCase())) continue;
    const fullPath = join(folderPath, entry);
    try {
      const stats = statSync(fullPath); // follows symlinks
      if (!stats.isFile()) continue;
      bounces.push({
        name: entry,
        path: fullPath,
        createdAt: stats.birthtimeMs,
        modifiedAt: stats.mtimeMs,
        size: stats.size,
      });
    } catch {
      continue;
    }
  }
  return bounces;
}

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
    const prefs = getPreferenceValues<{ bouncesFolderName?: string }>();
    const folderName = (prefs.bouncesFolderName ?? "").trim();
    const folderPath = folderName ? join(props.projectPath, folderName) : props.projectPath;
    setBounces(loadBounces(folderPath));
    setIsLoading(false);
  }, [props.projectPath]);

  const sorted = sortItems(bounces, sortBy, (b) => ({
    created: b.createdAt,
    modified: b.modifiedAt,
    name: b.name,
    size: b.size,
  }));

  return (
    <List isLoading={isLoading} navigationTitle={`${t.previewBounces} — ${props.projectName}`}>
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
