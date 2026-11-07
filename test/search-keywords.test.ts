import { describe, expect, it } from "vitest";
import { matchesSearch, nameKeywords } from "../src/core/ui/search-keywords";

describe("nameKeywords", () => {
  it("& 换成 n / and", () => {
    expect(nameKeywords("R&B")).toEqual(expect.arrayContaining(["rnb", "randb"]));
    expect(nameKeywords("Drum & Bass")).toEqual(expect.arrayContaining(["drumnbass", "drumandbass"]));
  });

  it("去掉空格和标点", () => {
    expect(nameKeywords("Hip-Hop")).toContain("hiphop");
    expect(nameKeywords("UK Garage")).toContain("ukgarage");
  });
});

describe("matchesSearch", () => {
  it("每个词都命中才算", () => {
    const terms = [...nameKeywords("R&B"), "2025"];
    expect(matchesSearch(terms, "rnb 2025")).toBe(true);
    expect(matchesSearch(terms, "R&B 2025")).toBe(true);
    expect(matchesSearch(terms, "rnb 2024")).toBe(false);
  });

  it("忽略大小写、标点、重音和全角", () => {
    expect(matchesSearch(nameKeywords("Hip-Hop"), "hiphop")).toBe(true);
    expect(matchesSearch(nameKeywords("Hip-Hop"), "ｈｉｐｈｏｐ")).toBe(true);
    expect(matchesSearch(nameKeywords("Café"), "cafe")).toBe(true);
    expect(matchesSearch(nameKeywords("Drum & Bass"), "drum and bass")).toBe(true);
  });

  it("没输入时全部显示", () => {
    expect(matchesSearch(["anything"], "")).toBe(true);
  });
});
