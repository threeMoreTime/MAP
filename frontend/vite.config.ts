import { defineConfig } from "vite";
import { execSync } from "node:child_process";

const buildCommit =
  process.env.GITHUB_SHA ||
  (() => {
    try {
      return (
        execSync("git rev-parse --short HEAD").toString().trim() +
        (execSync("git status --porcelain --untracked-files=no")
          .toString()
          .trim()
          ? "-working"
          : "")
      );
    } catch {
      return "local-build";
    }
  })();
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __BUILD_COMMIT__: JSON.stringify(buildCommit) },
  base: "./",
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // echarts-gl 仅由 HeroMap3D 动态 import，独立分包避免拉入首屏
          if (id.includes("node_modules/echarts-gl")) {
            return "echarts-gl";
          }
          if (
            id.includes("node_modules/echarts") ||
            id.includes("node_modules/zrender")
          ) {
            return "echarts";
          }
          if (id.includes("node_modules")) {
            return "vendor";
          }
          return undefined;
        },
      },
    },
  },
});
