import { ActionPanel, Action, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { readDocFile, stripFrontmatter, writeDocBody } from "../../docs";
import { showDocError } from "../../doc-actions";
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
    try {
      writeDocBody(project, "notes", note);
    } catch (error) {
      // 自定义文件夹失效等：不返回上一页，保留已输入的内容。
      await showDocError(error);
      return;
    }
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
