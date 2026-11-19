import { getPreferenceValues } from "@raycast/api";

export type Language = "en";

export type Settings = {
  projectsFolder: string;
  // 模板文件夹；留空时用 DAW 的默认位置（daw.defaultTemplatesFolder）。
  templatesFolder: string;
  language: Language;
};

export function getSettings(): Settings {
  const preferences = getPreferenceValues<Preferences>();

  return {
    projectsFolder: preferences.projectsFolder,
    templatesFolder: preferences.templatesFolder ?? "",
    language: "en",
  };
}
