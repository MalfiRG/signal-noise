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
    // Design companion is opt-IN (DESIGN_COMPANION=1) — Babel transform on every .tsx +
    // loopback listener add measurable startup + per-request overhead, only worth paying
    // when actively iterating on design. Routine blog dev runs without it.
    //   Enable:  DESIGN_COMPANION=1 npm run dev    (or `npm run dev:design`)
    //   Disable: npm run dev                       (default)
    ...(command !== 'build' && process.env.DESIGN_COMPANION === '1' ? [designCompanion()] : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: { sourcemap: false, manifest: true },
}));
