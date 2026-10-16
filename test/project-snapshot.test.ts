import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { diffSnapshots, readTrashBirthtimes } from "../src/project-snapshot";

const e = (id: string, birthtimeMs: number) => ({ id, birthtimeMs });

describe("diffSnapshots", () => {
  it("同创建时间换了名字识别为改名", () => {
    const diff = diffSnapshots([e("Old", 1), e("Keep", 2)], [e("New", 1), e("Keep", 2)]);
    expect(diff.renamed).toEqual([{ from: e("Old", 1), to: e("New", 1) }]);
    expect(diff.removed).toEqual([]);
  });

  it("消失且无对应新名字识别为移除；同名新项目不算改名", () => {
    const diff = diffSnapshots([e("A", 1), e("B", 2), e("C", 3)], [e("A", 1), e("B", 2), e("D", 9)]);
    expect(diff.removed).toEqual([e("C", 3)]);
    expect(diff.renamed).toEqual([]);
  });

  it("一次消失过半（且多于 3 个）时触发保护，不报移除", () => {
    const previous = [1, 2, 3, 4, 5, 6].map((n) => e(`P${n}`, n));
    const diff = diffSnapshots(previous, [e("P6", 6)]);
    expect(diff.guardTripped).toBe(true);
    expect(diff.removed).toEqual([]);
  });

  it("项目全部消失（如外接盘未挂载）时触发保护", () => {
    const diff = diffSnapshots([e("A", 1), e("B", 2)], []);
    expect(diff.guardTripped).toBe(true);
    expect(diff.removed).toEqual([]);
  });
});

describe("readTrashBirthtimes", () => {
  it("读出废纸篓里文件夹的创建时间；不存在的废纸篓视为空", () => {
    const trash = fs.mkdtempSync(path.join(os.tmpdir(), "asm-trash-"));
    const folder = path.join(trash, "Song 21.30.12");
    fs.mkdirSync(folder);
    const birth = Math.floor(fs.statSync(folder).birthtimeMs);

    const births = readTrashBirthtimes([trash, path.join(trash, "no-such-volume-trash")]);
    expect(births?.has(birth)).toBe(true);

    fs.rmSync(trash, { recursive: true, force: true });
  });

  it("~/.Trash 读不了（无权限）时返回 null", () => {
    const locked = fs.mkdtempSync(path.join(os.tmpdir(), "asm-locked-"));
    fs.chmodSync(locked, 0o000);
    try {
      expect(readTrashBirthtimes([locked])).toBeNull();
    } finally {
      fs.chmodSync(locked, 0o700);
      fs.rmSync(locked, { recursive: true, force: true });
    }
  });
});
