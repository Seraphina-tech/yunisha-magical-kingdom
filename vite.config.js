import { defineConfig } from "vite";

export default defineConfig({
  server: {
    watch: {
      ignored: ["**/assets/videos/**"],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three/")) return "three-vendor";
        },
      },
    },
  },
});
