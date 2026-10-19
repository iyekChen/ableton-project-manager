import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Taxonomy, TaxonomyOption } from "@/core/metadata/taxonomy";
import { stageTaxonomy, genreTaxonomy, roleTaxonomy } from "@/core/metadata/taxonomies";
import { deleteRoleEverywhere, renameRoleEverywhere } from "@/core/metadata/collection-roles";
import { removeGenreEverywhere, removeStageEverywhere } from "@/core/metadata/project-metadata";
import { getSettings } from "./settings";
import { getTranslations } from "./i18n";

const t = getTranslations(getSettings().language);

type CategoryKind = "stage" | "genre" | "role";

const TAXONOMIES: Record<CategoryKind, Taxonomy> = {
  stage: stageTaxonomy,
  genre: genreTaxonomy,
  role: roleTaxonomy,
};

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return slug || name.trim().toLowerCase();
}

const COLOR_CHOICES: { label: string; value: Color }[] = [
  { label: "Blue", value: Color.Blue },
  { label: "Green", value: Color.Green },
  { label: "Yellow", value: Color.Yellow },
  { label: "Orange", value: Color.Orange },
  { label: "Red", value: Color.Red },
  { label: "Magenta", value: Color.Magenta },
  { label: "Purple", value: Color.Purple },
  { label: "Primary", value: Color.PrimaryText },
  { label: "Secondary", value: Color.SecondaryText },
];

