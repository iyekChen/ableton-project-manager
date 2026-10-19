import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { setExternalBounces } from "../../project-metadata";
import { getTranslations } from "../../i18n";
import { getSettings } from "../../settings";
import type { Project } from "../../projects/types";

const settings = getSettings();
const t = getTranslations(settings.language);

export function ManageExternalBounces({ project, onSaved }: { project: Project; onSaved: () => void }) {
  const { pop } = useNavigation();
  const [folders, setFolders] = useState<string[]>(project.externalBounceFolders);
  const [files, setFiles] = useState<string[]>(project.externalBounceFiles);

  async function handleSubmit() {
    await setExternalBounces(project.id, folders, files);
    await showToast({ style: Toast.Style.Success, title: t.externalBounceSaved });
    onSaved();
    pop();
  }

  return (
    <Form
      navigationTitle={`${t.manageExternalBounce} — ${project.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.save} icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={t.externalBounceFormHint} />
      <Form.FilePicker
        id="folders"
        title={t.externalBounceFoldersField}
        value={folders}
        onChange={setFolders}
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection
      />
      <Form.FilePicker
        id="files"
        title={t.externalBounceFilesField}
        value={files}
        onChange={setFiles}
        canChooseDirectories={false}
        canChooseFiles
        allowMultipleSelection
      />
    </Form>
  );
}
