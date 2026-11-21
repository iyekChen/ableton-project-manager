/* eslint-disable @typescript-eslint/no-require-imports -- Raycast flat config 用 CommonJS require，为模板默认写法 */
const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");
const reactHooks = require("eslint-plugin-react-hooks");

// src/core/ui 的分层：projects 可以打开 bounces / collections / cleanup，
// 这三个之间不能互相引用，也不能反向引用 projects。
const FEATURE_SIBLINGS = {
  bounces: ["projects", "collections", "cleanup"],
  collections: ["projects", "bounces", "cleanup"],
  cleanup: ["projects", "bounces", "collections"],
};

// 别名和相对路径都要拦，否则换个写法就绕过去了。
const featurePaths = (name) => [
  `@/core/ui/${name}`,
  `@/core/ui/${name}/**`,
  `../${name}`,
  `../${name}/**`,
  `../../${name}`,
  `../../${name}/**`,
];

// 功能文件夹之间只认 index.ts：深层路径一律拦掉。
const deepOnly = (name) => ({
  group: [`@/core/ui/${name}/**`, `../${name}/**`, `../../${name}/**`],
  message: `只能从 @/core/ui/${name} 引用，不要引用内部文件。`,
});

const featureLayering = Object.entries(FEATURE_SIBLINGS).map(([feature, forbidden]) => ({
  files: [`src/core/ui/${feature}/**`],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: forbidden.map((name) => ({
          group: featurePaths(name),
          message: `${feature} 不能引用 ${name}：依赖只能从 projects 往下走。`,
        })),
      },
    ],
  },
}));

// projects 可以打开另外三个功能，但只能通过它们的 index.ts。
const projectsLayering = {
  files: ["src/core/ui/projects/**"],
  rules: {
    "no-restricted-imports": ["error", { patterns: ["bounces", "collections", "cleanup"].map(deepOnly) }],
  },
};

// 类型文件夹不能引用功能文件夹，否则会形成反向依赖。
const typeFolders = {
  files: ["src/core/ui/actions/**", "src/core/ui/components/**", "src/core/ui/hooks/**", "src/core/ui/shared/**"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: ["projects", "bounces", "collections", "cleanup"].map((name) => ({
          group: featurePaths(name),
          message: `不能引用功能文件夹 ${name}：依赖只能从功能文件夹往下走。`,
        })),
      },
    ],
  },
};

// core 只放不碰 Raycast 界面 API 的逻辑：界面反馈（Toast、确认框、Action 等）和 core/ui 都只能从 core/ui 里用。
// 存储、缓存、偏好、environment 这类非界面 API 不在此列；Color 是标签颜色数据，也不算界面反馈。
const CORE_UI_API = [
  "Action",
  "ActionPanel",
  "Alert",
  "Clipboard",
  "Detail",
  "Form",
  "Grid",
  "Icon",
  "List",
  "Toast",
  "confirmAlert",
  "closeMainWindow",
  "openExtensionPreferences",
  "showHUD",
  "showToast",
  "useNavigation",
];

const coreLayering = {
  files: ["src/core/**"],
  ignores: ["src/core/ui/**"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "@raycast/api",
            importNames: CORE_UI_API,
            message: "core 不能碰界面 API：界面反馈放到 core/ui 里。",
          },
        ],
        patterns: [
          {
            group: ["@/core/ui", "@/core/ui/**", "../ui", "../ui/**", "../../ui", "../../ui/**"],
            message: "core 不能引用 core/ui：依赖只能从界面往下走。",
          },
        ],
      },
    ],
  },
};

module.exports = defineConfig([
  // raycast-env.d.ts 是 ray 自动生成的产物（已 gitignore），其头部的 eslint-disable 注释随 ray 版本变化，
  // 可能引用已被 typescript-eslint 移除的规则（如 ban-types）而报错。生成产物无需 lint，直接忽略。
  { ignores: ["raycast-env.d.ts"] },
  ...raycastConfig,
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      // 依赖数组写错不会有别的工具兜底，先只报 warning，等现有代码清干净再改成 error。
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    rules: {
      // ⌘⇧↑ / ⌘⇧↓ 等刻意使用的组合会被这条规则误判为应改用 Common.*（插件未跟上最新 Raycast API 的快捷键绑定）。
      "@raycast/prefer-common-shortcut": "off",
    },
  },
  ...featureLayering,
  projectsLayering,
  typeFolders,
  coreLayering,
]);