function CategoryForm(props: {
  title: string;
  currentName?: string;
  showColor?: boolean;
  currentColor?: Color;
  onSubmit: (name: string, color?: Color) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [color, setColor] = useState<Color>(props.currentColor ?? Color.Blue);

  return (
    <Form
      navigationTitle={props.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t.save}
            onSubmit={async () => {
              const trimmed = name.trim();
              const finalName = trimmed === "" ? (props.currentName ?? "") : trimmed;
              if (finalName === "") {
                await showToast({ style: Toast.Style.Failure, title: t.invalidName });
                return;
              }
              await props.onSubmit(finalName, props.showColor ? color : undefined);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={t.name} placeholder={props.currentName} value={name} onChange={setName} />
      {props.showColor && (
        <Form.Dropdown id="color" title={t.color} value={color} onChange={(value) => setColor(value as Color)}>
          {COLOR_CHOICES.map((choice) => (
            <Form.Dropdown.Item
              key={choice.value}
              value={choice.value}
              title={choice.label}
              icon={{ source: Icon.Circle, tintColor: choice.value }}
            />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}

export default function Command() {
  const [kind, setKind] = useState<CategoryKind>("stage");
  const [options, setOptions] = useState<TaxonomyOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function reload(currentKind: CategoryKind) {
    setIsLoading(true);
    setOptions(await TAXONOMIES[currentKind].get());
    setIsLoading(false);
  }

  useEffect(() => {
    void reload(kind);
  }, [kind]);

  async function createOption(name: string) {
    const hasCustomOrder = options.some((option) => option.order !== undefined);
    const maxOrder = Math.max(0, ...options.map((option) => option.order ?? 0));

    const option: TaxonomyOption = {
      id: slugify(name),
      name,
      ...(hasCustomOrder ? { order: maxOrder + 1 } : {}),
    };

    if (options.some((o) => o.id === option.id)) {
      await showToast({ style: Toast.Style.Failure, title: t.nameExists });
      return;
    }

    const next = [...options, option];
    await TAXONOMIES[kind].save(next);
    setOptions(next);
    await showToast({ style: Toast.Style.Success, title: t.created });
  }

  async function editOption(id: string, name: string, color?: Color) {
    const existing = options.find((o) => o.id === id);
    const next = options.map((o) => {
      if (o.id !== id) return o;
      return kind === "stage" ? { ...o, name, color } : { ...o, name };
    });
    await TAXONOMIES[kind].save(next);
    setOptions(next);
    if (kind === "role" && existing && existing.name !== name) {
      await renameRoleEverywhere(existing.name, name);
    }
    await showToast({ style: Toast.Style.Success, title: t.infoUpdated });
  }

  async function deleteOption(option: TaxonomyOption) {
    const confirmed = await confirmAlert({
      icon: { source: Icon.Trash, tintColor: Color.Red },
      title: `${t.delete} “${option.name}”?`,
      primaryAction: { title: t.delete, style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) {
      return;
    }

    const next = options.filter((o) => o.id !== option.id);
    await TAXONOMIES[kind].save(next);
    setOptions(next);
    if (kind === "role") {
      await deleteRoleEverywhere(option.name);
    } else if (kind === "stage") {
      await removeStageEverywhere(option.id);
    } else if (kind === "genre") {
      await removeGenreEverywhere(option.id);
    }
    await showToast({ style: Toast.Style.Success, title: t.deleted });
  }

  // 恢复默认：写回默认种子，并清掉项目上指向已不存在选项的引用（Role 按名字，Stage/Genre 按 id）。
  async function resetOptions() {
    const confirmed = await confirmAlert({
      icon: { source: Icon.ArrowCounterClockwise, tintColor: Color.Red },
      title: `${t.resetToDefaults}?`,
      message: t.resetToDefaultsHint,
      primaryAction: { title: t.resetToDefaults, style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const previous = options;
    await TAXONOMIES[kind].reset();
    const next = await TAXONOMIES[kind].get();
    setOptions(next);

    for (const old of previous) {
      if (kind === "role") {
        if (!next.some((o) => o.name === old.name)) await deleteRoleEverywhere(old.name);
      } else if (!next.some((o) => o.id === old.id)) {
        if (kind === "stage") await removeStageEverywhere(old.id);
        else await removeGenreEverywhere(old.id);
      }
    }
    await showToast({ style: Toast.Style.Success, title: t.resetToDefaults });
  }

  // 重新排序并把 order 写成 1..N 持久化。
  async function reorder(from: number, to: number) {
    const next = [...options];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    const ordered = next.map((o, index) => ({ ...o, order: index + 1 }));
    await TAXONOMIES[kind].save(ordered);
    setOptions(ordered);
  }

  const createAction = (
    <Action.Push
      title={t.create}
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<CategoryForm title={t.create} onSubmit={createOption} />}
    />
  );

  const resetAction = (
    <Action
      title={t.resetToDefaults}
      icon={Icon.ArrowCounterClockwise}
      style={Action.Style.Destructive}
      onAction={resetOptions}
    />
  );

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip={t.tag} value={kind} onChange={(value) => setKind(value as CategoryKind)}>
          <List.Dropdown.Item title={t.stage} value="stage" />
          <List.Dropdown.Item title={t.genre} value="genre" />
          <List.Dropdown.Item title={t.role} value="role" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title={t.noCategories}
        icon={Icon.Tag}
        actions={
          <ActionPanel>
            {createAction}
            {resetAction}
          </ActionPanel>
        }
      />

      {options.map((option, index) => (
        <List.Item
          key={option.id}
          title={option.name}
          icon={kind === "stage" ? { source: Icon.Circle, tintColor: option.color ?? Color.SecondaryText } : Icon.Tag}
          actions={
            <ActionPanel>
              <Action.Push
                title={t.edit}
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={
                  <CategoryForm
                    title={t.edit}
                    currentName={option.name}
                    showColor={kind === "stage"}
                    currentColor={option.color}
                    onSubmit={(name, color) => editOption(option.id, name, color)}
                  />
                }
              />
              {createAction}
              <ActionPanel.Section>
                {index > 0 && (
                  <Action
                    title={t.moveToTop}
                    icon={Icon.ArrowUpCircle}

                    shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                    onAction={() => reorder(index, 0)}
                  />
                )}
                {index > 0 && (
                  <Action
                    title={t.moveUp}
                    icon={Icon.ArrowUp}
                    shortcut={Keyboard.Shortcut.Common.MoveUp}
                    onAction={() => reorder(index, index - 1)}
                  />
                )}
                {index < options.length - 1 && (
                  <Action
                    title={t.moveDown}
                    icon={Icon.ArrowDown}
                    shortcut={Keyboard.Shortcut.Common.MoveDown}
                    onAction={() => reorder(index, index + 1)}
                  />
                )}
                {index < options.length - 1 && (
                  <Action
                    title={t.moveToBottom}
                    icon={Icon.ArrowDownCircle}

                    shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                    onAction={() => reorder(index, options.length - 1)}
                  />
                )}
              </ActionPanel.Section>
              <Action
                title={t.delete}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => deleteOption(option)}
              />
              {resetAction}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
