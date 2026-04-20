import { defineConfig } from "vite";

export default defineConfig({
  // Since you have a custom domain (inner.horse), base is '/'
  base: "/",
  build: {
    outDir: "dist",
    // Ensures the build doesn't fail on small warnings
    chunkSizeWarningLimit: 1000,
  },
});
