import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";

/**
 * GitHub Pages has no SPA rewrites: it only serves files that exist. The Neon
 * Auth SDK navigates with `window.location` (e.g. /auth/sign-in), which would
 * 404 on a hard load. GitHub serves 404.html for any missing path, so shipping
 * the built index.html as 404.html lets the app boot and let TanStack Router
 * resolve `location.pathname`.
 */
function pagesSpaFallback(): Plugin {
  let outDir = "dist";
  return {
    name: "pages-spa-fallback",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      copyFileSync(resolve(outDir, "index.html"), resolve(outDir, "404.html"));
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    pagesSpaFallback(),
  ],
});
