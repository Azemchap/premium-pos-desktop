import react from "@vitejs/plugin-react";
import autoprefixer from "autoprefixer";
import path from "path";
import tailwindcss from "tailwindcss";
import { defineConfig } from "vite";

// For Android emulator, use 10.0.2.2 to access host machine
const host = process.env.TAURI_DEV_HOST || "localhost";

export default defineConfig(async () => ({
    plugins: [react()],
    clearScreen: false,

    server: {
        port: 5173,
        strictPort: true,
        host: host || "localhost",
        hmr: process.env.TAURI_DEV_HOST
            ? {
                protocol: "ws",
                host: host,
                port: 1421,
            }
            : undefined,
        watch: {
            ignored: ["**/src-tauri/**"],
        },
        cors: true,
    },


    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },

    css: {
        postcss: {
            plugins: [tailwindcss, autoprefixer],
        },
    },
}));