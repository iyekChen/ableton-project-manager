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
import { genreTaxonomy, collectionTaxonomy } from "./taxonomies";
import { getSettings } from "./settings";
import { getTranslations } from "./i18n";

const t = getTranslations(getSettings().language);

type CategoryKind = "genre" | "collection";

const TAXONOMIES: Record<CategoryKind, Taxonomy> = {
  genre: genreTaxonomy,
  collection: collectionTaxonomy,
};

function slugify(name: string): string {
  const slug = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return slug || name.trim().toLowerCase();
}

function CategoryForm(props: { title: string; initialName?: string; onSubmit: (name: string) => Promise<void> }) {
  const { pop } = useNavigation();
  const [name, setName] = useState(props.initialName ?? "");

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
                await showToast({ style: Toast. Style.Failure, title: t.invalidName });
                return;
              }
              await props.onSubmit(trimmed);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={t.name} value={name} onChange={setName} />
    </Form>
  );
}

export default function Command() {
  const [kind, setKind] = useState<CategoryKind>("genre");
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
    const next = options.map((o) => (o.id === id ? { ...o, name } : o));
    await TAXONOMIES[kind].save(next);
    setOptions(next);
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
    await showToast({ style: Toast. Style.Success, title: t.deleted });
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
        <List.Dropdown tooltip={t.category} value={kind} onChange={(value) => setKind(value as CategoryKind)}>
          <List.Dropdown.Item title={t.genre} value="genre" />
          <List.Dropdown.Item title={t.collection} value="collection" />
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
                target={
                  <CategoryForm
                    title={t.rename}
                    initialName={option.name}
                    onSubmit={(name) => renameOption(option.id, name)}
                  />
                }
              />
              {createAction}
              <Action
                title={t.delete}
                icon={Icon. Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => deleteOption(option)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
