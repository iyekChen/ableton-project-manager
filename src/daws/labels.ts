import type { DawLabels } from "./types";

export const labels: DawLabels = {
  sets: "Sets",
  currentSet: "Latest Set",
  viewSets: "View Sets",
  openCurrentSet: "Open Latest Set",
  noSets: "No Sets Found",
  openSetFailed: "Couldn't Open Set",
  readingSets: "Reading Sets…",
  newProjectFile: "New Live Set",
  newProjectFileFailed: "Couldn't Create Live Set",
  dawAppNotFound: "Couldn't Find Ableton Live",
  noProjectsFound: "No Ableton Projects Found",
  noProjectsFoundHint: "Nothing in {folder} contains a Live Set. Check the Projects Folder in preferences.",
  renameConfirmMessage:
    "Make sure this project is closed in Ableton Live. Renaming while it's open can detach your session.",
};

// 模板列表的文字。只有 Live 有模板功能，所以不放进共用的 DawLabels。
export const templateLabels: {
  newProjectWithTemplate: string;
  renameTemplate: string;
  searchTemplates: string;
  templates: string;
  noTemplates: string;
  noTemplatesHint: string;
  templateNameExists: string;
  templateRenamed: string;
  renameTemplateFailed: string;
  trashTemplateFailed: string;
  templateMovedToTrash: string;
  templateTrashHint: string;
} = {
  newProjectWithTemplate: "New Live Set from Template",
  renameTemplate: "Rename Template",
  searchTemplates: "Search Templates",
  templates: "Templates",
  noTemplates: "No Templates Found",
  noTemplatesHint: "Nothing in {folder} looks like a template. Check the Templates Folder in preferences.",
  templateNameExists: "A template with that name already exists",
  templateRenamed: "Template Renamed",
  renameTemplateFailed: "Couldn't Rename Template",
  trashTemplateFailed: "Couldn't Move Template to Trash",
  templateMovedToTrash: "Template Moved to Trash",
  templateTrashHint: "This moves the template to the Trash:",
};
