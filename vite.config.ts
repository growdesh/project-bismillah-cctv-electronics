import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  define: { __APP_MODE__: JSON.stringify(mode) },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png", "pwa-192x192.png", "pwa-512x512.png", "pwa-maskable-512x512.png"],
      manifest: {
        id: "/",
        name: "বিসমিল্লাহ সিসিটিভি এন্ড ইলেকট্রনিক্স POS",
        short_name: "BismillahPOS",
        description: "বিসমিল্লাহ সিসিটিভি এন্ড ইলেকট্রনিক্স — রিটেইল POS, স্টক, স্টাফ ও সার্ভিসিং ব্যবস্থাপনা।",
        theme_color: "#059669",
        background_color: "#f1f5f9",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        lang: "bn",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
      },
      devOptions: {
        enabled: false,
        type: "module",
      },
    }),
  ],
  server: { port: 3000, host: true, hmr: false },
  preview: { port: 3000, host: true },
  build: {
    emptyOutDir: true,
  },
}));
