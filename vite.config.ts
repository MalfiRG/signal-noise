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
    // Design companion is opt-IN (VITE_DESIGN_COMPANION=1) — Babel transform on every .tsx +
    // loopback listener add measurable startup + per-request overhead, only worth paying
    // when actively iterating on design. Routine blog dev runs without it.
    // The VITE_ prefix is load-bearing: client-side code in src/App.tsx reads the same
    // flag via import.meta.env to gate the DesignToggle button + /__design routes.
    //   Enable:  npm run dev:design   (sets VITE_DESIGN_COMPANION=1)
    //   Disable: npm run dev          (default)
    ...(command !== 'build' && process.env.VITE_DESIGN_COMPANION === '1' ? [designCompanion()] : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: { sourcemap: false, manifest: true },
}));
