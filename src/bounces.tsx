import {
  List,
  ActionPanel,
  Action,
  Icon,
  Keyboard,
  Alert,
  Clipboard,
  confirmAlert,
  showToast,
  Toast,
  trash,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getSettings } from "./settings";
import { getTranslations } from "./i18n";
import { SortBySubmenu, sortItems, sortOptionTitle, useSortOption } from "./sorting";
import type { SortOption } from "./sorting";
import { GroupBySubmenu, groupItems, useGroupOption } from "./grouping";
import { listBounces, resolveBouncesFolder } from "./projects/bounces";
import type { Bounce } from "./projects/bounces";

const t = getTranslations(getSettings().language);

const BOUNCES_SORT_STORAGE_KEY = "bounces-sort-option";
const BOUNCES_GROUP_STORAGE_KEY = "bounces-group-option";
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
  const { pop } = useNavigation();
  const [bounces, setBounces] = useState<Bounce[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useSortOption(BOUNCES_SORT_STORAGE_KEY, BOUNCES_SORT_OPTIONS, "created-desc");
  const [groupBy, setGroupBy] = useGroupOption(BOUNCES_GROUP_STORAGE_KEY, "created");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    setBounces(listBounces(resolveBouncesFolder(props.projectPath)));
    setIsLoading(false);
  }, [props.projectPath, reloadToken]);

  const handleTrash = async (bounce: Bounce) => {
    const confirmed = await confirmAlert({
      title: t.moveToTrash,
      icon: Icon.Trash,
      message: `${t.trashBounceHint}\n${bounce.name}`,
      primaryAction: { title: t.moveToTrash, style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await trash(bounce.path);
    setReloadToken((n) => n + 1);
    await showToast({ style: Toast.Style.Success, title: t.movedToTrash, message: bounce.name });
  };
  const handleCopy = async (bounce: Bounce) => {
    await Clipboard.copy({ file: bounce.path });
    await showToast({ style: Toast.Style.Success, title: t.bounceCopied, message: bounce.name });
  };

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
        groupItems(
          sorted,
          groupBy,
          (b) => ({ created: b.createdAt, modified: b.modifiedAt }),
          sortOptionTitle(sortBy),
        ).map((group) => (
          <List.Section key={group.key} title={group.title} subtitle={group.subtitle}>
            {group.items.map((b) => (
              <List.Item
                key={b.path}
                title={b.name}
                icon="bounce.png"
                accessories={[{ text: formatSize(b.size) }]}
                quickLook={{ path: b.path, name: b.name }}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.ToggleQuickLook />
                      <Action.ShowInFinder
                        title={t.showInFinder}
                        path={b.path}
                        shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
                      />
                      <Action.Open
                        title={t.openInDefaultApp}
                        target={b.path}
                        shortcut={Keyboard.Shortcut.Common.Open}
                      />
                      <Action
                        title={t.copyBounce}
                        icon={Icon.CopyClipboard}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                        onAction={() => handleCopy(b)}
                      />
                      <Action.CopyToClipboard
                        content={b.name}
                        title={t.copyBounceName}
                        shortcut={Keyboard.Shortcut.Common.CopyName}
                      />
                      <Action.CopyToClipboard
                        content={b.path}
                        title={t.copyBouncePath}
                        shortcut={Keyboard.Shortcut.Common.CopyPath}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action
                        title={t.moveToTrash}
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                        onAction={() => handleTrash(b)}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <GroupBySubmenu allowed={["created", "modified"]} value={groupBy} onChange={setGroupBy} />
                      <SortBySubmenu allowed={BOUNCES_SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action
                        title={t.backToProjects}
                        icon={Icon.ArrowLeftCircle}
                        shortcut={{ modifiers: ["opt"], key: "return" }}
                        onAction={pop}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
