import { getPreferenceValues } from "@raycast/api";

export type Language = "en" | "zh-CN";

type ExtensionPreferences = {
  projectsFolder: string;
  language?: Language;
};

export type Settings = {
  projectsFolder: string;
  language: Language;
};

export function getSettings(): Settings {
  const preferences = getPreferenceValues<ExtensionPreferences>();

  return {
    projectsFolder: preferences.projectsFolder,
    language: preferences.language ?? "en",
  };
}
