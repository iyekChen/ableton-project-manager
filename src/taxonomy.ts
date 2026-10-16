import { Color, LocalStorage } from "@raycast/api";
import { isCorruptJson, StorageUnreadableError } from "./storage";

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
    const existing = await LocalStorage.getItem<string>(storageKey);
    if (isCorruptJson(existing)) {
      // 存储损坏时拒绝写入，避免把自定义分类覆盖掉。
      throw new StorageUnreadableError();
    }
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
      // 损坏：先返回默认值供界面显示，但保留损坏的存储、不写回，等待用户处理。
      return [...defaults];
    }
  }

  async function reset(): Promise<void> {
    await save(defaults);
  }

  return { get, save, reset };
}

// 有 order 的优先按用户顺序排列；没有 order 的按名称排列并置于末尾。
function sortOptions(options: TaxonomyOption[]): TaxonomyOption[] {
  return [...options].sort((a, b) => {
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER;

    return orderA - orderB || a.name.localeCompare(b.name);
  });
}
