import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { designCompanion } from "./src/design-companion/plugin/vite-plugin-design-companion";

export default defineConfig(({ command }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    ...(command !== 'build' ? [designCompanion()] : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: { sourcemap: false, manifest: true },
}));
