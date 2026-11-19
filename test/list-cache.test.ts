import { describe, expect, it } from "vitest";
import { parseProjectList, serializeProjectList } from "../src/core/projects/list-cache";
import type { Project } from "../src/core/projects/types";

const project = (over: Partial<Project> = {}): Project => ({
  id: "Demo",
  title: "Demo",
  folderPath: "/Projects/Demo",
  kind: "package",
  createdAt: 1700000000000,
  inode: 12345,
  modifiedAt: 1700000001000,
  stageId: null,
  genreIds: [],
  collectionIds: [],
  notes: "",
  lyrics: "",
  pinned: false,
  pinOrder: null,
  setsCount: 1,
  bouncesCount: 0,
  externalBounceFolders: [],
  externalBounceFiles: [],
  ...over,
});

describe("serializeProjectList / parseProjectList", () => {
  it("序列化再解析，结果和原来一致", () => {
    const projects = [
      project(),
      project({
        id: "Other",
        title: "Other",
        kind: "folder",
        stageId: "stage-1",
        genreIds: ["genre-1"],
        collectionIds: ["collection-1"],
        notes: "note",
        lyrics: "lyric",
        pinned: true,
        pinOrder: 0,
        setsCount: 3,
        bouncesCount: 2,
        externalBounceFolders: ["/Bounces"],
        externalBounceFiles: ["/Bounces/a.wav"],
      }),
    ];
    expect(parseProjectList(serializeProjectList(projects))).toEqual(projects);
  });

  it("时间字段解析后仍是数字", () => {
    const [parsed] = parseProjectList(serializeProjectList([project()])) ?? [];
    expect(typeof parsed.createdAt).toBe("number");
    expect(typeof parsed.modifiedAt).toBe("number");
  });

  it("空字符串返回 undefined", () => {
    expect(parseProjectList("")).toBeUndefined();
    expect(parseProjectList(undefined)).toBeUndefined();
  });

  it("JSON 坏了返回 undefined", () => {
    expect(parseProjectList("{not json")).toBeUndefined();
  });

  it("version 不对返回 undefined", () => {
    expect(parseProjectList(JSON.stringify({ version: 2, projects: [] }))).toBeUndefined();
  });

  it("projects 不是数组返回 undefined", () => {
    expect(parseProjectList(JSON.stringify({ version: 1, projects: {} }))).toBeUndefined();
  });
});
