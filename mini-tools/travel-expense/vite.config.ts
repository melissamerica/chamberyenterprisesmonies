import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  // Anya's existing PDF and OCR workers remain available to the extracted reader.
  publicDir: fileURLToPath(new URL("../../public", import.meta.url)),
  base: "./",
  build: {
    outDir: fileURLToPath(new URL("../../dist-travel-expense", import.meta.url)),
    emptyOutDir: true,
  },
});
