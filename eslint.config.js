/* eslint-disable @typescript-eslint/no-require-imports -- Raycast flat config 用 CommonJS require，为模板默认写法 */
const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycastConfig,
  {
    rules: {
      // ⌘⇧↑ / ⌘⇧↓ 等刻意使用的组合会被这条规则误判为应改用 Common.*（插件未跟上最新 Raycast API 的快捷键绑定）。
      "@raycast/prefer-common-shortcut": "off",
    },
  },
]);
