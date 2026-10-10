import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getTranslations } from "./i18n";
import type { Project } from "./projects/types";
import {
  TrackMap,
  assignNumber,
  getTrackMap,
  nextNumber,
  removeNumber,
  setTrackMap,
  swapNumbers,
} from "./collection-order";

const t = getTranslations(getPreferenceValues<{ language: Parameters<typeof getTranslations>[0] }>().language);

type Collection = { id: string; name: string };

export function CollectionList({ projects, collections }: { projects: Project[]; collections: Collection[] }) {
  return (
    <List navigationTitle={t.browseCollections}>
      {collections.length === 0 ? (
        <List.EmptyView title={t.noCategories} />
      ) : (
        collections.map((c) => {
          const count = projects.filter((p) => p.collectionIds.includes(c.id)).length;
          return (
            <List.Item
              key={c.id}
              icon={Icon.Cd}
              title={c.name}
              accessories={[{ text: `${count}` }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title={t.open}
                    icon={Icon.Cd}
                    target={<CollectionPanel collection={c} projects={projects} />}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function CollectionPanel({ collection, projects }: { collection: Collection; projects: Project[] }) {
  const members = projects.filter((p) => p.collectionIds.includes(collection.id));

  const [map, setMap] = useState<TrackMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setMap(await getTrackMap(collection.id));
      setLoading(false);
    }
    load();
  }, [collection.id]);

  async function apply(next: TrackMap) {
    setMap(next);
    await setTrackMap(collection.id, next);
  }

  const tracked = members
    .filter((p) => map[p.id] !== undefined)
    .sort((a, b) => map[a.id] - map[b.id] || a.title.localeCompare(b.title));
  const unsorted = members.filter((p) => map[p.id] === undefined).sort((a, b) => a.title.localeCompare(b.title));

  // 统计每个号被几首占用(用于撞号高亮)
  const counts = new Map<number, number>();
  for (const p of tracked) counts.set(map[p.id], (counts.get(map[p.id]) ?? 0) + 1);

  return (
    <List navigationTitle={collection.name} isLoading={loading}>
      {tracked.length === 0 && unsorted.length === 0 ? (
        <List.EmptyView title={t.noCategories} />
      ) : (
        <>
          {tracked.length > 0 && (
            <List.Section title={t.tracklist}>
              {tracked.map((p, i) => {
                const num = map[p.id];
                const dup = (counts.get(num) ?? 0) > 1;
                const accessories: List.Item.Accessory[] = [{ text: `Track ${String(num).padStart(2, "0")}` }];
                if (dup) {
                  accessories.push({
                    icon: { source: Icon.Warning, tintColor: Color.Yellow },
                    tooltip: t.duplicateTrack,
                  });
                }
                return (
                  <List.Item
                    key={p.id}
                    icon={{ source: "Project.png" }}
                    title={p.title}
                    accessories={accessories}
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title={t.setTrackNumber}
                          icon={Icon.Hashtag}
                          target={
                            <SetTrackNumberForm
                              current={num}
                              onSubmit={(n) => apply(n === null ? removeNumber(map, p.id) : assignNumber(map, p.id, n))}
                            />
                          }
                        />
                        {i > 0 && (
                          <Action
                            title={t.swapUp}
                            icon={Icon.ArrowUp}
                            shortcut={Keyboard.Shortcut.Common.MoveUp}
                            onAction={() => apply(swapNumbers(map, p.id, tracked[i - 1].id))}
                          />
                        )}
                        {i < tracked.length - 1 && (
                          <Action
                            title={t.swapDown}
                            icon={Icon.ArrowDown}
                            shortcut={Keyboard.Shortcut.Common.MoveDown}
                            onAction={() => apply(swapNumbers(map, p.id, tracked[i + 1].id))}
                          />
                        )}
                        {i < tracked.length - 1 && (
                          <Action
                            title={t.moveToBottom}
                            icon={Icon.ArrowDownCircle}
                            onAction={() => apply(assignNumber(map, p.id, nextNumber(map)))}
                          />
                        )}
                        <Action
                          title={t.removeFromTracklist}
                          icon={Icon.MinusCircle}
                          onAction={() => apply(removeNumber(map, p.id))}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}

          {unsorted.length > 0 && (
            <List.Section title={t.unsorted}>
              {unsorted.map((p) => (
                <List.Item
                  key={p.id}
                  icon={{ source: "Project.png" }}
                  title={p.title}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title={t.setTrackNumber}
                        icon={Icon.Hashtag}
                        target={
                          <SetTrackNumberForm
                            current={nextNumber(map)}
                            onSubmit={(n) => apply(n === null ? removeNumber(map, p.id) : assignNumber(map, p.id, n))}
                          />
                        }
                      />
                      <Action
                        title={t.addToTracklist}
                        icon={Icon.PlusCircle}
                        onAction={() => apply(assignNumber(map, p.id, nextNumber(map)))}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

function SetTrackNumberForm({ current, onSubmit }: { current?: number; onSubmit: (n: number | null) => void }) {
  const { pop } = useNavigation();
  const [value, setValue] = useState("");

  function handleSubmit() {
    const trimmed = value.trim();
    if (trimmed === "") {
      if (current !== undefined) onSubmit(current); // 留空 = 采用占位(建议号)
      pop();
      return;
    }
    const n = parseInt(trimmed, 10);
    if (isNaN(n) || n < 0) {
      showToast({ style: Toast.Style.Failure, title: t.invalidPosition });
      return;
    }
    onSubmit(n === 0 ? null : n); // 0 = 移出
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.save} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="n"
        title={t.trackNumber}
        placeholder={current !== undefined ? String(current) : "1"}
        value={value}
        onChange={setValue}
      />
    </Form>
  );
}
