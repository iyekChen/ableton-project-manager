import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  popToRoot,
  showToast,
  Toast,
  trash,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import fs from "node:fs";
import path from "node:path";
import { getSettings } from "@/settings";
import { getTranslations } from "@/i18n";
import { daw } from "@/daws";
import { getDawLabels } from "@/daws/labels";
import { listTemplates, type Template, type TemplateGroup } from "@/core/projects/templates";
import { openWithDaw } from "@/core/daw-app";
import { showFailure } from "@/core/ui/toast";

const settings = getSettings();
const t = getTranslations(settings.language);
const labels = getDawLabels(settings.language);
const PROJECTS_ROOT = settings.projectsFolder;
// 没设 Templates Folder 时用 DAW 自己的默认位置。
const TEMPLATES_FOLDER = settings.templatesFolder || daw.defaultTemplatesFolder();

/** 模板列表：顶层一组，每个直接子文件夹一组。模板原件只读，这里只新建、改名、移到废纸篓。 */
export function TemplatesView({ onCreated }: { onCreated: (name: string) => void }) {
  const [groups, setGroups] = useState<TemplateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(() => {
    setGroups(listTemplates(TEMPLATES_FOLDER, daw.isTemplate));
    setIsLoading(false);
  }, []);

  useEffect(reload, [reload]);

  async function handleTrash(template: Template) {
    const confirmed = await confirmAlert({
      title: t.moveToTrash,
      icon: Icon.Trash,
      message: `${t.templateTrashHint}\n${template.name}`,
      primaryAction: { title: t.moveToTrash, style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await trash(template.path);
      reload();
      await showToast({ style: Toast.Style.Success, title: t.movedToTrash, message: template.name });
    } catch (error) {
      await showFailure(t.trashFailed, error);
    }
  }

  const renderTemplate = (template: Template) => (
    <List.Item
      key={template.path}
      icon={Icon.Document}
      title={template.name}
      actions={
        <ActionPanel>
          <Action.Push
            title={t.createProject}
            icon={Icon.NewDocument}
            target={<CreateFromTemplate template={template} onCreated={onCreated} />}
          />
          <Action.ShowInFinder path={template.path} title={t.showInFinder} />
          <Action.Push
            title={t.rename}
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={<RenameTemplate template={template} onRenamed={reload} />}
          />
          <Action
            title={t.moveToTrash}
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={() => handleTrash(template)}
          />
        </ActionPanel>
      }
    />
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={labels.newProjectWithTemplate}
      searchBarPlaceholder={t.searchTemplates}
    >
      {!isLoading && groups.length === 0 && (
        <List.EmptyView
          icon={Icon.Folder}
          title={t.noTemplates}
          description={t.noTemplatesHint.replace("{folder}", TEMPLATES_FOLDER)}
          actions={
            <ActionPanel>
              <Action title={t.openPreferences} icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      )}
      {groups.map((group) => (
        <List.Section key={group.title ?? ""} title={group.title ?? t.templates}>
          {group.templates.map(renderTemplate)}
        </List.Section>
      ))}
    </List>
  );
}

/** 新建表单：只有一个名字。校验和项目改名一致，另外拦下 Projects Folder 里已有的同名条目。 */
function CreateFromTemplate({ template, onCreated }: { template: Template; onCreated: (name: string) => void }) {
  const [name, setName] = useState(template.name);

  async function handleSubmit() {
    const trimmed = name.trim();
    if (trimmed === "" || trimmed.includes("/") || trimmed.includes(":")) {
      await showToast({ style: Toast.Style.Failure, title: t.invalidName });
      return;
    }

    // 新项目在磁盘上的名字由 DAW 决定（包还是文件夹），两种都查一遍，免得撞上已有的条目。
    const taken = (["package", "folder"] as const).some((kind) =>
      fs.existsSync(path.join(PROJECTS_ROOT, daw.entryNameFor(trimmed, kind))),
    );
    if (taken) {
      await showToast({ style: Toast.Style.Failure, title: t.nameExists });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: t.creatingProject, message: trimmed });
    let target: string;
    try {
      target = daw.createFromTemplate(template.path, PROJECTS_ROOT, trimmed);
    } catch (error) {
      await toast.hide();
      // 复制了一半的东西移到废纸篓；EEXIST 说明目标在复制前就已被别的进程创建（不是本次产物），不能删。
      const code = error instanceof Error ? (error as NodeJS.ErrnoException).code : undefined;
      if (code !== "EEXIST" && code !== "ERR_FS_CP_EEXIST") {
        // 新项目在磁盘上的名字由 DAW 决定，两种形态都查一遍，删掉本次留下的那个。
        for (const kind of ["package", "folder"] as const) {
          const partial = path.join(PROJECTS_ROOT, daw.entryNameFor(trimmed, kind));
          if (fs.existsSync(partial)) await trash(partial).catch(() => undefined);
        }
      }
      await showFailure(t.createFromTemplateFailed, error);
      return;
    }

    try {
      await openWithDaw(target);
    } catch (error) {
      await toast.hide();
      await showFailure(labels.openSetFailed, error);
      return;
    }
    await toast.hide();
    onCreated(trimmed);
    await popToRoot();
    await showToast({ style: Toast.Style.Success, title: t.createdProject.replace("{name}", trimmed) });
  }

  return (
    <Form
      navigationTitle={`${t.createProject} — ${template.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.createProject} icon={Icon.NewDocument} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={t.name} value={name} onChange={setName} />
    </Form>
  );
}

/** 模板改名：只在同一个文件夹里改，后缀保持不变。 */
function RenameTemplate({ template, onRenamed }: { template: Template; onRenamed: () => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState(template.name);

  async function handleSubmit() {
    const trimmed = name.trim();
    if (trimmed === "" || trimmed.includes("/") || trimmed.includes(":")) {
      await showToast({ style: Toast.Style.Failure, title: t.invalidName });
      return;
    }
    if (trimmed === template.name) {
      pop();
      return;
    }

    const target = path.join(path.dirname(template.path), `${trimmed}${path.extname(template.path)}`);
    if (fs.existsSync(target)) {
      await showToast({ style: Toast.Style.Failure, title: t.templateNameExists });
      return;
    }

    try {
      fs.renameSync(template.path, target);
    } catch (error) {
      await showFailure(t.renameFailed, error);
      return;
    }
    onRenamed();
    await showToast({ style: Toast.Style.Success, title: t.renamed, message: trimmed });
    pop();
  }

  return (
    <Form
      navigationTitle={`${t.rename} — ${template.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.rename} icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={t.name} value={name} onChange={setName} />
    </Form>
  );
}
