import react from "@vitejs/plugin-react-swc";
import path from "path";
import { tempo } from "tempo-devtools/dist/vite";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  optimizeDeps: {
    entries: ["src/main.tsx", "src/tempobook/**/*"],
  },
  plugins: [
    react(),
    tempo(),
  ],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // @ts-ignore
    allowedHosts: true,
  }
});
