import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// In development the app calls the API through the SAME origin (/api), exactly like production proxy mode.
// That keeps the refresh cookie first-party (no cross-site cookie problems on localhost).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_DEV_API_TARGET || "http://127.0.0.1:8000";
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": { target, changeOrigin: false },
        "/media": { target, changeOrigin: false },
      },
    },
  };
});
