import { ActionPanel, Action, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { getProjectMetadata, saveProjectMetadata } from "../../project-metadata";
import { getNotesFolder, readNoteFile, writeNoteFile } from "../../notes";
import { getSettings } from "../../settings";
import { getTranslations } from "../../i18n";
import type { Project } from "../../projects/types";

const settings = getSettings();
const t = getTranslations(settings.language);

export function EditNote({ project, onSaved }: { project: Project; onSaved: () => void }) {
  const { pop } = useNavigation();
  const [note, setNote] = useState("");

  useEffect(() => {
    async function load() {
      if (getNotesFolder()) {
        setNote(readNoteFile(project.id));
      } else {
        const metadata = await getProjectMetadata(project.id);
        setNote(metadata.notes);
      }
    }

    void load();
  }, [project.id]);

  async function handleSubmit() {
    if (getNotesFolder()) {
      writeNoteFile(project.id, note);
    } else {
      const metadata = await getProjectMetadata(project.id);
      await saveProjectMetadata(project.id, { ...metadata, notes: note });
    }

    onSaved();

    await showToast({
      style: Toast.Style.Success,
      title: t.infoUpdated,
    });

    pop();
  }

  return (
    <Form
      navigationTitle={`${t.editNote} — ${project.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.save} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="note" title={t.notes} value={note} onChange={setNote} />
    </Form>
  );
}
