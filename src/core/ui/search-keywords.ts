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
