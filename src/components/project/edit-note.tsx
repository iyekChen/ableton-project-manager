import { ActionPanel, Action, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { readDocFile, stripFrontmatter, writeDocBody } from "../../docs";
import { getSettings } from "../../settings";
import { getTranslations } from "../../i18n";
import type { Project } from "../../projects/types";

const settings = getSettings();
const t = getTranslations(settings.language);

export function EditNote({ project, onSaved }: { project: Project; onSaved: () => void }) {
  const { pop } = useNavigation();
  const [note, setNote] = useState("");

  useEffect(() => {
    setNote(stripFrontmatter(readDocFile(project, "notes")));
  }, [project]);

  async function handleSubmit() {
    writeDocBody(project, "notes", note);

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
