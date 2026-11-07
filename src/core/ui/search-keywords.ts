import type { TaxonomyOption } from "@/core/metadata/taxonomy";

// 规整成只剩字母和数字：全角转半角、去掉重音、小写，再去掉空格和标点。
// Hip-Hop → hiphop，Lo-Fi → lofi，Café → cafe，ｈｉｐｈｏｐ → hiphop。
function compact(text: string): string {
  return text
    .normalize("NFKC")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

// 一个名字可被搜到的写法：原名，加上规整后的写法。
// & 要先换成 n / and 再规整（R&B → rnb、randb；Drum & Bass → drumnbass、drumandbass）：
// 顺序反过来，& 会被当成标点去掉，R&B 就成了 rb。
export function nameKeywords(name: string): string[] {
  const base = name.normalize("NFKC");
  const variants = base.includes("&") ? [base.replace(/&/g, "n"), base.replace(/&/g, "and")] : [base];
  return [...new Set([name, ...variants, ...variants.map(compact)])];
}

// Tag 选项可被搜到的写法：名字和用户自填的别名，各自展开成各种写法。
export function optionKeywords(option: TaxonomyOption): string[] {
  return [...new Set([option.name, ...(option.aliases ?? [])].flatMap(nameKeywords))];
}

const MONTH_LONG = new Intl.DateTimeFormat("en", { month: "long" });
const MONTH_SHORT = new Intl.DateTimeFormat("en", { month: "short" });

// 创建时间的搜索词：年份和英文月份（全称、缩写），输入 2025、June、Jun 都能搜到。
export function dateKeywords(ms: number): string[] {
  const date = new Date(ms);
  return [String(date.getFullYear()), MONTH_LONG.format(date), MONTH_SHORT.format(date)];
}

// 组合搜索：按空格拆词，每个词规整后都要出现在某一项的规整写法里，全部命中才算。
// 输入里的 & 也当 n，所以 r&b 和 rnb 搜到的一样。
export function matchesSearch(terms: string[], query: string): boolean {
  const words = query
    .normalize("NFKC")
    .split(/\s+/)
    .map((word) => compact(word.replace(/&/g, "n")))
    .filter(Boolean);
  if (words.length === 0) return true;
  const haystack = terms.map(compact);
  return words.every((word) => haystack.some((term) => term.includes(word)));
}
