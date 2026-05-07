import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: { "/api": { target: "http://localhost:8000", changeOrigin: true } },
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: {
          "reports-chunk": ["./src/sections/relatorios/RelatoriosPage.tsx"],
          "configuracoes-chunk": ["./src/sections/configuracoes/ConfiguracoesPage.tsx"],
          "monetizacao-chunk": ["./src/sections/monetizacao/MonetizacaoPage.tsx"],
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "tanstack": ["@tanstack/react-query"],
        },
      },
    },
  },
});
