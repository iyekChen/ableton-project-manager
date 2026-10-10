import {
  ActionPanel,
  Action,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "node:fs";
import path from "node:path";
import { getProjectMetadata, renameProjectMetadata, saveProjectMetadata } from "../../project-metadata";
import { getTranslations } from "../../i18n";
import { getSettings } from "../../settings";
import { renameNoteFile } from "../../notes";
import { stageTaxonomy, genreTaxonomy, collectionTaxonomy } from "../../taxonomies";
import type { TaxonomyOption } from "../../taxonomy";
import type { Project } from "../../projects/types";

const settings = getSettings();
const t = getTranslations(settings.language);

export function EditInfo({ project, onSaved }: { project: Project; onSaved: () => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState(project.title);

  const [stageOptions, setStageOptions] = useState<TaxonomyOption[]>([]);
  const [genreOptions, setGenreOptions] = useState<TaxonomyOption[]>([]);
  const [collectionOptions, setCollectionOptions] = useState<TaxonomyOption[]>([]);

  const [stageId, setStageId] = useState("none");
  const [genreIds, setGenreIds] = useState<string[]>([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const [stages, genres, collections, metadata] = await Promise.all([
        stageTaxonomy.get(),
        genreTaxonomy.get(),
        collectionTaxonomy.get(),
        getProjectMetadata(project.id),
      ]);

      setStageOptions(stages);
      setGenreOptions(genres);
      setCollectionOptions(collections);
      setStageId(metadata.stageId ?? "none");
      setGenreIds(metadata.genreIds);
      setCollectionIds(metadata.collectionIds);
    }

    void load();
  }, [project.id]);

  async function handleSubmit() {
    const trimmedName = name.trim();
    const nameChanged = trimmedName !== "" && trimmedName !== project.title;

    let targetId = project.id;

    if (nameChanged) {
      if (trimmedName.includes("/") || trimmedName.includes(":")) {
        await showToast({ style: Toast.Style.Failure, title: t.invalidName });
        return;
      }

      const newPath = path.join(path.dirname(project.folderPath), trimmedName);

      if (fs.existsSync(newPath)) {
        await showToast({ style: Toast.Style.Failure, title: t.nameExists });
        return;
      }

      const confirmed = await confirmAlert({
        icon: { source: Icon.Warning, tintColor: Color.Yellow },
        title: t.renameConfirmTitle,
        message: t.renameConfirmMessage,
        primaryAction: { title: t.rename, style: Alert.ActionStyle.Default },
      });

      if (!confirmed) {
        return;
      }

      try {
        fs.renameSync(project.folderPath, newPath);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: t.renameFailed,
          message: error instanceof Error ? error.message : String(error),
        });
        return;
      }

      await renameProjectMetadata(project.id, trimmedName);
      renameNoteFile(project.id, trimmedName);
      targetId = trimmedName;
    }

    const metadata = await getProjectMetadata(targetId);
    await saveProjectMetadata(targetId, {
      ...metadata,
      stageId: stageId === "none" ? null : stageId,
      genreIds,
      collectionIds,
    });

    onSaved();

    await showToast({
      style: Toast.Style.Success,
      title: t.infoUpdated,
    });

    pop();
  }

  return (
    <Form
      navigationTitle={`${t.editInfo} — ${project.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.save} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={t.name} value={name} onChange={setName} />

      <Form.Dropdown id="stage" title={t.stage} value={stageId} onChange={setStageId}>
        <Form.Dropdown.Item value="none" title={t.none} icon={Icon.Circle} />
        {stageOptions.map((option) => (
          <Form.Dropdown.Item
            key={option.id}
            value={option.id}
            title={option.name}
            icon={option.color ? { source: Icon.Circle, tintColor: option.color } : Icon.Circle}
          />
        ))}
      </Form.Dropdown>

      <Form.TagPicker id="genre" title={t.genre} value={genreIds} onChange={setGenreIds}>
        {genreOptions.map((option) => (
          <Form.TagPicker.Item key={option.id} value={option.id} title={option.name} />
        ))}
      </Form.TagPicker>

      <Form.TagPicker id="collection" title={t.collection} value={collectionIds} onChange={setCollectionIds}>
        {collectionOptions.map((option) => (
          <Form.TagPicker.Item key={option.id} value={option.id} title={option.name} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
