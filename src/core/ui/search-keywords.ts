// 搜索时 & 常被打成 n 或 and（R&B → rnb，Drum & Bass → drum n bass / drum and bass）：
// 带 & 的名字额外给出这几种写法，Raycast 的关键词匹配才找得到。
export function nameKeywords(name: string): string[] {
  if (!name.includes("&")) return [];
  const withN = name.replace(/&/g, "n");
  return [...new Set([withN, withN.replace(/\s+/g, ""), name.replace(/&/g, "and")])];
}

const MONTH_LONG = new Intl.DateTimeFormat("en", { month: "long" });
const MONTH_SHORT = new Intl.DateTimeFormat("en", { month: "short" });

// 创建时间的搜索词：年份和英文月份（全称、缩写），输入 2025、June、Jun 都能搜到。
export function dateKeywords(ms: number): string[] {
  const date = new Date(ms);
  return [String(date.getFullYear()), MONTH_LONG.format(date), MONTH_SHORT.format(date)];
}

// 搜索栏的多词搜索：按空格拆开，每个词都要出现在某一项里（不分大小写、忽略空格），全部命中才算。
// Raycast 自带的过滤遇到多个词时不会组合匹配（rnb 2025 搜不出 2025 年的 R&B）。
export function matchesSearch(terms: string[], query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = terms.flatMap((term) => {
    const lower = term.toLowerCase();
    return [lower, lower.replace(/\s+/g, "")];
  });
  return words.every((word) => haystack.some((term) => term.includes(word)));
}
