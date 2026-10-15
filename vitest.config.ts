import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // 测试不加载真正的 Raycast 运行时：被测模块顶层 import 了 @raycast/api，用桩替代。
      "@raycast/api": path.resolve(__dirname, "test/mocks/raycast-api.ts"),
    },
  },
});
