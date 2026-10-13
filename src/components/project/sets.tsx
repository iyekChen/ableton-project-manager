import { ActionPanel, Action, getApplications, Keyboard, List, type Application } from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "node:fs";
import path from "node:path";
import { getAlsMetadata } from "../../als-metadata";
import {
  cacheAlsMetadata,
  EMPTY_METADATA,
  fileSignature,
  getCachedAlsMetadataEntry,
  loadPersistentAlsMetadataCache,
} from "../../projects/als-cache";
import type { CachedAlsMetadata } from "../../projects/als-cache";
import { SortBySubmenu, sortItems, sortOptionTitle, useSortOption } from "../../sorting";
import type { SortOption } from "../../sorting";
import { getSettings } from "../../settings";
import { getTranslations } from "../../i18n";
import type { Project } from "../../projects/types";

const settings = getSettings();
const t = getTranslations(settings.language);

const SETS_SORT_STORAGE_KEY = "sets-sort-option";

const SETS_SORT_OPTIONS: SortOption[] = [
  "modified-desc",
  "modified-asc",
  "created-desc",
  "created-asc",
  "name-asc",
  "name-desc",
];

type ProjectSet = CachedAlsMetadata & {
  name: string;
  path: string;
  createdAt: number;
  modifiedAt: number;
};

const ALS_METADATA_CONCURRENCY = 3;

export function Sets({ project }: { project: Project }) {
  const [sets, setSets] = useState<ProjectSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useSortOption(SETS_SORT_STORAGE_KEY, SETS_SORT_OPTIONS, "created-desc");
  const [abletonApp, setAbletonApp] = useState<Application | null>(null);

  // 解析 Ableton Live，仅用于 Open in Ableton Live 的图标。
  useEffect(() => {
    void getApplications().then((apps) => {
      setAbletonApp(apps.find((app) => app.name.toLowerCase().includes("ableton live")) ?? null);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    type PendingSet = {
      set: ProjectSet;
      signature: string;
      cached: boolean;
    };

    async function loadSets() {
      try {
        await loadPersistentAlsMetadataCache();

        if (cancelled) return;

        const files = fs.readdirSync(project.folderPath).filter((file) => file.endsWith(".als"));

        const pendingSets: PendingSet[] = files.map((file) => {
          const setPath = path.join(project.folderPath, file);
          const stats = fs.statSync(setPath);
          const signature = fileSignature(stats);
          const cachedEntry = getCachedAlsMetadataEntry(setPath);
          const cacheIsValid = cachedEntry !== undefined && cachedEntry.signature === signature;

          return {
            set: {
              name: path.basename(file, ".als"),
              path: setPath,
              createdAt: stats.birthtimeMs,
              modifiedAt: stats.mtimeMs,
              ...(cacheIsValid ? cachedEntry.metadata : EMPTY_METADATA),
            },
            signature,
            cached: cacheIsValid,
          };
        });

        const missing = pendingSets.filter((item) => !item.cached);

        async function parseSet(item: PendingSet) {
          try {
            const metadata = await getAlsMetadata(item.set.path);

            if (cancelled) return;

            if (fileSignature(fs.statSync(item.set.path)) !== item.signature) return;

            const normalizedMetadata: CachedAlsMetadata = {
              bpm: metadata.bpm,
              timeSignature: metadata.timeSignature,
              key: metadata.inKey === false ? null : metadata.key,
            };

            cacheAlsMetadata(item.set.path, item.signature, normalizedMetadata);
            item.set.bpm = normalizedMetadata.bpm;
            item.set.timeSignature = normalizedMetadata.timeSignature;
            item.set.key = normalizedMetadata.key;
          } catch (error) {
            console.error(`[Ableton Session Manager] Failed to load ALS metadata: ${item.set.path}`, error);
          }
        }

        let nextIndex = 0;

        async function worker() {
          while (!cancelled) {
            const index = nextIndex++;
            if (index >= missing.length) return;

            await parseSet(missing[index]);
          }
        }

        await Promise.all(Array.from({ length: Math.min(ALS_METADATA_CONCURRENCY, missing.length) }, () => worker()));

        if (cancelled) return;

        setSets(pendingSets.map((item) => item.set));
      } catch (error) {
        if (!cancelled) {
          console.error("[Ableton Session Manager] Failed to load Sets:", error);
          setSets([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSets();

    return () => {
      cancelled = true;
    };
  }, [project.folderPath]);

  const sortedSets = sortItems(sets, sortBy, (set) => ({
    created: set.createdAt,
    modified: set.modifiedAt,
    name: set.name,
  }));

  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle={project.title}>
      <List.Section title={sortOptionTitle(sortBy)}>
        {sortedSets.map((set) => (
          <List.Item
            key={set.path}
            icon="Set.png"
            title={set.name}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Key" text={set.key ?? "—"} />
                    <List.Item.Detail.Metadata.Label title="BPM" text={set.bpm === null ? "—" : String(set.bpm)} />
                    <List.Item.Detail.Metadata.Label title="Time Signature" text={set.timeSignature ?? "—"} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Open
                  title={t.openInAbletonLive}
                  icon={abletonApp ? { fileIcon: abletonApp.path } : undefined}
                  target={set.path}
                />
                <Action.ShowInFinder path={set.path} title={t.showInFinder} />
                <Action.CopyToClipboard
                  content={set.path.split("/").pop() ?? ""}
                  title={t.copySetName}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  content={set.path}
                  title={t.copySetPath}
                  shortcut={Keyboard.Shortcut.Common.CopyPath}
                />
                <ActionPanel.Section>
                  <SortBySubmenu allowed={SETS_SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
