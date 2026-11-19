import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { abletonAdapter } from "../src/daws/ableton/adapter";

let root: string;
let templatesRoot: string;
let projectsRoot: string;
let templatePath: string;

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "apm-ableton-templates-"));
  templatesRoot = path.join(root, "Templates");
  projectsRoot = path.join(root, "Projects");
  fs.mkdirSync(templatesRoot, { recursive: true });
  fs.mkdirSync(projectsRoot, { recursive: true });
  templatePath = path.join(templatesRoot, "Starter.als");
  fs.writeFileSync(templatePath, "als content");
});

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe("abletonAdapter.isTemplate", () => {
  it("认 .als 文件，不认文件夹", () => {
    expect(abletonAdapter.isTemplate(templatePath, "Starter.als")).toBe(true);
    expect(abletonAdapter.isTemplate(templatesRoot, "Templates")).toBe(false);
  });
});

describe("abletonAdapter.createFromTemplate", () => {
  it("新建项目文件夹，模板复制成里面的 名字.als，内容一致", () => {
    const target = abletonAdapter.createFromTemplate(templatePath, projectsRoot, "New Song");
    expect(target).toBe(path.join(projectsRoot, "New Song"));
    expect(fs.statSync(target).isDirectory()).toBe(true);
    expect(fs.readdirSync(target)).toEqual(["New Song.als"]);
    expect(fs.readFileSync(path.join(target, "New Song.als"), "utf8")).toBe("als content");
  });

  it("模板原件没有变", () => {
    abletonAdapter.createFromTemplate(templatePath, projectsRoot, "Another Song");
    expect(fs.readFileSync(templatePath, "utf8")).toBe("als content");
    expect(fs.readdirSync(templatesRoot)).toEqual(["Starter.als"]);
  });

  it("目标已存在时报错，并且不覆盖", () => {
    const target = path.join(projectsRoot, "Taken");
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, "keep.txt"), "keep");

    expect(() => abletonAdapter.createFromTemplate(templatePath, projectsRoot, "Taken")).toThrow();
    expect(fs.readdirSync(target)).toEqual(["keep.txt"]);
    expect(fs.readFileSync(path.join(target, "keep.txt"), "utf8")).toBe("keep");
  });
});
