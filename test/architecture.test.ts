import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// 类型文件夹（actions / components / hooks / shared）只放两个以上功能共用的东西。
// 一个文件如果引用的功能文件夹只有一个，说明它只被那个功能用，应该放进那个功能文件夹里。
const TYPE_FOLDERS = ["actions", "components", "hooks", "shared"];
const FEATURES = ["projects", "bounces", "collections", "cleanup"];
const UI_ROOT = path.resolve(process.cwd(), "src/core/ui");

/** 递归列出目录下的 .ts / .tsx 文件。 */
function listSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/** 取出文件里所有 import / export 的模块路径。 */
function importedModules(source: string): string[] {
  const modules: string[] = [];
  const pattern = /(?:from|import)\s+"([^"]+)"/g;
  for (const match of source.matchAll(pattern)) modules.push(match[1]);
  return modules;
}

/** 模块路径指向的功能文件夹；不是功能文件夹的返回 null。 */
function featureOf(modulePath: string): string | null {
  const match = /^@\/core\/ui\/([^/]+)/.exec(modulePath);
  if (!match) return null;
  return FEATURES.includes(match[1]) ? match[1] : null;
}

describe("类型文件夹的归属", () => {
  it("只被一个功能引用的文件应该放进那个功能文件夹", () => {
    const offenders: string[] = [];
    for (const folder of TYPE_FOLDERS) {
      const dir = path.join(UI_ROOT, folder);
      if (!fs.existsSync(dir)) continue;
      for (const file of listSourceFiles(dir)) {
        const features = new Set(
          importedModules(fs.readFileSync(file, "utf8"))
            .map(featureOf)
            .filter((name): name is string => name !== null),
        );
        if (features.size === 1) {
          const [only] = [...features];
          offenders.push(`${path.relative(process.cwd(), file)} 只被 ${only} 用，应放进 src/core/ui/${only}/`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
