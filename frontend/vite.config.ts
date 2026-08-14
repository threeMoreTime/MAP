import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // echarts 按需引入（echarts/core 等子路径）后，按包路径归类，
          // 避免 object 形式把 echarts 整包入口重新拉进产物
          if (id.includes('node_modules/echarts') || id.includes('node_modules/zrender')) {
            return 'echarts';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          return undefined;
        },
      },
    },
  },
});
