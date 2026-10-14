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
import { Taxonomy, TaxonomyOption } from "./taxonomy";
import { stageTaxonomy, genreTaxonomy, roleTaxonomy } from "./taxonomies";
import { deleteRoleEverywhere, renameRoleEverywhere } from "./collection-roles";
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

function CategoryForm(props: { title: string; currentName?: string; onSubmit: (name: string) => Promise<void> }) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");

  return (
    <Form
      navigationTitle={props.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t.save}
            onSubmit={async () => {
              const trimmed = name.trim();
              if (trimmed === "") {
                if (props.currentName !== undefined) {
                  pop();
                  return;
                }
                await showToast({ style: Toast.Style.Failure, title: t.invalidName });
                return;
              }
              await props.onSubmit(trimmed);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={t.name} placeholder={props.currentName} value={name} onChange={setName} />
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
    const option: TaxonomyOption = { id: slugify(name), name };

    if (options.some((o) => o.id === option.id)) {
      await showToast({ style: Toast.Style.Failure, title: t.nameExists });
      return;
    }

    const next = [...options, option];
    await TAXONOMIES[kind].save(next);
    setOptions(next);
    await showToast({ style: Toast.Style.Success, title: t.created });
  }

  async function renameOption(id: string, name: string) {
    const existing = options.find((o) => o.id === id);
    const next = options.map((o) => (o.id === id ? { ...o, name } : o));
    await TAXONOMIES[kind].save(next);
    setOptions(next);
    if (kind === "role" && existing && existing.name !== name) {
      await renameRoleEverywhere(existing.name, name);
    }
    await showToast({ style: Toast.Style.Success, title: t.renamed });
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
    }
    await showToast({ style: Toast.Style.Success, title: t.deleted });
  }

  const createAction = (
    <Action.Push
      title={t.create}
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<CategoryForm title={t.create} onSubmit={createOption} />}
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
      <List.EmptyView title={t.noCategories} icon={Icon.Tag} actions={<ActionPanel>{createAction}</ActionPanel>} />

      {options.map((option) => (
        <List.Item
          key={option.id}
          title={option.name}
          icon={Icon.Tag}
          actions={
            <ActionPanel>
              <Action.Push
                title={t.rename}
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={
                  <CategoryForm
                    title={t.rename}
                    currentName={option.name}
                    onSubmit={(name) => renameOption(option.id, name)}
                  />
                }
              />
              {createAction}
              <Action
                title={t.delete}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => deleteOption(option)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
