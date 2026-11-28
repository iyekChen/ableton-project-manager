import {
  Action,
  ActionPanel,
  Alert,
  closeMainWindow,
  Color,
  confirmAlert,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  trash,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import fs from "node:fs";
import path from "node:path";
import { strings } from "@/strings";
import { labels, templateLabels } from "@/daws/labels";
import { openWithDaw } from "@/core/daw-app";
import { listEmptyState } from "@/core/ui/shared/list-empty-state";
import { errorMessage, showFailure } from "@/core/ui/shared/toast";
import { LOG_PREFIX } from "@/core/log";
import { ShowInFinderAction } from "@/core/ui/actions/show-in-finder";
import { defaultTemplatesFolder, isTemplate, listTemplates, type Template, type TemplateGroup } from "./templates";

function templatesFolderPreference(): string | undefined {
  return getPreferenceValues<Preferences>().templatesFolder || undefined;
}

// 没设 Templates Folder 时用 Live 自己的默认位置。
const TEMPLATES_FOLDER = templatesFolderPreference() ?? defaultTemplatesFolder();

/** 模板列表：顶层一组，每个直接子文件夹一组。模板原件只读，这里只打开、改名、移到废纸篓。 */
export function TemplatesView() {
  const [groups, setGroups] = useState<TemplateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // 读取失败的原因：列表为空时据此显示出错页面，而不是看起来像没有模板。
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(() => {
    try {
      setGroups(listTemplates(TEMPLATES_FOLDER, isTemplate));
      setLoadError(null);
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to load templates:`, error);
      setLoadError(errorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(reload, [reload]);

  // 出错页面上的 Retry：重读期间显示加载，读完再收起。
  const retryLoad = () => {
    setIsLoading(true);
    reload();
  };

  // 和打开已有 Set 一样：用 Live 打开模板原件，然后关掉 Raycast 窗口。
  async function handleCreate(template: Template) {
    try {
      await openWithDaw(template.path);
      await closeMainWindow();
    } catch (error) {
      await showFailure(labels.openSetFailed, error);
    }
  }

  async function handleTrash(template: Template) {
    const confirmed = await confirmAlert({
      title: strings.moveToTrash,
      icon: Icon.Trash,
      message: `${templateLabels.templateTrashHint}\n${template.name}`,
      primaryAction: { title: strings.moveToTrash, style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await trash(template.path);
      reload();
      await showToast({
        style: Toast.Style.Success,
        title: templateLabels.templateMovedToTrash,
        message: template.name,
      });
    } catch (error) {
      await showFailure(templateLabels.trashTemplateFailed, error);
    }
  }

  const renderTemplate = (template: Template) => (
    <List.Item
      key={template.path}
      icon="set.png"
      title={template.name}
      actions={
        <ActionPanel>
          <Action
            title={templateLabels.newProjectWithTemplate}
            icon={Icon.NewDocument}
            onAction={() => handleCreate(template)}
          />
          <ShowInFinderAction path={template.path} />
          <Action.Push
            title={templateLabels.renameTemplate}
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={<RenameTemplate template={template} onRenamed={reload} />}
          />
          <Action
            title={strings.moveToTrash}
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={() => handleTrash(template)}
          />
        </ActionPanel>
      }
    />
  );

  const emptyState = listEmptyState(isLoading, groups.length, loadError);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={templateLabels.newProjectWithTemplate}
      searchBarPlaceholder={templateLabels.searchTemplates}
    >
      {emptyState === "error" && (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title={templateLabels.loadTemplatesFailed}
          description={loadError ?? undefined}
          actions={
            <ActionPanel>
              <Action title={strings.retry} icon={Icon.ArrowClockwise} onAction={retryLoad} />
              <Action title={strings.openExtensionPreferences} icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      )}
      {emptyState === "empty" && (
        <List.EmptyView
          icon={Icon.Folder}
          title={templateLabels.noTemplates}
          description={templateLabels.noTemplatesHint.replace("{folder}", TEMPLATES_FOLDER)}
          actions={
            <ActionPanel>
              <Action title={strings.openExtensionPreferences} icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      )}
      {groups.map((group) => (
        <List.Section key={group.title ?? ""} title={group.title ?? templateLabels.templates}>
          {group.templates.map(renderTemplate)}
        </List.Section>
      ))}
    </List>
  );
}

/** 模板改名：只在同一个文件夹里改，后缀保持不变。 */
function RenameTemplate({ template, onRenamed }: { template: Template; onRenamed: () => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState(template.name);

  async function handleSubmit() {
    const trimmed = name.trim();
    if (trimmed === "" || trimmed.includes("/") || trimmed.includes(":")) {
      await showToast({ style: Toast.Style.Failure, title: strings.invalidName });
      return;
    }
    if (trimmed === template.name) {
      pop();
      return;
    }

    const target = path.join(path.dirname(template.path), `${trimmed}${path.extname(template.path)}`);
    if (fs.existsSync(target)) {
      await showToast({ style: Toast.Style.Failure, title: templateLabels.templateNameExists });
      return;
    }

    try {
      fs.renameSync(template.path, target);
    } catch (error) {
      await showFailure(templateLabels.renameTemplateFailed, error);
      return;
    }
    onRenamed();
    await showToast({ style: Toast.Style.Success, title: templateLabels.templateRenamed, message: trimmed });
    pop();
  }

  return (
    <Form
      navigationTitle={`${templateLabels.renameTemplate} — ${template.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={strings.save} icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={strings.name} placeholder={template.name} value={name} onChange={setName} />
    </Form>
  );
}
