import type { Language } from "@/settings";
import type { DawLabels } from "./types";

const labels: Record<Language, DawLabels> = {
  en: {
    sets: "Sets",
    latestSet: "Latest Set",
    viewSets: "View Sets",
    openLatestSet: "Open Latest Set",
    noSets: "No Sets Found",
    openSetFailed: "Couldn't Open Set",
    readingSets: "Reading Sets…",
    newProjectFile: "New Live Set",
    newProjectFileFailed: "Ableton Live not found",
    noProjectsFound: "No Ableton projects found",
    noProjectsFoundHint: "Nothing in {folder} contains a Live Set. Check the Projects Folder in preferences.",
    renameConfirmMessage:
      "Make sure this project is closed in Ableton Live. Renaming while it's open can detach your session.",
  },
};

export function getDawLabels(language: Language): DawLabels {
  return labels[language];
}
