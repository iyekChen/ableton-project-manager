import { Color } from "@raycast/api";
import { createTaxonomy, TaxonomyOption } from "./taxonomy";
import { TRACK_ROLES } from "./track-role";

// Stage 默认 7 档流水线(有序 + 配色)。
export const STAGE_DEFAULTS: TaxonomyOption[] = [
  { id: "draft", name: "Draft", color: Color.SecondaryText, order: 1 },
  { id: "demo", name: "Demo", color: Color.PrimaryText, order: 2 },
  { id: "production", name: "Production", color: Color.Blue, order: 3 },
  { id: "mix", name: "Mix", color: Color.Yellow, order: 4 },
  { id: "master", name: "Master", color: Color.Orange, order: 5 },
  { id: "done", name: "Done", color: Color.Magenta, order: 6 },
  { id: "released", name: "Released", color: Color.Green, order: 7 },
];

// Stage:带色、有序、7 档种子。
export const stageTaxonomy = createTaxonomy("stage-options", STAGE_DEFAULTS);

// Genre / Collection:无色、无序、空种子(用户打字创建)。
export const genreTaxonomy = createTaxonomy("genre-options", []);
export const collectionTaxonomy = createTaxonomy("collection-options", []);

// Track Role：有序，默认取现有预设（Intro/Skit/Interlude/Outro），用户可增删改。
export const ROLE_DEFAULTS: TaxonomyOption[] = TRACK_ROLES.map((name, index) => ({
  id: name.toLowerCase(),
  name,
  order: index + 1,
}));
export const roleTaxonomy = createTaxonomy("role-options", ROLE_DEFAULTS);
