import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Project } from "@/core/projects/types";
import { applyProjectMetadata } from "@/core/ui/shared/reload-projects";
import { __setPreferences, environment } from "./mocks/raycast-api";

function makeProject(id: string): Project {
  return {
    id,
    title: id,
    folderPath: `/p/${id}`,
    kind: "package",
    createdAt: 0,
    inode: 0,
    modifiedAt: 0,
    stageId: null,
    genreIds: [],
    collectionIds: [],
    notes: "",
    lyrics: "",
    pinned: false,
    pinOrder: null,
    setsCount: 1,
    bouncesCount: 0,
    projectFilesCount: null,
    externalBounceFolders: [],
    externalBounceFiles: [],
  };
}

// 每个项目要读笔记和歌词两个文件，读到的路径就是「这个项目被读了」的证据。
function readProjects(spy: { mock: { calls: unknown[][] } }): string[] {
  return spy.mock.calls.map((call) => String(call[0])).filter((file) => file.startsWith("/p/"));
}

beforeEach(() => {
  // 自定义文档文件夹会记在 supportPath 里：换成空目录，免得读到别的用例留下的设置。
  environment.supportPath = fs.mkdtempSync(path.join(os.tmpdir(), "asm-support-"));
  __setPreferences({});
});

afterEach(() => {
  vi.restoreAllMocks();
  __setPreferences({});
});

describe("applyProjectMetadata", () => {
  it("新一轮开始后，旧一轮不再读剩下的项目", async () => {
    const readFileSync = vi.spyOn(fs, "readFileSync");
    const base = ["a", "b", "c", "d", "e", "f"].map(makeProject);
    // 第一个项目的笔记和歌词读完就作废，模拟期间又开了一轮刷新。
    const isCancelled = () => readProjects(readFileSync).length >= 2;

    const updated = await applyProjectMetadata(base, isCancelled);

    // 只读了第一个项目的两个文件，后面的项目没碰磁盘。
    expect(readProjects(readFileSync)).toEqual(["/p/a/Notes.md", "/p/a/Lyrics.md"]);
    // 没读到的项目原样保留，列表不丢。
    expect(updated).toHaveLength(6);
    for (const project of base.slice(1)) expect(updated).toContain(project);
  });

  it("没作废时读完所有项目", async () => {
    const readFileSync = vi.spyOn(fs, "readFileSync");
    const base = [makeProject("a"), makeProject("b")];

    const updated = await applyProjectMetadata(base, () => false);

    expect(readProjects(readFileSync)).toHaveLength(4);
    expect(updated).toHaveLength(2);
  });
});
