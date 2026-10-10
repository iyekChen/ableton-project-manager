import { Color, LocalStorage } from "@raycast/api";

// 一个分类选项:名字必填;颜色、顺序可选(Stage 用颜色+顺序,Genre/Collection 不用)。
export type TaxonomyOption = {
  id: string;
  name: string;
  color?: Color;
  order?: number;
};

export type Taxonomy = {
  get: () => Promise<TaxonomyOption[]>;
  save: (options: TaxonomyOption[]) => Promise<void>;
  reset: () => Promise<void>;
};

// 工厂:给一个存储 key + 默认种子,返回这套分类的 get/save/reset。
export function createTaxonomy(storageKey: string, defaults: TaxonomyOption[]): Taxonomy {
  async function save(options: TaxonomyOption[]): Promise<void> {
    await LocalStorage.setItem(storageKey, JSON.stringify(options));
  }

  async function get(): Promise<TaxonomyOption[]> {
    const stored = await LocalStorage.getItem<string>(storageKey);

    if (!stored) {
      await save(defaults);
      return [...defaults];
    }

    try {
      return sortOptions(JSON.parse(stored) as TaxonomyOption[]);
    } catch {
      await save(defaults);
      return [...defaults];
    }
  }

  async function reset(): Promise<void> {
    await save(defaults);
  }

  return { get, save, reset };
}

// 有 order 的按 order 排(Stage);没 order 的按名字排(Genre/Collection)。
function sortOptions(options: TaxonomyOption[]): TaxonomyOption[] {
  return [...options].sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    return a.name.localeCompare(b.name);
  });
}
