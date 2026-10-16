import { afterEach, describe, expect, it } from "vitest";
import { alteredDocChars, docFilePath } from "../src/docs";
import { __setPreferences } from "./mocks/raycast-api";

const NOTES = "/tmp/asm-notes";

afterEach(() => {
  __setPreferences({});
});

describe("docFilePath（自定义文件夹）", () => {
  it("普通名字保持原文件名，不加后缀", () => {
    __setPreferences({ notesFolder: NOTES });
    expect(docFilePath({ title: "Song-A", folderPath: "/p" }, "notes")).toBe(`${NOTES}/Song-A.md`);
  });

  it("清洗后同名的两个项目得到不同文件", () => {
    __setPreferences({ notesFolder: NOTES });
    const plain = docFilePath({ title: "Song-A", folderPath: "/p" }, "notes");
    const dirty = docFilePath({ title: "Song?A", folderPath: "/p" }, "notes");

    expect(dirty).not.toBe(plain);
    expect(dirty).toMatch(/^\/tmp\/asm-notes\/Song-A ~[0-9a-f]{6}\.md$/);
  });

  it("同一名字永远得到同一路径（哈希稳定）", () => {
    __setPreferences({ notesFolder: NOTES });
    const a = docFilePath({ title: "Beat #3", folderPath: "/p" }, "notes");
    const b = docFilePath({ title: "Beat #3", folderPath: "/p" }, "notes");
    expect(a).toBe(b);
  });
});

describe("docFilePath（未设自定义文件夹）", () => {
  it("存进项目文件夹，用固定名，不受非法字符影响", () => {
    expect(docFilePath({ title: "Song?A", folderPath: "/p" }, "notes")).toBe("/p/Notes.md");
  });
});

describe("alteredDocChars", () => {
  it("设了自定义文件夹时返回会被替换的字符（去重）", () => {
    __setPreferences({ notesFolder: NOTES });
    expect(alteredDocChars("Beat #3 #4?")).toEqual(["#", "?"]);
    expect(alteredDocChars("Normal Name")).toEqual([]);
  });

  it("没设自定义文件夹时不提示", () => {
    expect(alteredDocChars("Beat #3")).toEqual([]);
  });
});