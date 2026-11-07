// 搜索时 & 常被打成 n 或 and（R&B → rnb，Drum & Bass → drum n bass / drum and bass）：
// 带 & 的名字额外给出这几种写法，Raycast 的关键词匹配才找得到。
export function nameKeywords(name: string): string[] {
  if (!name.includes("&")) return [];
  const withN = name.replace(/&/g, "n");
  return [...new Set([withN, withN.replace(/\s+/g, ""), name.replace(/&/g, "and")])];
}
