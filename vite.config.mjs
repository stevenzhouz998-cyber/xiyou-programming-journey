import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  base: "/xiyou-programming-journey/",
  resolve: {
    alias: [
      { find: /^phaser$/, replacement: fileURLToPath(new URL("./node_modules/phaser/dist/phaser.esm.min.js", import.meta.url)) },
    ],
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
  },
  plugins: [react()],
  build: {
    manifest: true,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          if (id.includes('/node_modules/phaser/')) return 'phaser';
          if (id.includes('/node_modules/blockly/')) return 'blockly-editor';
          if (id.includes('/node_modules/@codemirror/')) return 'codemirror-editor';
          if (id.includes('/node_modules/@phosphor-icons/react/dist/lib/')) return 'phosphor-core';
          if (/\/node_modules\/(?:react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'app-vendor';
          const source = id.replaceAll('\\', '/');
          if (source.endsWith('/src/utils/focus.ts')) return 'focus-shared';
          if (source.endsWith('/src/engine/validation.ts')) return 'validation-shared';
          if (source.includes('/src/battle/')
            || /\/src\/progress\/(?:progress|schema|session|storage|types)\.ts$/.test(source)
          ) return 'progress-core';
          if (source.endsWith('/src/context/ProgressContext.tsx')
            || source.endsWith('/src/utils/assets.ts')
            || source.endsWith('/src/components/ToolErrorBoundary.tsx')) return 'app-core';
        },
      },
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    environmentOptions: {
      jsdom: { url: "http://localhost/" },
    },
  },
});
